# LA TEUF — Brainstorming du site web

> Document de référence pour le développement avec Claude Code et les agents IA.
> Sources : échanges de brainstorming (21/10/2026), charte graphique d'octobre 2026, dossier `ressources/`.
> Légende : ✅ décidé · ❓ à trancher · ⚠️ point de vigilance.
> Design system : voir `DESIGN.md` (Electric Aqua retiré, CTA en Copper).

---

## 1. Synthèse du projet

| | |
|---|---|
| **Entité** | LA TEUF (« LA TEUF ÉLECTRONIQUE »), collectif organisateur de soirées de musique électronique |
| **Lieux** | Lomé (Togo), édition à Cotonou (Bénin) |
| **Fréquence** | 1 soirée par mois, lieux variables |
| **Public** | Amateurs et curieux de musique électronique, jeunesse africaine et diaspora |
| **Objectif n°1 du site** | Promouvoir les événements et vendre les billets en ligne |
| **Langues** | Français (par défaut) + anglais |
| **Domaine** | `lateufelectronic.com`, déploiement sur Vercel |
| **Pilotage** | Une seule personne, via Claude Code et un tableau de bord admin |

### Calendrier connu
- **20 novembre 2026** : LA TEUF au **KARMA**, Lomé
- **12 décembre 2026** : édition de **Cotonou**
- Capacité par événement : **160 personnes**
- Un événement peut porter la mention **« Bientôt »**

### Changement majeur par rapport à aujourd'hui
Les billets étaient vendus uniquement sur place le jour J. Le site ajoute la **vente en ligne** avec paiement mobile money ou carte, et des **QR codes uniques à usage unique**. La vente physique est conservée.

---

## 2. Identité et univers (extrait de la charte)

### Le brief
LA TEUF est un rendez-vous festif de musique électronique à Lomé. Il invite amateurs et curieux à sortir de leur routine. DJs et instrumentistes live jouent dans des cadres confortables et décontractés. Le concept s'appuie sur des scénographies soignées et des performances (chanteurs, instrumentistes, peintres, DJs, danseurs). C'est un mouvement d'expression libre et de réseautage, avec respect des limites et du consentement. L'ambiance est chaleureuse, décontractée et ouverte à tous.

### Le symbole : le trou de serrure
Il représente un **portail secret** (passage du quotidien à un espace de liberté), un **point de convergence** des énergies artistiques et un **minimalisme futuriste**. C'est le fil conducteur de l'expérience web (voir §6).

### Missions
1. Donner un terrain d'expression à toute forme d'art
2. Vulgariser la musique électronique sur la scène africaine
3. Cultiver l'art de faire la fête librement, dans le respect
4. Se rassembler autour de l'art et soutenir les œuvres artistiques

### Socle musical
Familles **house** : afro house, deep house, tech house, disco house, afro tech, avec des ouvertures vers la techno et l'amapiano. Décor immersif autour du trou de serrure et de jeux de lumière.

### Tonalité éditoriale
Chaleureuse, libre, complice, mystérieuse sans être élitiste. Tutoiement à confirmer ❓. Pas de message de prévention sur le site ✅.

---

## 3. Charte graphique à appliquer

### Couleurs (design tokens)
| Rôle | Nom | Hex | Usage web |
|---|---|---|---|
| Primaire | Deep Indigo | `#202052` | Identité, fonds principaux |
| Structurel | Cosmic Black | `#090A10` | Fond de page, contraste, profondeur |
| Énergie | Ultraviolet | `#7655FF` | Musique, vibrations, lumière, accents, survols |
| Signature | Solar Copper | `#E66C3F` | Chaleur, ancrage africain, titres forts |
| Neutre | Warm Ivory | `#F3E9D5` | Textes, respiration, sections éditoriales |
| Fonctionnel | Electric Aqua | `#45E0CF` | **CTA et infos ponctuelles uniquement** |

Thème par défaut : **sombre** (Cosmic Black / Deep Indigo). Contrôler les contrastes (WCAG AA) pour le texte Ivory sur fond sombre et les CTA Aqua.

