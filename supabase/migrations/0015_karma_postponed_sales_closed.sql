-- 13/11/2026 : la soirée du KARMA est repoussée du vendredi 20 au vendredi 27 novembre 2026 (21 h à Lomé = 21:00 UTC),
-- et la billetterie est provisoirement fermée (date d'ouverture à annoncer).
--
-- Fermeture : `events.status = 'soon'`. `create_order` refuse alors toute réservation (`sales_closed`) et la page
-- de l'événement affiche « Billetterie fermée ». Pour rouvrir : update events set status = 'on_sale' where slug = 'la-teuf-karma';
-- (et vérifier les fenêtres de vente ci-dessous, notamment `sales_start` et le prix des tables).
update events set starts_at = '2026-11-27T21:00:00Z', status = 'soon' where slug = 'la-teuf-karma';

-- Early bird : vente en ligne fermée la veille de la soirée à midi (26 novembre 12:00 à Lomé)
update ticket_types tt set sales_end = '2026-11-26T12:00:00Z'
  from events e where e.id = tt.event_id and e.slug = 'la-teuf-karma' and tt.kind = 'early_bird';

-- Tables : en vente jusqu'à l'heure de la soirée (prix inchangés : 100 000 FCFA dès le 18 novembre, `price_step_at`)
update ticket_types tt set sales_end = e.starts_at
  from events e where e.id = tt.event_id and e.slug = 'la-teuf-karma' and tt.kind = 'table';
