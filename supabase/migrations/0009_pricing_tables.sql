-- Nouvelle tarification (édition du KARMA) et réservation de tables
--
--  * Early bird : 5 000 FCFA, 70 billets, en vente dès le 9 novembre (jusqu'à J-7 ou épuisement).
--    Standard : 8 000 FCFA, 30 billets, dès J-7 ou dès que les 70 early birds sont pris. Capacité générale : 100.
--  * Tables (salons) : kind `table`, 4 tables de 6 personnes. 80 000 FCFA du 9 au 17 novembre, 100 000 FCFA dès
--    le 18 novembre (`price_step_at` / `price_after_xof`). Une table = 1 « quantité » = 6 billets nominatifs
--    (`seats`). Les tables sont une offre ADDITIONNELLE : elles n'entament pas la capacité générale de 100.
--    Pas de code promo ni de remise de groupe sur les tables.
--  * Les montants de ce fichier ne s'appliquent qu'à l'événement `la-teuf-karma`.

alter table ticket_types drop constraint if exists ticket_types_kind_check;
alter table ticket_types add constraint ticket_types_kind_check check (kind in ('early_bird', 'standard', 'table'));
alter table ticket_types add column if not exists seats int not null default 1 check (seats >= 1);
alter table ticket_types add column if not exists price_step_at timestamptz;   -- date de changement de prix
alter table ticket_types add column if not exists price_after_xof int check (price_after_xof >= 0);

-- Prix en vigueur : bascule sur price_after_xof à partir de price_step_at.
-- Capacité générale = billets hors tables ; les tables ont leur propre quota (en tables).
-- Même signature de sortie que 0003 : les droits existants sont conservés.
create or replace function _tiers(p_event uuid)
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
      (select count(*) from tickets k join ticket_types x on x.id = k.ticket_type_id
        where k.event_id = p_event and k.status in ('valid', 'used') and x.kind <> 'table') as sold_e,
      (select coalesce(sum(o.quantity), 0) from orders o join ticket_types x on x.id = o.ticket_type_id
        where o.event_id = p_event and o.status = 'pending' and o.expires_at > now() and x.kind <> 'table') as held_e
  ),
  t as (
    select tt.*,
      (select count(*) / tt.seats from tickets k
        where k.ticket_type_id = tt.id and k.status in ('valid', 'used')) as sold_t,
      (select coalesce(sum(o.quantity), 0) from orders o
        where o.ticket_type_id = tt.id and o.status = 'pending' and o.expires_at > now()) as held_t
    from ticket_types tt where tt.event_id = p_event
  ),
  early_full as (
    select coalesce(bool_or(t.quota is not null and t.quota - t.sold_t - t.held_t <= 0), false) as full
    from t where t.kind = 'early_bird'
  ),
  a as (
    select t.id, t.kind, t.sort, t.sold_t, t.held_t, t.sales_start, t.sales_end,
      case when t.price_step_at is not null and t.price_after_xof is not null and now() >= t.price_step_at
           then t.price_after_xof else t.price_xof end as price,
      greatest(0, case
        when t.kind = 'table' then t.quota - t.sold_t - t.held_t
        else least(
          case when t.quota is null then c.cap else t.quota - t.sold_t - t.held_t end,
          c.cap - c.sold_e - c.held_e)
      end) as avail,
      (((t.sales_start is null or now() >= t.sales_start) or (t.kind = 'standard' and ef.full))
        and (t.sales_end is null or now() < t.sales_end)) as in_window
    from t cross join c cross join early_full ef
  )
  select a.id, a.kind, a.price::int, a.sort, a.sold_t::int, a.held_t::int, a.avail::int,
         a.sales_start, a.sales_end, a.in_window,
         (a.in_window and a.avail > 0),
         case
           when a.in_window then (case when a.avail <= 0 then 'sold_out' else 'on_sale' end)
           when a.sales_start is not null and now() < a.sales_start then 'upcoming'
           else 'closed'
         end
  from a order by a.sort;
$$;

create or replace function event_sales(p_slug text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  e events;
  sold int;
  held int;
begin
  select * into e from events where slug = p_slug;
  if not found then return null; end if;

  -- Capacité générale : les tables (offre additionnelle) ne comptent pas
  select count(*) into sold from tickets k join ticket_types x on x.id = k.ticket_type_id
    where k.event_id = e.id and k.status in ('valid', 'used') and x.kind <> 'table';
  select coalesce(sum(o.quantity), 0) into held from orders o join ticket_types x on x.id = o.ticket_type_id
    where o.event_id = e.id and o.status = 'pending' and o.expires_at > now() and x.kind <> 'table';

  return jsonb_build_object(
    'event', jsonb_build_object(
      'id', e.id, 'slug', e.slug, 'name', e.name, 'venue', e.venue, 'city', e.city,
      'country', e.country, 'startsAt', e.starts_at, 'status', e.status, 'capacity', e.capacity),
    'remaining', greatest(0, e.capacity - sold - held),
    'soldOut', (e.capacity - sold - held) <= 0,
    'tiers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.ticket_type_id, 'kind', t.kind, 'priceXof', t.price_xof, 'remaining', t.available,
        'state', t.state, 'onSale', t.on_sale, 'salesStart', t.sales_start, 'salesEnd', t.sales_end,
        'seats', tt.seats,
        'nextPriceXof', case when tt.price_step_at > now() then tt.price_after_xof end,
        'nextPriceAt', case when tt.price_step_at > now() then tt.price_step_at end
      ) order by t.sort)
      from _tiers(e.id) t join ticket_types tt on tt.id = t.ticket_type_id), '[]'::jsonb)
  );
