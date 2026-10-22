-- Règles de vente : fenêtres de vente par tarif, remises de groupe, annulation, contrôle avant paiement
--
--  * Early bird : en vente de J-21 à J-7 (quota 60 dans le seed). Standard : à partir de J-7.
--    Les deux tarifs restent listés ; chacun est « en vente » uniquement dans sa fenêtre (états :
--    upcoming, on_sale, sold_out, closed). Plus de bascule séquentielle automatique.
--  * Pas de code promo sur l'early bird.
--  * Remise de groupe automatique sur le standard : -10 % dès 5 billets, -20 % pour 10 billets.
--    Elle n'est pas cumulable avec un code promo : la remise la plus avantageuse est retenue.
--  * 10 billets maximum par commande.

alter table orders add column auto_discount_pct int not null default 0;

-- Remise de groupe (en %), à garder alignée avec src/lib/ticketing/config.ts
create function _group_discount_pct(p_kind text, p_quantity int)
returns int
language sql immutable as $$
  select case
    when p_kind <> 'standard' then 0
    when p_quantity >= 10 then 20
    when p_quantity >= 5  then 10
    else 0
  end;
$$;

drop function if exists _tiers(uuid);
drop function if exists event_sales(text);

create function _tiers(p_event uuid)
returns table (
  ticket_type_id uuid, kind text, price_xof int, sort int,
  sold int, held int, available int,
  sales_start timestamptz, sales_end timestamptz,
  in_window boolean, on_sale boolean, state text
)
language sql stable security definer set search_path = public as $$
  with c as (
    select
      (select capacity from events where id = p_event) as cap,
      (select count(*) from tickets where event_id = p_event and status in ('valid', 'used')) as sold_e,
      (select coalesce(sum(quantity), 0) from orders
        where event_id = p_event and status = 'pending' and expires_at > now()) as held_e
  ),
  t as (
    select tt.*,
      (select count(*) from tickets k
        where k.ticket_type_id = tt.id and k.status in ('valid', 'used')) as sold_t,
      (select coalesce(sum(o.quantity), 0) from orders o
        where o.ticket_type_id = tt.id and o.status = 'pending' and o.expires_at > now()) as held_t
    from ticket_types tt where tt.event_id = p_event
  ),
  a as (
    select t.id, t.kind, t.price_xof, t.sort, t.sold_t, t.held_t, t.sales_start, t.sales_end,
      greatest(0, least(
        case when t.quota is null then c.cap else t.quota - t.sold_t - t.held_t end,
        c.cap - c.sold_e - c.held_e
      )) as avail,
      ((t.sales_start is null or now() >= t.sales_start)
        and (t.sales_end is null or now() < t.sales_end)) as in_window
    from t cross join c
  )
  select a.id, a.kind, a.price_xof, a.sort, a.sold_t::int, a.held_t::int, a.avail::int,
         a.sales_start, a.sales_end, a.in_window,
         (a.in_window and a.avail > 0),
         case
           when a.sales_start is not null and now() < a.sales_start then 'upcoming'
           when not a.in_window then 'closed'
           when a.avail <= 0 then 'sold_out'
           else 'on_sale'
         end
  from a order by a.sort;
$$;

create function event_sales(p_slug text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  e events;
  sold int;
  held int;
begin
  select * into e from events where slug = p_slug;
  if not found then return null; end if;

  select count(*) into sold from tickets where event_id = e.id and status in ('valid', 'used');
  select coalesce(sum(quantity), 0) into held from orders
    where event_id = e.id and status = 'pending' and expires_at > now();

  return jsonb_build_object(
    'event', jsonb_build_object(
      'id', e.id, 'slug', e.slug, 'name', e.name, 'venue', e.venue, 'city', e.city,
      'country', e.country, 'startsAt', e.starts_at, 'status', e.status, 'capacity', e.capacity),
    'remaining', greatest(0, e.capacity - sold - held),
    'soldOut', (e.capacity - sold - held) <= 0,
    'tiers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ticket_type_id, 'kind', kind, 'priceXof', price_xof, 'remaining', available,
        'state', state, 'onSale', on_sale, 'salesStart', sales_start, 'salesEnd', sales_end) order by sort)
      from _tiers(e.id)), '[]'::jsonb)
  );
end $$;