### Typographies
- **Principales** : *Tropic Ground Regular* (serif décoratif, titres éditoriaux) et *ATP Dizzy Regular* (rond, groovy, titres expressifs et logo-like)
- **Écriture** : *Pain de Mie* et *Anton* (Anton pour les titres condensés et dates, Pain de Mie pour le texte courant — rôle exact à confirmer ❓)
- Fichiers fournis : `ressources/textes/Fonts/` (OTF)
- ⚠️ À faire : convertir en **WOFF2**, charger via `next/font/local`, et **vérifier les licences d'usage web** de chaque police.

### Logo
- `ressources/logo/LA TEUF Logo Noir.svg` et `LA TEUF Logo Blanc.svg` (le blanc est volontairement un blanc cassé ✅)
- Logo en forme de bulle typographique « LA / TEUF » (viewBox 1882 × 1841)
- Prévoir une version SVG inline pour animation et un favicon dérivé.

### Langage visuel : 4 couches (obligatoire pour chaque visuel)
1. **Le monde** : environnements nocturnes abstraits, architectures monumentales, espaces désertiques surréalistes, paysages cosmiques
2. **La matière** : cuivre, argile, bronze, surfaces sculpturales, verre liquide, poussière
3. **La vibration** : déformations, ondes, diffraction, particules, fluides, motion blur, distorsion gravitationnelle (la représentation physique de la musique)
4. **Le portail** : le trou de serrure comme ouverture monumentale, découpe, vide, source lumineuse

---

## 4. Architecture du site

### Principe ✅
**One-page immersive** pour l'univers, plus des **pages dédiées** pour les parcours transactionnels (billetterie, boutique).

### Plan des pages

| Route | Contenu | Priorité |
|---|---|---|
| `/` | Intro portail, hero du prochain événement, concept, agenda, DJs, galerie, boutique (aperçu), réseaux, newsletter, contact | MVP |
| `/evenements` | Agenda : à venir (avec « Bientôt ») et archives (portfolio) | MVP |
| `/evenements/[slug]` | Fiche événement : lieu, date, line-up, infos, bouton billets, galerie si passé | MVP |
| `/billetterie/[slug]` | Choix du billet, code promo, formulaire acheteur, paiement Kkiapay | MVP |
| `/billet/[id]` | Page de confirmation et rappel du billet (QR) via lien sécurisé | MVP |
| `/djs` et `/djs/[slug]` | Fiches DJs (nom, photo, bio, SoundCloud, Instagram), seulement ceux qui ont déjà mixé | MVP |
| `/galerie` | Photos et vidéos classées par événement | V1 |
| `/boutique` et `/boutique/[produit]` | T-shirts, panier, paiement, livraison ou retrait | V1 |
| `/contact` | Booking et contact général (numéros, email, formulaire) | MVP |
| `/mentions-legales`, `/cgv`, `/confidentialite` | Légal et RGPD | MVP |
| `/admin/*` | Tableau de bord (protégé) | MVP |
| `/admin/scan` | Mini-app de scan QR pour le staff (mobile) | MVP |

Sans page « Équipe » : Shayn et AK2M n'apparaissent pas ✅.

### Navigation
Simple et claire ✅ : barre fixe discrète (Événements · DJs · Galerie · Boutique · Contact), CTA Aqua « Billets » toujours visible, sélecteur FR/EN, menu plein écran animé sur mobile.

### Structure de la one-page (accueil)
1. **Intro portail** (voir §6)
2. **Hero** : visuel ou vidéo d'ambiance, prochain événement (date, lieu, compte à rebours) et CTA billets
3. **Le concept** : « Qu'est-ce que LA TEUF ? » et les 4 missions
4. **Prochains rendez-vous** : Lomé 20/11, Cotonou 12/12
5. **Line-up et DJs**
6. **Galerie / archives** (portfolio des éditions passées)
7. **Boutique** (aperçu)
8. **Communauté** : Instagram, TikTok, WhatsApp, Linktree
9. **Newsletter** (email + WhatsApp, consentement)
10. **Contact** et pied de page

---

## 5. Fonctionnalités

