-- Codes promo archivés : masqués de /admin/codes sans perdre l'historique des commandes payées.
-- Un code jamais payé est supprimé pour de bon ; un code déjà payé est archivé (et désactivé, donc refusé par create_order).
alter table promo_codes add column if not exists archived_at timestamptz;
