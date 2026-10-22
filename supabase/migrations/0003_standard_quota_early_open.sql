-- Ajustements des règles de vente
--
--  * Standard : quota de 100 places (voir seed.sql ; la capacité de la soirée reste le plafond global).
--  * Si l'early bird est épuisé (vendu + réservé) avant J-7, le standard s'ouvre aussitôt.
--  * Remise de groupe sur le standard : -10 % dès 5 billets, -15 % dès 8, -20 % pour 10.

create or replace function _group_discount_pct(p_kind text, p_quantity int)
returns int
language sql immutable as $$
  select case
    when p_kind <> 'standard' then 0
    when p_quantity >= 10 then 20
    when p_quantity >= 8  then 15
    when p_quantity >= 5  then 10
    else 0
  end;
$$;

-- Même signature de sortie que 0002 : les droits existants sont conservés
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
  -- Le standard s'ouvre plus tôt dès que tous les early birds sont pris
  early_full as (
    select coalesce(bool_or(t.quota is not null and t.quota - t.sold_t - t.held_t <= 0), false) as full
    from t where t.kind = 'early_bird'
  ),
  a as (
    select t.id, t.kind, t.price_xof, t.sort, t.sold_t, t.held_t, t.sales_start, t.sales_end,
      greatest(0, least(
        case when t.quota is null then c.cap else t.quota - t.sold_t - t.held_t end,
        c.cap - c.sold_e - c.held_e
      )) as avail,
      (((t.sales_start is null or now() >= t.sales_start) or (t.kind = 'standard' and ef.full))
        and (t.sales_end is null or now() < t.sales_end)) as in_window
    from t cross join c cross join early_full ef
  )
  select a.id, a.kind, a.price_xof, a.sort, a.sold_t::int, a.held_t::int, a.avail::int,
         a.sales_start, a.sales_end, a.in_window,
         (a.in_window and a.avail > 0),
         case
           when a.in_window then (case when a.avail <= 0 then 'sold_out' else 'on_sale' end)
           when a.sales_start is not null and now() < a.sales_start then 'upcoming'
           else 'closed'
         end
  from a order by a.sort;
$$;
