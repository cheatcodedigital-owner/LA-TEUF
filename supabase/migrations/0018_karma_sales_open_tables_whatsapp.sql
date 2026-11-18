-- 18/11/2026 : réouverture de la billetterie du KARMA (THE CROSSOVER, 27 novembre 2026, 21 h à Lomé).
-- Early bird en ligne jusqu'au 26 novembre à midi (migration 0015, inchangé), standard à la porte (0014, inchangé).
--
-- Salons (tables) : plus de vente en ligne. Ils restent affichés sur la billetterie (prix et tables restantes), mais
-- la réservation se fait avec l'équipe sur WhatsApp ; `reserve()` (src/lib/ticketing/sales.ts) refuse tout tarif `table`
-- (`type_unavailable`). Les salons réservés par WhatsApp sont gérés hors du site (aucun billet émis automatiquement).
update events set status = 'on_sale' where slug = 'la-teuf-karma';