### 5.1 Billetterie en ligne (cœur du projet)

**Parcours acheteur**
1. Choix de l'événement puis du tarif (**Early bird** ou **Standard**), quantité
2. Saisie : nom, email, numéro WhatsApp, pays
3. Code promo (optionnel)
4. Paiement via **Kkiapay** : Mobile Money (Flooz, T-Money, MTN, Moov) ou carte Visa/Mastercard
5. Confirmation à l'écran, puis envoi du billet **par email et par WhatsApp**, avec **un QR unique par place**

**Règles métier**
- Prix en **FCFA (XOF)** ; Togo et Bénin utilisent la même monnaie.
- Capacité **160** par événement, décomptée en temps réel. Statuts : `bientôt`, `en vente`, `complet`, `terminé`.
- Early bird : plafonné en quantité ou en date (❓ à définir). Bascule automatique vers Standard.
- ⚠️ **Anti-survente** : réserver les places avant le paiement avec expiration (par exemple 10 minutes), de façon atomique en base.
- Vente physique conservée : le staff peut **créer un billet sur place** depuis l'admin (paiement espèces), avec QR aussi.
- Frais de service : non retenus pour l'instant ❓.

**Codes promo** ✅
- Générés depuis l'admin : code, type (% ou montant FCFA), plafond d'utilisations, dates, événements concernés, activation.

**Liens d'affiliation influenceurs** ✅
- Chaque influenceur a un lien unique (`?ref=nom` ou `/r/nom`) et éventuellement un code promo associé.
- Suivi : visites, ventes, chiffre d'affaires généré, commission calculée (taux défini dans l'admin ❓).
- Attribution par cookie de 30 jours (durée à confirmer ❓).

**QR codes**
- Un billet = un identifiant unique + un jeton **signé** (HMAC ou JWT), impossible à deviner ou à falsifier.
- **Usage unique** : le scan fait passer le billet à `utilisé` de façon atomique. Un deuxième scan affiche « déjà utilisé » avec l'heure du premier passage.
- Livraison : email (Lumail.ai) + WhatsApp. ⚠️ Voir §8 pour l'envoi WhatsApp.

**Mini-app de scan (`/admin/scan`)** ✅
- Web app mobile (PWA), accès par compte staff ou PIN, caméra pour scanner.
- Retour visuel immédiat : vert (valide), rouge (invalide ou déjà utilisé), orange (autre événement).
- Compteur d'entrées en direct, saisie manuelle du code en secours.
- ⚠️ Réseau parfois faible en soirée : prévoir un mode de repli (liste des billets mise en cache, synchronisation au retour du réseau).

### 5.2 Agenda et archives (portfolio)
- Événements à venir et passés, avec statut, lieu, date, affiche, line-up.
- Les événements passés servent de **portfolio** : galerie photo et vidéo, DJs présents, ambiance.
- Ajout d'un événement « Bientôt » sans date précise ni billetterie.

### 5.3 Fiches DJs ✅
- Pour chaque DJ ayant déjà joué à LA TEUF : nom, photo, bio, liens SoundCloud et Instagram, événements joués.
- Bio disponible en FR et EN ❓.

### 5.4 Galerie photo/vidéo
- Lecture fluide, lazy-loading, lightbox, filtre par événement.
- Vidéos : formats courts verticaux (« clips stories ») et plans larges.

### 5.5 Boutique merchandising ✅
- Produit initial : **T-shirts** (tailles, couleurs, stock).
- Paiement en ligne (Kkiapay) avec **livraison Togo et Bénin uniquement**, ou **retrait en soirée**.
- Livraison : zones et tarifs à définir ❓ ; adresse ou point de remise, numéro de contact.
- Pas encore de visuels produits : prévoir des **mockups provisoires**, remplacés plus tard depuis l'admin.
- Commandes avec statuts : `payée`, `en préparation`, `expédiée`, `retirée`.

