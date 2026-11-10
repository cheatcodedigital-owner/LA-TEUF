-- Horaire de Cotonou confirmé le 10/11/2026 : 16 h - 4 h (Cotonou, UTC+1), soit 15:00 UTC le 12/12.
-- La date reste le 12/12 : fermeture des ventes le jour J et validité des billets inchangées.
update events set starts_at = '2026-12-12T15:00:00Z' where slug = 'la-teuf-cotonou';
