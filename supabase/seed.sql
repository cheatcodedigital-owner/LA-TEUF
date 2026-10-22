-- Données de départ. Prix confirmés : early bird 3000, standard 5000 FCFA.
-- Règles de vente (voir migrations/0002_sales_rules.sql) :
--   early bird : 3000 FCFA, 60 billets, de J-21 à J-7 ; standard : 5000 FCFA, 100 billets, à partir de J-7
--   (ou dès que les early birds sont épuisés) jusqu'à l'événement. Capacité de la soirée : 160 (60 + 100).

insert into events (slug, name, venue, city, country, starts_at, capacity, status) values
  ('la-teuf-karma',   'LA TEUF au KARMA', 'KARMA', 'Lomé',    'Togo',  '2026-11-20T20:00:00Z', 160, 'on_sale'),
  ('la-teuf-cotonou', 'LA TEUF · Cotonou', null,   'Cotonou', 'Bénin', '2026-12-12T20:00:00Z', 160, 'soon');

-- Fenêtres calées sur minuit UTC du jour J
insert into ticket_types (event_id, kind, price_xof, quota, sales_start, sales_end, sort)
select id, 'early_bird', 3000, 60,
       date_trunc('day', starts_at at time zone 'UTC') at time zone 'UTC' - interval '21 days',
       date_trunc('day', starts_at at time zone 'UTC') at time zone 'UTC' - interval '7 days', 1
from events where slug = 'la-teuf-karma';

insert into ticket_types (event_id, kind, price_xof, quota, sales_start, sales_end, sort)
select id, 'standard', 5000, 100,
       date_trunc('day', starts_at at time zone 'UTC') at time zone 'UTC' - interval '7 days',
       starts_at, 2
from events where slug = 'la-teuf-karma';
