-- 18/11/2026 : noms des soirées repris des visuels (e-mails de billets, image du billet, admin, scanner).
-- Mêmes noms que `name` dans src/data/events.ts. Les billets déjà envoyés gardent l'ancien nom (QR inchangés).
update events set name = 'THE CROSSOVER au KARMA'            where slug = 'la-teuf-karma';
update events set name = 'BEYOND THE HORIZON à Zone 5 Plage' where slug = 'la-teuf-cotonou';
