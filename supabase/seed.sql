-- Données de départ (état final après les migrations jusqu'à 0015).
-- Édition du KARMA (27 novembre 2026, 21 h à Lomé ; repoussée du 20 novembre), billetterie provisoirement fermée (status 'soon') :
--   early bird : 5 000 FCFA consommation incluse, 70 billets en ligne, en vente dès le 9 novembre jusqu'à la veille
--                à midi (26 novembre 12:00) ou épuisement ; codes promo possibles ;
--   standard   : 8 000 FCFA consommation incluse, vendu uniquement à la porte le jour de la soirée (affiché, jamais
--                réservable en ligne) ;
--   capacité générale : 100 ; pas de remise de groupe ;
--   tables (salons) de 6 personnes : 4 tables, 80 000 FCFA du 9 au 17 novembre, 100 000 FCFA du 18 au 27 novembre
--   (offre additionnelle, hors capacité générale, en vente jusqu'à l'heure de la soirée).

insert into events (slug, name, venue, city, country, starts_at, capacity, status) values
  ('la-teuf-karma',   'LA TEUF au KARMA', 'KARMA', 'Lomé',    'Togo',  '2026-11-27T21:00:00Z', 100, 'soon'),
  ('la-teuf-cotonou', 'LA TEUF · Cotonou', 'Zone 5 Plage', 'Cotonou', 'Bénin', '2026-12-12T15:00:00Z', 100, 'soon');

-- Vente en ligne fermée la veille à midi (Lomé = UTC)
insert into ticket_types (event_id, kind, price_xof, quota, sales_start, sales_end, sort)
select id, 'early_bird', 5000, 70, '2026-11-09T00:00:00Z',
       (date_trunc('day', starts_at at time zone 'UTC') at time zone 'UTC') - interval '12 hours', 1
from events where slug = 'la-teuf-karma';

-- Standard : à la porte uniquement
insert into ticket_types (event_id, kind, price_xof, quota, door_only, sales_start, sales_end, sort)
select id, 'standard', 8000, 30, true, null, null, 2
from events where slug = 'la-teuf-karma';

insert into ticket_types (event_id, kind, price_xof, quota, seats, sales_start, sales_end, price_step_at, price_after_xof, sort)
select id, 'table', 80000, 4, 6, '2026-11-09T00:00:00Z', starts_at, '2026-11-18T00:00:00Z', 100000, 3
from events where slug = 'la-teuf-karma';
