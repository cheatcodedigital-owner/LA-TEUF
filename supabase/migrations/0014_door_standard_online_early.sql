-- Politique de vente du 10/11/2026
--
--  * Billets en ligne = early bird uniquement (5 000 FCFA, consommation incluse), en quantité limitée selon le lieu
--    (KARMA : 70). La vente en ligne ferme à midi la veille de la soirée (heure locale).
--  * Standard (8 000 FCFA, consommation incluse) : vendu uniquement à la porte le jour de la soirée. Il reste affiché
--    sur la billetterie (état « door ») mais ne se réserve jamais en ligne (`ticket_types.door_only`).
--  * Plus de remise de groupe automatique.
--  * Codes promo : early bird uniquement.
--  * Tables (salons) : politique inchangée (prix par palier, en vente jusqu'à l'heure de la soirée).
-- Mêmes signatures que 0009/0010 : les droits existants sont conservés.

alter table ticket_types add column if not exists door_only boolean not null default false;

-- Plus de remise automatique (gardée pour compatibilité, renvoie toujours 0)
create or replace function _group_discount_pct(p_kind text, p_quantity int)
returns int
language sql immutable as $$
  select 0;
$$;

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
  a as (
    select t.id, t.kind, t.sort, t.sold_t, t.held_t, t.sales_start, t.sales_end, t.door_only,
      case when t.price_step_at is not null and t.price_after_xof is not null and now() >= t.price_step_at
           then t.price_after_xof else t.price_xof end as price,
      greatest(0, case
        when t.kind = 'table' then t.quota - t.sold_t - t.held_t
        else least(
          case when t.quota is null then c.cap else t.quota - t.sold_t - t.held_t end,
          c.cap - c.sold_e - c.held_e)
      end) as avail,
      (not t.door_only
        and (t.sales_start is null or now() >= t.sales_start)
        and (t.sales_end is null or now() < t.sales_end)) as in_window
    from t cross join c
  )
  select a.id, a.kind, a.price::int, a.sort, a.sold_t::int, a.held_t::int,
         (case when a.door_only then 0 else a.avail end)::int,
         a.sales_start, a.sales_end, a.in_window,
         (a.in_window and a.avail > 0),
         case
           when a.door_only then 'door'
           when a.in_window then (case when a.avail <= 0 then 'sold_out' else 'on_sale' end)
           when a.sales_start is not null and now() < a.sales_start then 'upcoming'
           else 'closed'
         end
  from a order by a.sort;
$$;

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

  if p_promo is not null and btrim(p_promo) <> '' then
    -- Codes promo : early bird uniquement (le standard est vendu à la porte, les tables ont leur propre prix)
    if tier.kind <> 'early_bird' then raise exception 'promo_not_allowed'; end if;

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
    use_promo := promo_disc > 0;
  end if;

  discount := case when use_promo then promo_disc else 0 end;
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
    0,
    af.id,
    case when af.id is not null then floor(total * af.rate_pct / 100.0)::int else 0 end
  ) returning id into oid;

  return jsonb_build_object(
    'orderId', oid, 'expiresAt', expires, 'quantity', p_quantity,
    'unitPriceXof', tier.price_xof, 'subtotalXof', subtotal,
    'discountXof', discount, 'totalXof', total,
    'autoDiscountPct', 0,
    'promoApplied', use_promo,
    'seats', (select seats from ticket_types where id = tier.ticket_type_id));
end $$;

-- ---------------------------------------------------------------------------------------
-- KARMA (20 novembre 2026, 21 h à Lomé = 21:00 UTC)
-- ---------------------------------------------------------------------------------------
-- Early bird : 70 billets en ligne, vente fermée le 19 novembre à midi
update ticket_types tt set quota = 70, sales_end = '2026-11-19T12:00:00Z'
  from events e where e.id = tt.event_id and e.slug = 'la-teuf-karma' and tt.kind = 'early_bird';

-- Standard : à la porte uniquement
update ticket_types tt set door_only = true, sales_start = null, sales_end = null
  from events e where e.id = tt.event_id and e.slug = 'la-teuf-karma' and tt.kind = 'standard';

-- Tables : inchangées, en vente jusqu'à l'heure de la soirée (alignée sur 21 h, migration 0012)
update ticket_types tt set sales_end = e.starts_at
  from events e where e.id = tt.event_id and e.slug = 'la-teuf-karma' and tt.kind = 'table';
