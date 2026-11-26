-- 26/11/2026 : vente en ligne de l'early bird du KARMA (THE CROSSOVER, 27 novembre 2026) prolongée jusqu'à minuit
-- la veille de la soirée (nuit du 26 au 27 novembre, 00:00 à Lomé = 00:00 UTC), au lieu de midi (migration 0015).
-- Règle générale désormais : la vente en ligne ferme la veille de la soirée à minuit (heure locale).
update ticket_types tt set sales_end = '2026-11-27T00:00:00Z'
  from events e where e.id = tt.event_id and e.slug = 'la-teuf-karma' and tt.kind = 'early_bird';
