-- 27/11/2026 : vente en ligne de l'early bird du KARMA (THE CROSSOVER, ce soir 21 h) rouverte le jour même
-- jusqu'à 20 h (heure de Lomé = 20:00 UTC), après sa fermeture à minuit (migration 0020).
-- Exception propre à cette soirée : la règle générale reste la fermeture la veille à minuit.
update ticket_types tt set sales_end = '2026-11-27T20:00:00Z'
  from events e where e.id = tt.event_id and e.slug = 'la-teuf-karma' and tt.kind = 'early_bird';
