# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# LA TEUF — Site web

@AGENTS.md

Site de LA TEUF ÉLECTRONIQUE (soirées de musique électronique, Lomé et Cotonou) : vitrine immersive + billetterie en ligne.

## Documents de référence
- `BRAINSTORMING.md` : périmètre, fonctionnalités, stack, risques, plan de réalisation, points ❓ à trancher.
- `DESIGN.md` : design system v2 (couleurs, typo, grille, stickers, composants, mouvement, plan de migration). **À respecter pour tout nouveau composant ou page.** Source visuelle : fichier Paper « LA TEUF — Design System ». Référence codée : `src/components/ds/` et les pages du site.

## Stack
Next.js 16 (App Router, TypeScript, `src/`), Tailwind v4 (tokens dans `src/app/globals.css`, bloc `@theme`), `next/font/local`, Supabase, Kkiapay, `next-intl` (FR par défaut + EN), GSAP (ScrollTrigger, SplitText, CustomEase), Lenis, Zod. Prévu : Lumail.ai.

## Commandes
- `npm run dev` : serveur de dev (port 3000, config `.claude/launch.json`)
- `npm run build` · `npm run lint` · `npx tsc --noEmit`
- `npm run test:db` : tests du schéma SQL de la billetterie (Postgres en mémoire PGlite, `supabase/tests/ticketing.test.mjs`). C'est la seule suite de tests ; pas de runner JS/E2E.
- Variables d'environnement : modèle dans `.env.example`, valeurs dans `.env.local`.