-- Erreurs : event_not_found, sales_closed, invalid_quantity, type_unavailable, sold_out, not_enough,
--           invalid_promo, promo_exhausted, promo_not_allowed (code promo sur early bird)
create or replace function create_order(
  p_event_slug      text,
  p_ticket_type_id  uuid,
  p_quantity        int,
  p_name            text,
  p_email           text,
  p_whatsapp        text,
  p_country         text,
  p_promo           text    default null,
  p_affiliate       text    default null,
  p_hold_minutes    int     default 10,
  p_max_per_order   int     default 10
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  e          events;
  tier       record;
  pc         promo_codes;
  used       int;
  subtotal   int;
  auto_pct   int;
  auto_disc  int;
  promo_disc int := 0;
  discount   int := 0;
  use_promo  boolean := false;
  oid        uuid;
  expires    timestamptz := now() + make_interval(mins => p_hold_minutes);
begin
  if p_quantity is null or p_quantity < 1 or p_quantity > p_max_per_order then
    raise exception 'invalid_quantity';
  end if;

  select * into e from events where slug = p_event_slug for update;
  if not found then raise exception 'event_not_found'; end if;
  if e.status <> 'on_sale' then raise exception 'sales_closed'; end if;

  select * into tier from _tiers(e.id) t where t.ticket_type_id = p_ticket_type_id;
  if not found or not tier.in_window then raise exception 'type_unavailable'; end if;
  if tier.available <= 0 then raise exception 'sold_out'; end if;
  if tier.available < p_quantity then
    raise exception 'not_enough' using detail = tier.available::text;
  end if;

  subtotal  := tier.price_xof * p_quantity;
  auto_pct  := _group_discount_pct(tier.kind, p_quantity);
  auto_disc := floor(subtotal * auto_pct / 100.0)::int;

  if p_promo is not null and btrim(p_promo) <> '' then
    if tier.kind = 'early_bird' then raise exception 'promo_not_allowed'; end if;

    select * into pc from promo_codes where code = upper(btrim(p_promo)) for update;
    if not found or not pc.active
       or (pc.event_id is not null and pc.event_id <> e.id)
       or (pc.starts_at is not null and now() < pc.starts_at)
       or (pc.ends_at is not null and now() >= pc.ends_at) then
      raise exception 'invalid_promo';
    end if;
    if pc.max_uses is not null then
      select count(*) into used from orders
        where promo_code_id = pc.id and (status = 'paid' or (status = 'pending' and expires_at > now()));
      if used >= pc.max_uses then raise exception 'promo_exhausted'; end if;
    end if;
    promo_disc := case pc.kind
      when 'percent' then floor(subtotal * pc.value / 100.0)::int
      else least(pc.value, subtotal) end;
    -- Pas de cumul : on garde la remise la plus avantageuse
    use_promo := promo_disc > auto_disc;
  end if;

  discount := case when use_promo then promo_disc else auto_disc end;

  update orders set status = 'cancelled'
    where event_id = e.id and lower(buyer_email) = lower(btrim(p_email))
      and status = 'pending' and channel = 'online';

  insert into orders (
    event_id, ticket_type_id, quantity, unit_price_xof, subtotal_xof, discount_xof, total_xof,
    buyer_name, buyer_email, buyer_whatsapp, buyer_country, promo_code_id, affiliate_ref, expires_at,
    auto_discount_pct
  ) values (
    e.id, tier.ticket_type_id, p_quantity, tier.price_xof, subtotal, discount, subtotal - discount,
    btrim(p_name), lower(btrim(p_email)), btrim(p_whatsapp), btrim(p_country),
    case when use_promo then pc.id else null end,
    nullif(btrim(p_affiliate), ''), expires,
    case when use_promo then 0 else auto_pct end
  ) returning id into oid;

  return jsonb_build_object(
    'orderId', oid, 'expiresAt', expires, 'quantity', p_quantity,
    'unitPriceXof', tier.price_xof, 'subtotalXof', subtotal,
    'discountXof', discount, 'totalXof', subtotal - discount,
    'autoDiscountPct', case when use_promo then 0 else auto_pct end,
    'promoApplied', use_promo);
end $$;

-- Annulation d'une réservation par l'acheteur (retour au formulaire) : libère les places
create function cancel_order(p_order_id uuid, p_email text)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update orders set status = 'cancelled'
    where id = p_order_id and lower(buyer_email) = lower(btrim(p_email))
      and status = 'pending' and channel = 'online';
  return found;
end $$;

-- Contrôle avant paiement : la commande est-elle toujours payable ?
create function order_payable(p_order_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((
    select jsonb_build_object(
      'payable', (status = 'pending' and expires_at > now()),
      'status', status, 'totalXof', total_xof, 'expiresAt', expires_at)
    from orders where id = p_order_id), jsonb_build_object('payable', false, 'status', 'not_found'));
$$;

revoke all on function _group_discount_pct(text, int) from public;
revoke all on function _tiers(uuid) from public;
revoke all on function event_sales(text) from public;
revoke all on function create_order(text, uuid, int, text, text, text, text, text, text, int, int) from public;
revoke all on function cancel_order(uuid, text) from public;
revoke all on function order_payable(uuid) from public;

grant execute on function _group_discount_pct(text, int)                                          to service_role;
grant execute on function _tiers(uuid)                                                            to service_role;
grant execute on function event_sales(text)                                                       to service_role;
grant execute on function create_order(text, uuid, int, text, text, text, text, text, text, int, int) to service_role;
grant execute on function cancel_order(uuid, text)                                                to service_role;
grant execute on function order_payable(uuid)                                                     to service_role;
