-- Horaire du KARMA et lieu de Cotonou confirmés le 10/11/2026 :
-- KARMA (Lomé, UTC+0) de 21 h à 3 h ; Cotonou à Zone 5 Plage (le 12/12, 20:00 UTC = 21 h à Cotonou, inchangé).
-- Les billets et e-mails n'affichent que la date : ceux déjà envoyés restent justes.
update events set starts_at = '2026-11-20T21:00:00Z' where slug = 'la-teuf-karma';
update events set venue = 'Zone 5 Plage' where slug = 'la-teuf-cotonou';
