-- Données de départ (état final après les migrations jusqu'à 0009).
-- Édition du KARMA (20 novembre 2026) :
--   early bird : 5 000 FCFA, 70 billets, en vente dès le 9 novembre, sans date de fin (jusqu'à épuisement) ;
--   standard   : 8 000 FCFA, 30 billets, sans date : s'ouvre uniquement quand les 70 early birds sont vendus ;
--   early bird et standard sont fermés le jour de la soirée (vente physique sur place) ;
--   capacité générale : 100 (70 + 30) ;
--   tables (salons) de 6 personnes : 4 tables, 80 000 FCFA du 9 au 17 novembre, 100 000 FCFA du 18 au 20 novembre
--   (offre additionnelle, hors capacité générale).

insert into events (slug, name, venue, city, country, starts_at, capacity, status) values
  ('la-teuf-karma',   'LA TEUF au KARMA', 'KARMA', 'Lomé',    'Togo',  '2026-11-20T20:00:00Z', 100, 'on_sale'),
  ('la-teuf-cotonou', 'LA TEUF · Cotonou', null,   'Cotonou', 'Bénin', '2026-12-12T20:00:00Z', 100, 'soon');

-- Fenêtres calées sur minuit UTC du jour J
insert into ticket_types (event_id, kind, price_xof, quota, sales_start, sales_end, sort)
select id, 'early_bird', 5000, 70, '2026-11-09T00:00:00Z',
       date_trunc('day', starts_at at time zone 'UTC') at time zone 'UTC', 1
from events where slug = 'la-teuf-karma';

insert into ticket_types (event_id, kind, price_xof, quota, sales_start, sales_end, sort)
select id, 'standard', 8000, 30, null,
       date_trunc('day', starts_at at time zone 'UTC') at time zone 'UTC', 2
from events where slug = 'la-teuf-karma';

insert into ticket_types (event_id, kind, price_xof, quota, seats, sales_start, sales_end, price_step_at, price_after_xof, sort)
select id, 'table', 80000, 4, 6, '2026-11-09T00:00:00Z', starts_at, '2026-11-18T00:00:00Z', 100000, 3
from events where slug = 'la-teuf-karma';