### 5.6 Communauté et réseaux ✅
- Instagram : https://www.instagram.com/la_teuf_electronic/
- TikTok : https://www.tiktok.com/@shayntheproducer
- Communauté WhatsApp : https://chat.whatsapp.com/Cggl1KC8ZgDBkZWS5URH0e
- Linktree : https://linktr.ee/la_teuf
- Instagram et TikTok mis en avant (pied de page, section dédiée, boutons flottants). Flux Instagram intégré : ❓ non tranché, option V2.

### 5.7 Liste de diffusion ✅
- Champs : email + numéro WhatsApp, case de **consentement explicite** (RGPD) avec lien vers la politique de confidentialité.
- Double confirmation par email recommandée ❓.
- Synchronisation avec Lumail.ai pour les envois ; export possible depuis l'admin.

### 5.8 Contact et booking ✅
- **Shayn** : 00228 91 95 01 93
- **AK2M (booking)** : 00228 93 70 62 42
- **Email** : hello@lateufelectronic.com
- Boutons « Appeler » et « WhatsApp » sur mobile, formulaire de contact (booking / général).

### 5.9 Tableau de bord admin ✅

| Module | Contenu |
|---|---|
| **Vue d'ensemble** | Ventes du jour et totales, billets vendus / capacité, chiffre d'affaires, visites, inscrits newsletter |
| **Événements** | Création, édition, statut, tarifs, capacité, line-up, affiche, galerie |
| **Billets et participants** | Liste, recherche, statut (payé, utilisé, remboursé), renvoi du billet, annulation, export CSV |
| **Vente sur place** | Création rapide d'un billet espèces |
| **Paiements** | Transactions Kkiapay, rapprochement, échecs |
| **Codes promo** | Création, suivi d'usage |
| **Affiliés / influenceurs** | Liens, ventes, commissions |
| **DJs** | Fiches, photos, liens |
| **Médias** | Téléversement photos et vidéos, rattachement à un événement |
| **Boutique** | Produits, stock, commandes, livraisons |
| **Contacts / newsletter** | Abonnés, consentements, export |
| **Scan** | Accès à la mini-app, compteur d'entrées en direct |
| **Paramètres** | Textes, liens réseaux, numéros, tarifs de livraison |

Accès réservé (Supabase Auth, 1 admin + comptes staff pour le scan).

> ⚠️ Vous avez indiqué piloter le site **via Claude Code uniquement**, mais aussi vouloir un tableau de bord admin. Recommandation : le tableau de bord gère les **données** (ventes, événements, DJs, promos, médias), tandis que Claude Code gère le **code et la mise en page**. Les contenus courants n'exigent ainsi pas de modifier le code.

---

## 6. Expérience et animations

### Intro portail ✅
- Écran noir avec le **trou de serrure** au centre ; une lumière (Ultraviolet / Copper) s'y intensifie.
- Le trou s'agrandit jusqu'à engloutir l'écran et révèle le site : « passage vers l'univers de LA TEUF ». Elle sert aussi de **chargement** (préchargement des visuels et de la vidéo du hero).
- Réalisation : masque SVG (`clip-path` / `mask`) animé avec GSAP ou Framer Motion.
- Règles : durée de 2 à 3 s, bouton **« Passer »**, affichée **une fois par session**, désactivée avec `prefers-reduced-motion`.

### Animations générales ✅ (fluides, navigation claire)
- Défilement fluide (Lenis), apparitions au scroll, transitions de page.
- Survols : lueur Ultraviolet, déformation légère type « vibration ».
- Motifs visuels : ondes, particules, diffraction, grain, selon les 4 couches de la charte.
- Compteur ou compte à rebours du prochain événement.
- Le trou de serrure réapparaît comme élément récurrent : curseur, séparateur de sections, masque de photos, loader.

### Mobile first
Public majoritairement sur mobile avec réseau variable : design pensé d'abord pour le smartphone, poids de page maîtrisé, animations dégradées proprement sur appareils modestes.

---

## 7. Stack technique

