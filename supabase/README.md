# Base de données (Supabase)

## Mise en route
1. Créer un projet Supabase, puis dans **SQL Editor** exécuter dans l'ordre :
   - `migrations/0001_ticketing.sql` (schéma, RLS, fonctions)
   - `migrations/0002_sales_rules.sql` (fenêtres de vente, remises de groupe, annulation)
   - `migrations/0003_standard_quota_early_open.sql` (ouverture anticipée du standard, remise 15 %)
   - `migrations/0004_ticket_email_expiry.sql` (suivi de l'envoi de l'e-mail, expiration du billet au scan)
   - `migrations/0005_offline_scan.sql` (scan différé `scan_ticket_at`, appareil de scan)
   - `migrations/0006_revoke_api_roles.sql` (retire l'accès de `anon`/`authenticated` aux fonctions)
   - `migrations/0007_affiliates_promos.sql` (tables d'affiliation, libellé des codes promo)
   - `migrations/0008_affiliate_links.sql` (affiliation par liens, clics, commission 20 %)
   - `migrations/0009_pricing_tables.sql` (nouvelle tarification : early bird 5 000 ×70, standard 8 000 ×30, capacité 100, tables de 6 personnes)
   - `migrations/0010_standard_after_early.sql` (standard ouvert seulement quand l'early bird est épuisé, early bird/standard fermés le jour J)
   - `migrations/0012_event_times_venues.sql` (KARMA à 21 h, Cotonou à Zone 5 Plage)
   - `migrations/0013_cotonou_hours.sql` (Cotonou de 16 h à 4 h)
   - `migrations/0014_door_standard_online_early.sql` (en ligne = early bird jusqu'à la veille midi — minuit depuis la 0020, standard à la porte, plus de remise de groupe, codes promo sur l'early bird)
   - `migrations/0015_karma_postponed_sales_closed.sql` (KARMA repoussé au 27 novembre, billetterie fermée)
   - `migrations/0016_saspay.sql` (second prestataire SasPay : colonnes `payment_provider`, `saspay_*`, `attach_saspay_session`, `mark_order_paid` avec le prestataire). **À appliquer avant de déployer le code qui l'utilise** (l'admin lit ces colonnes).
   - `migrations/0017_rate_limits.sql` (audit de sécurité du 18/11/2026 : table `rate_limits` et fonctions `rate_limit_hit` / `rate_limit_count` / `rate_limit_clear`, compteurs partagés entre instances Vercel ; `active_holds`, réservations actives par e-mail ou WhatsApp). Sans elle, le code se replie sur des compteurs en mémoire et saute le plafond de réservations actives.
   - `migrations/0018_karma_sales_open_tables_whatsapp.sql` (18/11/2026 : billetterie du KARMA rouverte ; salons réservés sur WhatsApp, plus en ligne)
   - `migrations/0019_event_names.sql` (18/11/2026 : noms des soirées repris des visuels, THE CROSSOVER au KARMA et BEYOND THE HORIZON à Zone 5 Plage, pour les e-mails, billets et l'admin)
   - `migrations/0020_karma_early_until_midnight.sql` (26/11/2026 : early bird en ligne prolongé jusqu'à minuit la veille, au lieu de midi)
   - `seed.sql` (événements de départ — early bird 5 000, standard 8 000 FCFA, tables 80 000 → 100 000 FCFA ; **uniquement pour une base vide** : sur une base existante, appliquer la 0009)
2. Copier `.env.example` en `.env.local` et renseigner `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`
   (Project Settings → API). La clé service_role reste côté serveur uniquement.
3. Relancer `npm run dev`. Sans ces variables, la billetterie tourne en **mode démo** (développement
   seulement) ; en production elle s'affiche « indisponible ».

## Règles de vente
Politique du 10/11/2026 (migration 0014, testée par `npm run test:db`) :
- **26/11/2026 (migration 0020)** : la vente en ligne ferme désormais **la veille de la soirée à minuit** (KARMA : 27 novembre 00:00 UTC),
  et non plus à midi. Un pop-up d'alerte (`src/components/ds/closing-alert.tsx`) prévient les visiteurs le jour de la fermeture.
- **18/11/2026 (migration 0018)** : billetterie du KARMA (THE CROSSOVER) **rouverte**. Les **tables (salons) ne se vendent plus en ligne** :
  toujours affichées, elles se réservent sur WhatsApp (+228 91 95 01 93, message pré-rédigé dans le formulaire) ; `reserve()` refuse le tarif `table`.
- **13/11/2026 (migration 0015)** : soirée du KARMA repoussée au **27 novembre 2026** (21 h) et **billetterie provisoirement fermée**
  (`events.status = 'soon'` : `create_order` renvoie `sales_closed`, la page affiche « Billetterie fermée »). Pour rouvrir :
  `update events set status = 'on_sale' where slug = 'la-teuf-karma';` et repasser `status: "en-vente"` dans `src/data/events.ts`.
- **Billets en ligne = early bird uniquement** : 5 000 FCFA, consommation incluse, en quantité limitée selon la taille du lieu
  (KARMA : **70**). En vente dès le **9 novembre** (KARMA) jusqu'à épuisement, et **au plus tard jusqu'à la veille de la soirée à minuit**
  (heure locale ; KARMA : 27 novembre 00:00 UTC = minuit à Lomé, dans la nuit du 26 au 27), via `ticket_types.sales_end`.
- **Standard** : 8 000 FCFA, consommation incluse, **vendu uniquement à la porte le jour de la soirée** (`ticket_types.door_only = true`).
  Il reste affiché sur la billetterie (état `door` renvoyé par `_tiers`) mais n'est jamais réservable en ligne. Capacité générale : 100
  (70 en ligne + la porte) ; les ventes à la porte se saisissent dans l'admin.
- **Pas de remise de groupe** : `_group_discount_pct` renvoie toujours 0 (`autoDiscountPct` reste à 0 dans les réponses).
- **Codes promo : early bird uniquement** (`promo_not_allowed` sur les tables).
- **Tables** (`kind = 'table'`, migration 0009, politique inchangée) : 4 salons de 6 personnes, **80 000 FCFA** du 9 au 17 novembre puis
  **100 000 FCFA** du 18 au 27 novembre (`price_step_at` / `price_after_xof`, le prix est calculé par `_tiers`), en vente en ligne jusqu'à
  l'heure de la soirée. Offre **additionnelle** : elle n'entame pas la capacité générale de 100. Une table = 1 unité commandée = 6 billets
  nominatifs (`ticket_types.seats`), émis par `mark_order_paid` (un QR par personne, tous envoyés à l'e-mail de la réservation). Pas de code
  promo sur les tables. Pour modifier prix, dates ou quota : `update ticket_types` (colonnes `price_xof`, `price_after_xof`, `price_step_at`, `quota`).
- 10 billets (ou tables) maximum par commande.
- Nouvelle soirée : early bird avec `sales_end` = veille à minuit (heure locale), standard avec `door_only = true`, quota early bird selon le lieu.
- Anti-blocage des places (une réservation tient les places sans paiement) : au clic sur « Réserver », anti-bot Cloudflare
  Turnstile vérifié par `POST /api/billetterie/reserve` (variables `NEXT_PUBLIC_TURNSTILE_SITE_KEY` et `TURNSTILE_SECRET_KEY`,
  clés de test utilisées automatiquement en développement), 20 réservations par IP et par 10 minutes (large : IP partagées
  des opérateurs mobiles), et 2 réservations actives au plus par e-mail ou numéro WhatsApp (`active_holds`, `MAX_ACTIVE_HOLDS`).
- Limites de débit (`src/lib/security/rate-limit.ts`, migration 0017) : connexions `/admin` et `/influenceur` (8 échecs par IP
  et par 10 minutes, plus Turnstile ; si Cloudflare est injoignable, la connexion reste possible), contact (5 par heure).
- Paiement Kkiapay : au clic sur « Payer », `POST /api/billetterie/checkout` renvoie la clé publique et le widget
  s'ouvre (partnerId = id de la commande). Le succès est revérifié côté serveur (SDK `verify` : statut
  SUCCESS, montant, commande visée) avant `mark_order_paid`, par `POST /api/billetterie/confirm` (navigateur)
  et par le webhook `POST /api/billetterie/kkiapay-webhook` (en-tête `x-kkiapay-secret` = `KKIAPAY_WEBHOOK_SECRET`,
  à déclarer dans le tableau de bord Kkiapay). Les deux chemins sont idempotents. Variables : voir `.env.example`.
- **Choix du prestataire** : `PAYMENT_PROVIDER=kkiapay` (défaut) ou `saspay`. Sur Vercel, changer la variable puis « Redeploy »
  (sans changement de code). Les deux webhooks restent actifs pour les paiements commencés avant une bascule.
- Paiement SasPay (checkout hébergé, `src/lib/ticketing/saspay.ts`) : après l'anti-bot, `POST /api/billetterie/checkout` crée côté
  serveur une session `POST /checkout-sessions/` (montant `"5000.00"`, XOF, `country` TG ou BJ selon l'édition, `fee_charge_mode: DEDUCTED`
  — l'acheteur paie le prix affiché, les frais sont retirés du net —, `metadata` = `order_id`, `edition`, `tickets`, `expires_at` = fin de la
  réservation) et ne renvoie au navigateur que `checkout_url`. **Une seule session par commande** (`attach_saspay_session`, atomique) :
  un double clic ou un retour arrière réutilise la même. Clé `SASPAY_SECRET_KEY` (sk_test_ → API sandbox, sk_live_ → API live).
- Billets SasPay émis **uniquement par le webhook** `POST /api/billetterie/saspay-webhook` (événement `transaction.success`) :
  signature HMAC SHA-256 de `${X-Webhook-Timestamp}.${corps brut}` avec `SASPAY_WEBHOOK_SECRET`, horodatage à ±5 min, comparaison en
  temps constant ; puis `GET /payments/{id}/verify/` (SUCCESS, XOF, `requested_amount` = total) ; le webhook ne transporte ni metadata
  ni session, la commande est retrouvée par sa session (`GET /checkout-sessions/{id}/status/` → `transaction_id`) ; enfin
  `mark_order_paid(..., 'saspay')`, idempotent (un webhook rejoué ne crée aucun billet de plus ; `saspay_transaction_id` unique).
  5xx si SasPay ou la base est indisponible (SasPay relance 5 fois sur 2 h).
- Page de retour `/billetterie/[slug]/retour?commande=…` (`return_url`, seulement après un paiement réussi) : lit le statut en base
  (`GET /api/billetterie/commande`) et n'émet jamais de billet ; payée → page « merci ». Secours si le webhook n'arrive jamais :
  bouton « Revérifier le paiement » dans `/admin/achats/[id]` (même vérification serveur).
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

## Admin et scan (`/admin`)
- Accès par mot de passe : `ADMIN_PASSWORD` (tableau de bord, exports, scan) ou `STAFF_PASSWORD` (scan seulement). Cookie de session HttpOnly signé, 24 h, 8 essais par IP et par 10 min. Pages en français, hors next-intl, `noindex`.
- Tableau de bord `/admin?event=<slug>` : recettes, places, entrées, ventes par tarif, commandes par statut, paiements **à rembourser**, dernières commandes et scans.
- Exports CSV (`/api/admin/export?event=<slug>&type=commandes|billets|scans`, admin seulement) : séparateur `;`, BOM UTF-8 pour Excel, formules neutralisées.
- Scanner `/admin/scan` (mobile, caméra) : fonctionne **sans réseau**.
  - Avant la soirée, avec du réseau : choisir l'événement et « Mettre à jour la liste ». L'appareil stocke un manifeste (`/api/admin/scan/manifest`) : pour chaque billet, id, **signature du QR**, nom, tarif et état. Ni nonce ni secret n'y figurent.
  - En ligne, chaque scan est tranché par le serveur (`/api/admin/scan/sync` → `scan_ticket_at`, usage unique entre tous les appareils).
  - Hors ligne, le scan est contrôlé sur le manifeste (signature, annulé, déjà utilisé, expiré), marqué utilisé localement et mis en file. Au retour du réseau (événement `online`, toutes les 20 s, ou bouton) la file est envoyée : le serveur revérifie la signature HMAC et applique l'usage unique. Le premier appareil synchronisé l'emporte ; un refus apparaît dans « À vérifier » avec l'appareil du premier scan.
  - Un QR absent de la liste (billet vendu après la dernière mise à jour) s'affiche en orange « Absent de la liste » : l'agent décide, le scan est mis en file et contrôlé à la synchronisation.
  - Le service worker `public/admin-sw.js` (portée `/admin/`) met en cache la page du scanner et les fichiers `/_next/static/` : **ouvrir `/admin/scan` une fois avec du réseau** sur chaque téléphone avant la soirée. Caméra : HTTPS obligatoire (ou localhost).

## Droits des fonctions (important)
Sur Supabase, `revoke ... from public` ne retire pas l'accès de `anon` et `authenticated` (privilèges par défaut du schéma `public`) : sans la migration 0006, la clé publique pouvait appeler `mark_order_paid` via l'API REST. **Toute nouvelle fonction du schéma doit être suivie de `revoke all on function ... from anon, authenticated;`.** Vérification : `select p.oid::regprocedure, has_function_privilege('anon', p.oid, 'execute') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public';` (seule `rls_auto_enable`, fournie par Supabase, peut rester ouverte).

## Codes promo et affiliation
- **Codes promo** (`/admin/codes`) : générés depuis l'admin, nombre d'utilisations limité (commandes payées), `%` ou montant fixe, événement et date de fin optionnels. Early bird uniquement. Lien partageable `/billetterie/<événement>?code=XXXX` (préremplit le champ).
- **Affiliation par liens** (`/admin/influenceurs`, migration 0008) :
  - Lien `https://<site>/r/<identifiant>[?c=<campagne>]` (route `src/app/r/[slug]/route.ts`) : compte le clic (`affiliate_clicks`, robots et aperçus de lien ignorés, un même visiteur n'est compté qu'une fois par 30 min), pose les cookies `teuf_vid` (visiteur) et `teuf_ref` (`slug` ou `slug:campagne`, 30 jours, dernier clic gagnant) puis redirige vers la billetterie de l'événement choisi (par défaut le prochain en vente).
  - À la réservation, `POST /api/billetterie/reserve` lit `teuf_ref` et le passe à `create_order(p_affiliate)`. Aucune remise pour l'acheteur. La commission (`rate_pct`, 20 %) est calculée sur le **total de la commande** (après remise de groupe ou code promo) et figée dans `orders.affiliate_commission_xof` ; elle ne compte que si la commande est **payée** (une commande remboursée ou annulée sort du décompte).
  - Espace influenceur `/influenceur` (connexion `/influenceur/login`, identifiant = celui du lien + mot de passe généré par l'admin, affiché une seule fois, stocké en scrypt) : clics, visiteurs uniques, achats démarrés (acheteurs distincts ayant validé le formulaire), achats complétés, conversion, par campagne, ventes, commission, versements. Générateur de lien par campagne.
  - Versements : enregistrés dans l'admin (`affiliate_payouts`), dans la limite du solde dû.