end $$;

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
  af         affiliates;
  used       int;
  subtotal   int;
  auto_pct   int;
  auto_disc  int;
  promo_disc int := 0;
  discount   int := 0;
  use_promo  boolean := false;
  oid        uuid;
  total      int;
  v_slug     text := lower(btrim(split_part(coalesce(p_affiliate, ''), ':', 1)));
  v_camp     text := nullif(left(regexp_replace(lower(btrim(coalesce(split_part(p_affiliate, ':', 2), ''))), '[^a-z0-9_-]', '', 'g'), 40), '');
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
    if tier.kind in ('early_bird', 'table') then raise exception 'promo_not_allowed'; end if;

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
    use_promo := promo_disc > auto_disc;
  end if;

  discount := case when use_promo then promo_disc else auto_disc end;
  total    := subtotal - discount;

  -- Influenceur : slug inconnu ou inactif ignoré
  if v_slug <> '' then
    select * into af from affiliates where slug = v_slug and active;
  end if;

  update orders set status = 'cancelled'
    where event_id = e.id and lower(buyer_email) = lower(btrim(p_email))
      and status = 'pending' and channel = 'online';

  insert into orders (
    event_id, ticket_type_id, quantity, unit_price_xof, subtotal_xof, discount_xof, total_xof,
    buyer_name, buyer_email, buyer_whatsapp, buyer_country, promo_code_id, affiliate_ref, expires_at,
    auto_discount_pct, affiliate_id, affiliate_commission_xof
  ) values (
    e.id, tier.ticket_type_id, p_quantity, tier.price_xof, subtotal, discount, total,
    btrim(p_name), lower(btrim(p_email)), btrim(p_whatsapp), btrim(p_country),
    case when use_promo then pc.id else null end,
    case when af.id is not null then v_camp else null end, expires,
    case when use_promo then 0 else auto_pct end,
    af.id,
    case when af.id is not null then floor(total * af.rate_pct / 100.0)::int else 0 end
  ) returning id into oid;

  return jsonb_build_object(
    'orderId', oid, 'expiresAt', expires, 'quantity', p_quantity,
    'unitPriceXof', tier.price_xof, 'subtotalXof', subtotal,
    'discountXof', discount, 'totalXof', total,
    'autoDiscountPct', case when use_promo then 0 else auto_pct end,
    'promoApplied', use_promo,
    'seats', (select seats from ticket_types where id = tier.ticket_type_id));
end $$;

-- Paiement confirmé : une table émet `seats` billets (un par personne)
create or replace function mark_order_paid(p_order_id uuid, p_transaction_id text, p_amount_xof int)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o     orders;
  e     events;
  tier  record;
  tids  jsonb;
  v_seats int;
begin
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;

  select * into e from events where id = o.event_id for update;

  if o.status = 'paid' then
    select coalesce(jsonb_agg(id order by created_at, id), '[]'::jsonb) into tids from tickets where order_id = o.id;
    return jsonb_build_object('status', 'paid', 'ticketIds', tids);
  end if;

  if o.status in ('refund_needed', 'refunded', 'failed') then
    return jsonb_build_object('status', o.status::text, 'ticketIds', '[]'::jsonb);
  end if;

  if p_amount_xof <> o.total_xof then raise exception 'amount_mismatch'; end if;

  if o.status <> 'pending' or o.expires_at <= now() then
    select * into tier from _tiers(o.event_id) t where t.ticket_type_id = o.ticket_type_id;
    if not found or tier.available < o.quantity then
      update orders set status = 'refund_needed', kkiapay_transaction_id = p_transaction_id where id = o.id;
      return jsonb_build_object('status', 'refund_needed', 'ticketIds', '[]'::jsonb);
    end if;
  end if;

  update orders set status = 'paid', paid_at = now(), kkiapay_transaction_id = p_transaction_id,
                    expires_at = null where id = o.id;

  select seats into v_seats from ticket_types where id = o.ticket_type_id;

  insert into tickets (order_id, event_id, ticket_type_id, nonce)
  select o.id, o.event_id, o.ticket_type_id,
         replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  from generate_series(1, o.quantity * v_seats);

  select coalesce(jsonb_agg(id order by created_at, id), '[]'::jsonb) into tids from tickets where order_id = o.id;
  return jsonb_build_object('status', 'paid', 'ticketIds', tids);
end $$;

-- ---------------------------------------------------------------------------------------
-- Données de l'édition du KARMA (20 novembre 2026, fuseau UTC = Lomé)
-- ---------------------------------------------------------------------------------------
update events set capacity = 100;

update ticket_types tt set price_xof = 5000, quota = 70, sales_start = '2026-11-09T00:00:00Z', sales_end = '2026-11-13T00:00:00Z'
  from events e where e.id = tt.event_id and e.slug = 'la-teuf-karma' and tt.kind = 'early_bird';

update ticket_types tt set price_xof = 8000, quota = 30, sales_start = '2026-11-13T00:00:00Z', sales_end = e.starts_at
  from events e where e.id = tt.event_id and e.slug = 'la-teuf-karma' and tt.kind = 'standard';

insert into ticket_types (event_id, kind, price_xof, quota, seats, sales_start, sales_end, price_step_at, price_after_xof, sort)
select id, 'table', 80000, 4, 6, '2026-11-09T00:00:00Z', starts_at, '2026-11-18T00:00:00Z', 100000, 3
from events where slug = 'la-teuf-karma'
on conflict (event_id, kind) do nothing;