| Couche | Choix | Remarque |
|---|---|---|
| Framework | **Next.js** (App Router, TypeScript) | Rendu serveur, SEO, routes API |
| Style | **Tailwind CSS** | Tokens couleurs et polices de la charte |
| Base de données et auth | **Supabase** (Postgres, Auth, Storage, RLS) | Billets, commandes, admin, médias |
| Paiement | **Kkiapay** ✅ | Mobile Money Togo/Bénin et cartes ; webhook de confirmation |
| Email | **Lumail.ai** ✅ | Confirmation de paiement et QR ; voir ⚠️ §8 |
| Hébergement | **Vercel** ✅ | Domaine `lateufelectronic.com` |
| i18n | `next-intl` | FR par défaut, EN, `hreflang` |
| Animations | GSAP et/ou Framer Motion, Lenis | |
| QR | Génération côté serveur (`qrcode`), scan avec `html5-qrcode` ou `BarcodeDetector` | |
| Vidéo | Fichiers optimisés (MP4 H.264 + WebM), posters ; hébergés sur Supabase Storage, Vercel Blob ou Mux ❓ | |
| Images | `next/image` (AVIF/WebP) | |
| Validation | Zod | Formulaires et API |
| Analytics | Vercel Analytics ou Plausible ❓ | Suivi visites et affiliés |
| WhatsApp | Meta WhatsApp Business Cloud API, ou prestataire (Twilio, etc.) ❓ | Voir ⚠️ §8 |
| Anti-spam | Cloudflare Turnstile ou hCaptcha ❓ | Newsletter, contact, achat |

### Modèle de données (première ébauche)
- `events` (id, slug, titre FR/EN, description, date, lieu, ville, pays, capacité, statut, affiche)
- `ticket_types` (event_id, nom : early_bird/standard, prix XOF, quota, dates de vente)
- `orders` (id, acheteur, email, whatsapp, total, statut, id Kkiapay, promo_id, affilié_id, canal : en ligne / sur place)
- `tickets` (id, order_id, event_id, type, jeton QR signé, statut : valide / utilisé / annulé, `scanned_at`, `scanned_by`)
- `reservations` (stock temporaire avec expiration)
- `promo_codes`, `affiliates`, `affiliate_clicks`
- `djs`, `event_djs`
- `media` (type, url, event_id, ordre)
- `products`, `product_variants`, `shop_orders`, `shop_order_items`
- `subscribers` (email, whatsapp, consentement, date, source)
- `contact_messages`
- `settings`

Sécurité : RLS Supabase strict, clés service uniquement côté serveur, vérification de la signature du **webhook Kkiapay**, **idempotence** des paiements, journal des scans.

---

## 8. Vigilances et risques

1. **Anti-survente (160 places)** : réservation temporaire atomique et libération automatique à expiration.
2. **Webhook Kkiapay** : la confirmation de paiement doit être vérifiée côté serveur (appel de vérification de transaction) avant toute émission de billet.
3. **Envoi WhatsApp du QR** : l'API officielle exige un compte Business et des modèles de messages approuvés. À valider tôt ; solution de repli : lien de téléchargement du billet sur `/billet/[id]` envoyé par email, avec bouton « Partager sur WhatsApp ».
4. **Lumail.ai** : vérifier qu'il permet des emails transactionnels via API avec pièces jointes ou images QR. Sinon, envisager Resend ou équivalent pour les billets et garder Lumail.ai pour la newsletter.
5. **Droit et conformité** : mentions légales, CGV (billetterie et remboursement) et politique de confidentialité à rédiger ; adapter au cadre de protection des données du Togo et du Bénin (à faire valider).
6. **Droits à l'image** : accords confirmés pour les photos et vidéos ✅ ; conserver une trace.
7. **Polices** : licences d'usage web à vérifier.
8. **Poids des médias** : ~1 Go de vidéos (dont 37 clips stories) et 84 Mo de photos. Les médias de `ressources/` servent d'**exemples de remplissage** ; le choix définitif revient au client. Compression et formats adaptés obligatoires, jamais de fichiers bruts dans le dépôt Git.
9. **Réseau en soirée** : mode de repli du scan hors ligne.
10. **Fraude** : QR signés, limite d'achats par personne ❓, anti-bot.
11. **Dépendance à une personne** : sauvegardes Supabase, documentation d'exploitation, accès admin sécurisé (2FA recommandé).

