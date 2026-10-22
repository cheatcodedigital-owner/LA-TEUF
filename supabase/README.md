# Base de données (Supabase)

## Mise en route
1. Créer un projet Supabase, puis dans **SQL Editor** exécuter dans l'ordre :
   - `migrations/0001_ticketing.sql` (schéma, RLS, fonctions)
   - `migrations/0002_sales_rules.sql` (fenêtres de vente, remises de groupe, annulation)
   - `migrations/0003_standard_quota_early_open.sql` (ouverture anticipée du standard, remise 15 %)
   - `migrations/0004_ticket_email_expiry.sql` (suivi de l'envoi de l'e-mail, expiration du billet au scan)
   - `seed.sql` (événements de départ — prix : early bird 3 000, standard 5 000 FCFA)
2. Copier `.env.example` en `.env.local` et renseigner `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`
   (Project Settings → API). La clé service_role reste côté serveur uniquement.
3. Relancer `npm run dev`. Sans ces variables, la billetterie tourne en **mode démo** (développement
   seulement) ; en production elle s'affiche « indisponible ».

## Règles de vente
- Early bird : 3 000 FCFA, 60 billets, de J-21 à J-7. Standard : 5 000 FCFA, 100 billets, de J-7 jusqu'à la
  soirée, ou dès que les 60 early birds sont épuisés. Capacité totale de la soirée : 160 (60 + 100). Les deux tarifs restent affichés : celui qui
  n'est pas ouvert est grisé avec sa date d'ouverture.
- 10 billets maximum par commande.
- Remise de groupe automatique sur le standard : -10 % dès 5 billets, -15 % dès 8, -20 % pour 10. Pas de code promo
  sur l'early bird ; promo et remise de groupe ne se cumulent pas (la meilleure est retenue).
- Anti-bot (Cloudflare Turnstile) après le clic sur « Payer » : variables `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
  et `TURNSTILE_SECRET_KEY` (clés de test utilisées automatiquement en développement).
- Paiement Kkiapay : après l'anti-bot, `POST /api/billetterie/checkout` renvoie la clé publique et le widget
  s'ouvre (partnerId = id de la commande). Le succès est revérifié côté serveur (SDK `verify` : statut
  SUCCESS, montant, commande visée) avant `mark_order_paid`, par `POST /api/billetterie/confirm` (navigateur)
  et par le webhook `POST /api/billetterie/kkiapay-webhook` (en-tête `x-kkiapay-secret` = `KKIAPAY_WEBHOOK_SECRET`,
  à déclarer dans le tableau de bord Kkiapay). Les deux chemins sont idempotents. Variables : voir `.env.example`.
- Pour simuler une date en mode démo : `TICKETING_SAMPLE_NOW=2026-11-01T12:00:00Z` dans `.env.local`.

## Tests du schéma
`npm run test:db` charge la migration dans un Postgres en mémoire (PGlite) et vérifie : paliers
séquentiels, quotas, réservations temporaires, expiration, paiement idempotent, paiement tardif sans
place (`refund_needed`), scan à usage unique, codes promo, RLS et droits.
Limite : un seul client, donc la concurrence réelle repose sur le verrou `FOR UPDATE` de la ligne
`events` dans `create_order` / `mark_order_paid`.

## E-mail du billet et validité du QR
- Après un paiement confirmé (navigateur ou webhook), `sendTicketsEmail` (`src/lib/ticketing/ticket-email.ts`) envoie via Resend un e-mail avec un QR par place (images jointes en CID). Variables : `RESEND_API_KEY`, `EMAIL_FROM`, `TICKET_SIGNING_SECRET`.
- Le QR contient `idBillet.nonce.signature` (HMAC, `ticket-token.ts`). Ne jamais changer `TICKET_SIGNING_SECRET` en cours de vente : les QR déjà envoyés ne passeraient plus la vérification.
- Validité : jusqu'à la fin du lendemain de la soirée (minuit UTC du jour J + 2 jours, exclu). `scan_ticket` renvoie `expired` ensuite.
- `orders.tickets_emailed_at` évite les doublons (posé avant l'envoi, remis à null si l'envoi échoue).

## Modèle
- Une commande `pending` **maintient** ses places jusqu'à `expires_at` (10 min) ; les billets ne sont
  créés qu'au paiement confirmé (`mark_order_paid`, appelé par le webhook Kkiapay après vérification).
- Fonctions (clé service_role uniquement) : `event_sales`, `create_order`, `mark_order_paid`,
  `expire_stale_orders`, `scan_ticket`.
- À planifier : `select expire_stale_orders();` toutes les minutes (pg_cron ou Vercel Cron).
