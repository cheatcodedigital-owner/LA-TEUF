-- Règle de vente simplifiée
--
--  * L'early bird n'a plus de période de validité : il est en vente (dès son ouverture) jusqu'à épuisement du quota.
--  * Le standard n'a pas de date d'ouverture : il s'ouvre UNIQUEMENT quand tous les early birds sont vendus
--    (vendus + réservés = quota). S'il n'y a aucun early bird pour l'événement, il suit ses propres dates.
--  * Le jour de la soirée (minuit UTC du jour J), early bird et standard sont fermés : billets vendus sur place.
--    Les tables restent en vente jusqu'à l'heure de la soirée.
-- Même signature de sortie que 0009 : les droits existants sont conservés.

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
  -- has_early : l'événement a un early bird ; full : il est épuisé (vendu + réservé)
  early as (
    select count(*) > 0 as has_early,
           coalesce(bool_or(t.quota is not null and t.quota - t.sold_t - t.held_t <= 0), false) as full
    from t where t.kind = 'early_bird'
  ),
  a as (
    select t.id, t.kind, t.sort, t.sold_t, t.held_t, t.sales_start, t.sales_end, ef.has_early, ef.full,
      case when t.price_step_at is not null and t.price_after_xof is not null and now() >= t.price_step_at
           then t.price_after_xof else t.price_xof end as price,
      greatest(0, case
        when t.kind = 'table' then t.quota - t.sold_t - t.held_t
        else least(
          case when t.quota is null then c.cap else t.quota - t.sold_t - t.held_t end,
          c.cap - c.sold_e - c.held_e)
      end) as avail,
      (case when t.kind = 'standard' and ef.has_early then ef.full
            else (t.sales_start is null or now() >= t.sales_start) end
        and (t.sales_end is null or now() < t.sales_end)) as in_window
    from t cross join c cross join early ef
  )
  select a.id, a.kind, a.price::int, a.sort, a.sold_t::int, a.held_t::int, a.avail::int,
         a.sales_start, a.sales_end, a.in_window,
         (a.in_window and a.avail > 0),
         case
           when a.in_window then (case when a.avail <= 0 then 'sold_out' else 'on_sale' end)
           when (a.sales_start is not null and now() < a.sales_start and not (a.kind = 'standard' and a.has_early))
                or (a.kind = 'standard' and a.has_early and not a.full and (a.sales_end is null or now() < a.sales_end))
             then 'upcoming'
           else 'closed'
         end
  from a order by a.sort;
$$;

-- KARMA : early bird dès le 9 novembre, sans fin avant le jour J ; standard sans date ; les deux fermés le 20 novembre à 00:00 UTC
update ticket_types tt set sales_start = '2026-11-09T00:00:00Z', sales_end = '2026-11-20T00:00:00Z'
  from events e where e.id = tt.event_id and e.slug = 'la-teuf-karma' and tt.kind = 'early_bird';

update ticket_types tt set sales_start = null, sales_end = '2026-11-20T00:00:00Z'
  from events e where e.id = tt.event_id and e.slug = 'la-teuf-karma' and tt.kind = 'standard';
