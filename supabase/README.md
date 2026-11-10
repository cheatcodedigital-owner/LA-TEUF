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
   - `migrations/0014_door_standard_online_early.sql` (en ligne = early bird jusqu'à la veille midi, standard à la porte, plus de remise de groupe, codes promo sur l'early bird)
   - `seed.sql` (événements de départ — early bird 5 000, standard 8 000 FCFA, tables 80 000 → 100 000 FCFA ; **uniquement pour une base vide** : sur une base existante, appliquer la 0009)
2. Copier `.env.example` en `.env.local` et renseigner `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`
   (Project Settings → API). La clé service_role reste côté serveur uniquement.
3. Relancer `npm run dev`. Sans ces variables, la billetterie tourne en **mode démo** (développement
   seulement) ; en production elle s'affiche « indisponible ».

## Règles de vente
Politique du 10/11/2026 (migration 0014, testée par `npm run test:db`) :
- **Billets en ligne = early bird uniquement** : 5 000 FCFA, consommation incluse, en quantité limitée selon la taille du lieu
  (KARMA : **70**). En vente dès le **9 novembre** (KARMA) jusqu'à épuisement, et **au plus tard jusqu'à la veille de la soirée à midi**
  (heure locale ; KARMA : 19 novembre 12:00 UTC = 12 h à Lomé), via `ticket_types.sales_end`.
- **Standard** : 8 000 FCFA, consommation incluse, **vendu uniquement à la porte le jour de la soirée** (`ticket_types.door_only = true`).
  Il reste affiché sur la billetterie (état `door` renvoyé par `_tiers`) mais n'est jamais réservable en ligne. Capacité générale : 100
  (70 en ligne + la porte) ; les ventes à la porte se saisissent dans l'admin.
- **Pas de remise de groupe** : `_group_discount_pct` renvoie toujours 0 (`autoDiscountPct` reste à 0 dans les réponses).
- **Codes promo : early bird uniquement** (`promo_not_allowed` sur les tables).
- **Tables** (`kind = 'table'`, migration 0009, politique inchangée) : 4 salons de 6 personnes, **80 000 FCFA** du 9 au 17 novembre puis
  **100 000 FCFA** du 18 au 20 novembre (`price_step_at` / `price_after_xof`, le prix est calculé par `_tiers`), en vente en ligne jusqu'à
  l'heure de la soirée. Offre **additionnelle** : elle n'entame pas la capacité générale de 100. Une table = 1 unité commandée = 6 billets
  nominatifs (`ticket_types.seats`), émis par `mark_order_paid` (un QR par personne, tous envoyés à l'e-mail de la réservation). Pas de code
  promo sur les tables. Pour modifier prix, dates ou quota : `update ticket_types` (colonnes `price_xof`, `price_after_xof`, `price_step_at`, `quota`).
- 10 billets (ou tables) maximum par commande.
- Nouvelle soirée : early bird avec `sales_end` = veille à midi (heure locale), standard avec `door_only = true`, quota early bird selon le lieu.
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