---

## 9. SEO, performance, accessibilité

- Balises `title` / `meta` par page et par langue, `hreflang` FR/EN, `sitemap.xml`, `robots.txt`
- Données structurées **schema.org `Event`** (date, lieu, offre, statut) pour chaque événement
- Images Open Graph par événement (partage WhatsApp, Instagram)
- Cibles Lighthouse : ≥ 90 mobile ; chargement vidéo différé ; polices `font-display: swap`
- Accessibilité : contraste, navigation clavier, `alt` des images, animations désactivables, textes alternatifs du portail

---

## 10. Inventaire des ressources fournies (`ressources/`)

| Dossier | Contenu |
|---|---|
| `logo/` | Logo noir et blanc (SVG) |
| `photos/` | 13 photos de soirées (≈ 84 Mo) |
| `videos/` | 6 vidéos + 37 « clips stories » (≈ 1 Go) |
| `textes/` | Charte graphique (PDF, 11 pages), polices (4 OTF), fiches INFO 1 et INFO 2 |
| `inspirations/` | Symbole du trou de serrure (PNG), liens de sites modèles |

**Sites modèles cités** : lasunday.com, durevie.paris, peacocksociety.fr, miamao.fr. Éléments appréciés : animations fluides, navigation simple et claire. Une analyse détaillée de ces quatre sites reste à faire avant la phase design ❓.

---

## 11. Plan de réalisation proposé

| Phase | Contenu | Échéance indicative |
|---|---|---|
| **0. Cadrage** | Valider ce document, tarifs early bird/standard, comptes Kkiapay / Supabase / Vercel / Lumail.ai, domaine | Fin octobre |
| **1. Fondations** | Projet Next.js, Tailwind (tokens), polices, i18n, layout, Supabase (schéma, RLS) | Semaine 1 |
| **2. Vitrine MVP** | Intro portail, accueil, agenda, fiche événement, DJs, contact, newsletter, pages légales | Semaines 1 à 2 |
| **3. Billetterie** | Réservation, Kkiapay, webhook, QR, emails/WhatsApp, codes promo, affiliation | Semaines 2 à 3 |
| **4. Admin et scan** | Tableau de bord, vente sur place, mini-app de scan, exports | Semaines 3 à 4 |
| **5. Tests et mise en ligne** | Tests de paiement réels (mobile money et carte), test de charge, recette sur mobile, déploiement | Avant le 20/11 |
| **6. V1 (après lancement)** | Boutique T-shirts, galerie complète, archives, flux Instagram | Avant Cotonou (12/12) |

⚠️ Pour que les ventes en ligne soient ouvertes bien avant le **20 novembre**, la billetterie, le scan et l'admin sont prioritaires sur la boutique.

---

## 12. Points restant à trancher ❓

1. **Prix** early bird et standard (en FCFA), quota ou date de fin de l'early bird, par événement
2. Taux de **commission** des influenceurs et durée du cookie d'affiliation
3. **Tutoiement ou vouvoiement** dans les textes
4. **Rôle exact des 4 polices** (titres, texte courant, dates)
5. **Zones et tarifs de livraison** de la boutique, tailles et couleurs des T-shirts
6. **Hébergement vidéo** (Supabase, Vercel Blob, Mux)
7. **Canal d'envoi WhatsApp** des billets (API officielle ou prestataire)
8. **Double confirmation** de la newsletter
9. **Limite d'achat** par personne et politique de **remboursement**
10. Analyse précise des **4 sites modèles** (ce qui est à reproduire)
11. **Flux Instagram** intégré sur le site (oui/non)
12. Textes FR/EN définitifs (concept, bios DJs, CGV)

---

## 13. Prochaines étapes

1. Relire ce document et répondre aux points du §12
2. Créer les comptes (Kkiapay en mode test, Supabase, Vercel, Lumail.ai) et me fournir les clés dans un fichier `.env.local` (jamais dans le chat ni dans Git)
3. Générer un `CLAUDE.md` à la racine du projet (conventions, stack, charte) pour guider les agents
4. Lancer la phase 1 : initialisation du projet Next.js