## Conventions design (charte v2, voir `DESIGN.md`)
- Tout le site suit la charte v2 (migration terminée le 10/11/2026). Habillage commun dans `src/app/[locale]/layout.tsx` → `SiteChrome` (bandeau d'annonce, navigation, pile de bandes, footer, Lenis).
- Composants partagés dans `src/components/ds/` : `Band` + duos (`band.tsx`), `Flip` (`flip.tsx`), `Sticker`, `PageHeader` (en-tête P7, `mobileLine` / `copperWord` pour les titres traduits), `AccordionItem` (`accordion.tsx`), icônes et drapeaux, champs `TextField` / `TextArea` (`field.tsx`), navigation (`site-header.tsx`), bande géante et footer (`site-footer.tsx`), mouvement (`slush-motion.tsx`), `ticketsHref` / `eventOnSale` (`links.ts`).
- **Gabarit d'une page** : une suite de `<Band>`, puis `<GiantBand />` sur les pages vitrine (accueil, événements, page d'un événement, DJs, galerie ; pas sur FAQ, contact, merci, pages légales), puis **`<Reveals />` en dernier** (apparitions GSAP lancées une fois la page hydratée : dans le layout, SplitText casserait l'hydratation). Une page qui lit `params` d'une route dynamique le fait sous `<Suspense>` (voir `billetterie/[slug]`).
- Tokens Tailwind seulement, jamais de hex en dur : `cosmic-black`, `deep-indigo`, `warm-ivory`, `solar-copper`, `copper-deep`, `ultraviolet`, `copper-pale` (Pêche), `violet-pale` (Lilas), `violet-deep` (Violet profond). Electric Aqua est retiré : le Copper porte les CTA.
- **Bandes** pleine largeur aux coins arrondis (`Band` : `rounded-band` 24 px, `md:rounded-band-lg` 40 px), marge de page 6 px (8 px dès 768 px), 8 px entre bandes, contour 1 px. Chaque bande prend un des 7 duos de `DESIGN.md` §2.2 ; jamais deux fois le même duo à la suite, une seule couleur vive par bande.
- Contrastes : sur fond clair (Ivoire, Pêche), accents en `copper-deep`, jamais en Copper ; sur Violet profond, accent Lilas. Copper et Ultraviolet jamais sur un même élément. Pas de « couleur de section » : la navigation ne change pas de couleur au défilement.
- Polices (`src/app/fonts.ts`) : `font-title` (ATP Dizzy, titres), `font-display` (Tropic Ground, citations), `font-label` (Anton, MAJUSCULES : dates, prix, boutons), `font-body` (Pain de Mie). Un mot-clé coloré par titre. **Pas de surtitre** au-dessus des titres (sauf « Informations légales »).
- Boutons : pilules qui basculent en 3D au survol (`Flip`, classe `.flip-btn`) ; lien de la page en cours : pilule Ivoire (`navCurrent`). Cartes cliquables : `.press`. Cartes et questions dépliables fermées au chargement.
- **Pas d'ombre ni de halo**. Seule lueur : le contour Ultraviolet (`shadow-glow`) du visuel d'une carte date au survol.
- Stickers : `Sticker` (PNG de `ressources/stickers/` exportés à 2× dans `public/stickers/`, `unoptimized`), inclinés entre −10° et +10°, 2 par bande au plus, aucun dans le hero, ne masquent jamais un mot, `aria-hidden`.
- Mouvement (Slush) : `src/components/ds/slush-motion.tsx` (courbes `slush` et `slush-bounce`, attributs `data-heading-reveal`, `data-card-reveal`, `data-reveal-up`, `data-load-stagger`, `data-anim-slant`). Tout respecte `prefers-reduced-motion` (`DESIGN.md` §9.4).
- Mobile first, cibles tactiles ≥ 44 px, focus visible (anneau Copper 2 px).
- Accueil (`src/components/home/`) : intro du portail (`src/components/intro/`, WebGL, à garder telle quelle ; le titre du hero attend l'ouverture du tunnel), hero, ambiance P3 (vaisseau au défilement en 4 étapes, `ambiance.tsx`, vidéos `public/videos/ambiance-slide-N.mp4`), concept, prochains rendez-vous, CTA billets, communauté (sans lettre d'information : le bloc renvoie au groupe WhatsApp), bande géante ; pas de galerie ni de contact.
- Événements : données et visuels dans `src/data/events.ts` (lieu, fuseau, horaires, prix d'appel, visuels, sticker, line-up en portraits détourés `public/images/lineup/`), textes dans `Events.items.<slug>`. Carte date partagée : `src/components/events/date-card.tsx`. Page d'un événement = billetterie (`/billetterie/[slug]`, bandes dans `event-bands.tsx`, FAQ `event-faq.tsx`, panneau d'achat `ticket-form.tsx` dans `purchase-shell.tsx` : colonne collante sur grand écran, barre + volet sur mobile).
- DJs : `src/data/djs.ts` (portrait détouré `public/images/djs/cutouts/` + fond `tint`), carte `src/components/djs/dj-card.tsx`.
- Galerie `/galerie` : mosaïque avec visionneuse (`photo-grid.tsx`), photos dans `src/data/gallery.ts`, légendes dans `Gallery.alt` (même ordre).
- FAQ `/faq` (textes dans `Faq.groups` de `messages/*.json`, `AccordionItem` + JSON-LD FAQPage ; 5 questions reprises sur la page événement via `FAQ_PICKS`) : à tenir à jour avec tarifs, tables et règles de vente.
- Contact `/contact` : formulaire seul (`src/components/contact/contact-form.tsx` → `POST /api/contact`, Turnstile + Resend, « répondre à » = visiteur) ; téléphone et réseaux dans le footer.
- Pages légales : `src/components/legal-page.tsx` (sommaire + texte 720 px, vouvoiement, bande de contact `Legal.ctaTitle.<namespace>`).
- Liens et coordonnées : `src/components/layout/nav-items.ts` (`navItems`, `socials` avec `short` et `handle`, `CONTACT_EMAIL`, `CONTACT_PHONE`).

## Règles du projet
- i18n (`next-intl`) : routes sous `src/app/[locale]/`, FR sans préfixe (`/`), EN en `/en`. Textes dans `messages/fr.json` et `messages/en.json`, jamais en dur. Le site tutoie (billetterie comprise) ; seules les pages légales vouvoient. Liens et navigation via `@/i18n/navigation`. Chaque page/layout appelle `setRequestLocale(locale)`. Le proxy (`src/proxy.ts`, ex-middleware en Next 16) gère la locale ; `cacheComponents` est activé.
- Dans un composant serveur, éviter `new Date()` (incompatible avec `cacheComponents`).
- Un parent avec `transform` casse `position: fixed` : le menu mobile et le volet d'achat sont rendus hors des éléments animés par GSAP.
- Secrets dans `.env.local`, jamais dans Git ni dans le chat.
- `ressources/` (≈ 1 Go de médias) est ignoré par Git : copier uniquement des versions optimisées dans `public/`.
- Polices : licences web à vérifier avant mise en production.
- Billetterie : schéma et fonctions SQL dans `supabase/` (voir `supabase/README.md`), logique serveur dans `src/lib/ticketing/`, réservation via `POST /api/billetterie/reserve`, page `/billetterie/[slug]`. Les règles de vente vivent dans les migrations SQL (`supabase/migrations/`, appliquées à la main dans le SQL Editor Supabase, pas de CLI) et font foi (le SQL tranche). Sans Supabase configuré, mode démo en développement uniquement (`sampleSales` dans `sales.ts`, mêmes règles). Billetterie du KARMA provisoirement fermée depuis le 13/11/2026 (soirée repoussée au 27/11, migration 0015 : `events.status = 'soon'` en base et `status: "bientot"` dans `events.ts`, à rouvrir ensemble). Règles de vente (politique du 10/11/2026, migration 0014) : en ligne = early bird uniquement, 5 000 FCFA consommation incluse, quantité limitée selon le lieu (KARMA : 70), vente en ligne fermée la veille de la soirée à midi ; standard 8 000 FCFA consommation incluse, vendu uniquement à la porte (affiché « à la porte », jamais réservable en ligne, `door_only`) ; pas de remise de groupe ; codes promo sur l'early bird uniquement ; tables inchangées (4 salons de 6 à 80 000 FCFA du 9 au 17 novembre puis 100 000 FCFA, hors capacité, 6 billets par table, en vente jusqu'à l'heure de la soirée) ; max 10 par commande. Détails : `supabase/README.md`. Toute page qui décrit la vente (FAQ `Faq.groups`, CGV `Cgv.sections`, panneau `Ticketing`) est à tenir alignée. CGV : `/cgv`.
- Billetterie : paiement Kkiapay (`src/lib/ticketing/kkiapay.ts`, widget `src/components/ticketing/kkiapay-widget.ts`, routes `confirm` et `kkiapay-webhook`). Vérifier le paiement côté serveur avant d'émettre un billet, réserver les places de façon atomique (capacité 100 + 4 tables).
- Admin : `/admin/achats` liste toutes les commandes (filtres événement/statut, recherche nom, e-mail, WhatsApp ou référence) ; `/admin/achats/[id]` montre les billets avec leur QR (mêmes jetons que l'e-mail), le téléchargement du billet habillé (`/api/admin/ticket-image`) et le renvoi de l'e-mail (`sendTicketsEmail(id, { resend, to })`). Pas de page billet publique : le service client passe par l'admin.
- Admin (`src/app/admin/`, API `src/app/api/admin/`, logique `src/lib/admin/`, scanner `src/components/admin/scanner.tsx`) : hors `[locale]` et exclu du proxy, en français sans next-intl. Auth par mots de passe d'environnement (`ADMIN_PASSWORD`, `STAFF_PASSWORD`) et cookie signé ; habillage C7 (fond Cosmic Black, cartes Indigo `rounded-card` 24 px, pilules) ; chaque page lit la session derrière un `<Suspense>` (`requireRole`). Scan hors ligne : manifeste des signatures de QR en `localStorage`, file de scans, synchro via `scan_ticket_at` (migration 0005) ; le serveur fait foi. Voir `supabase/README.md`.
- Affiliation : liens `/r/<slug>[?c=campagne]` (route `src/app/r/[slug]/route.ts`, exclue du proxy i18n), cookie `teuf_ref` lu par `POST /api/billetterie/reserve` → `create_order(p_affiliate)`. Commission 20 % du total, figée à la réservation, comptée seulement sur commande payée. Espace influenceur `/influenceur` (session `src/lib/affiliate/`), gestion dans `/admin/influenceurs`. Codes promo génériques : `/admin/codes` (« Supprimer » : suppression définitive si jamais payé, sinon archivage `archived_at`, migration 0011). Voir `supabase/README.md`.
