# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# LA TEUF — Site web

@AGENTS.md

Site de LA TEUF ÉLECTRONIQUE (soirées de musique électronique, Lomé et Cotonou) : vitrine immersive + billetterie en ligne.

## Documents de référence
- `BRAINSTORMING.md` : périmètre, fonctionnalités, stack, risques, plan de réalisation, points ❓ à trancher.
- `DESIGN.md` : design system v2 (couleurs, typo, grille, stickers, composants, mouvement, plan de migration). **À respecter pour tout nouveau composant ou page.** Source visuelle : fichier Paper « LA TEUF — Design System ». Référence codée : l'aperçu `/apercu`.

## Stack
Next.js 16 (App Router, TypeScript, `src/`), Tailwind v4 (tokens dans `src/app/globals.css`, bloc `@theme`), `next/font/local`, Supabase, Kkiapay, `next-intl` (FR par défaut + EN), GSAP (ScrollTrigger, SplitText, CustomEase), Lenis, Zod, `ogl`. Prévu : Lumail.ai.

## Commandes
- `npm run dev` : serveur de dev (port 3000, config `.claude/launch.json`)
- `npm run build` · `npm run lint` · `npx tsc --noEmit`
- `npm run test:db` : tests du schéma SQL de la billetterie (Postgres en mémoire PGlite, `supabase/tests/ticketing.test.mjs`). C'est la seule suite de tests ; pas de runner JS/E2E.
- Variables d'environnement : modèle dans `.env.example`, valeurs dans `.env.local`.

## Conventions design (charte v2, voir `DESIGN.md`)
- **Migration en cours** (ordre : `DESIGN.md` §13). Les pages sont rangées en deux groupes de routes (les adresses ne changent pas) : `src/app/[locale]/(v1)/` garde l'ancienne charte (son layout : `src/components/layout/` header + footer, ciel étoilé ; encadrés `rounded-card` Indigo dans une page `max-w-6xl`, `section-light`, `hover-glow`, `src/components/ui.tsx`, page `/design`) ; `src/app/[locale]/(v2)/` suit la v2 (layout `SiteChrome`). Migrer une page = la déplacer de `(v1)` à `(v2)` et la refaire en bandes. Ne pas étendre l'ancienne charte.
- Fondations v2 dans `src/components/ds/` : `Band` + duos (`band.tsx`), `Flip` (`flip.tsx`), `Sticker`, icônes et drapeaux, champs `TextField` / `TextArea` (`field.tsx`), `SiteChrome` (bandeau d'annonce et navigation `site-header.tsx`, bande géante et footer `site-footer.tsx`, marges de page), mouvement (`slush-motion.tsx`), `ticketsHref` (`links.ts`). L'aperçu `/apercu` (`src/components/apercu/`) les utilise et sert de modèle.
- Tokens Tailwind seulement, jamais de hex en dur : `cosmic-black`, `deep-indigo`, `warm-ivory`, `solar-copper`, `copper-deep`, `ultraviolet`, `copper-pale` (Pêche), `violet-pale` (Lilas), `violet-deep` (Violet profond). Electric Aqua est retiré : le Copper porte les CTA.
- **Bandes** pleine largeur aux coins arrondis (composant `Band` : `rounded-band` 24 px, `md:rounded-band-lg` 40 px), marge de page 8 px (6 px sur mobile), 8 px entre bandes, contour 1 px. Chaque bande prend un des 7 duos de `DESIGN.md` §2.2 ; jamais deux fois le même duo à la suite, une seule couleur vive par bande.
- Contrastes : sur fond clair (Ivoire, Pêche), accents en `copper-deep`, jamais en Copper ; sur Violet profond, accent Lilas. Copper et Ultraviolet jamais sur un même élément. Pas de « couleur de section » : la navigation ne change pas de couleur au défilement.
- Polices : `font-title` (ATP Dizzy, titres), `font-display` (Tropic Ground, citations), `font-label` (Anton, MAJUSCULES : dates, prix, boutons), `font-body` (Pain de Mie). Un mot-clé coloré par titre. **Pas de surtitre** au-dessus des titres (sauf « Informations légales »).
- Boutons : pilules qui basculent en 3D au survol (composant `Flip`, classe `.flip-btn`, faces dans `flip` de `src/components/ds/flip.tsx`). Cartes cliquables : `.press`. Cartes dépliables fermées au chargement.
- **Pas d'ombre ni de halo** : plus de `hover-glow` sur les boutons. Seule lueur : le contour Ultraviolet (`shadow-glow`) du visuel d'une carte date au survol.
- Stickers : composant `Sticker` (PNG de `ressources/stickers/` exportés à 2× dans `public/stickers/`, `unoptimized`), inclinés entre −10° et +10°, 2 par bande au plus, aucun dans le hero, ne masquent jamais un mot, `aria-hidden`.
- Mouvement (Slush) : `src/components/ds/slush-motion.tsx`. `SmoothScroll` (Lenis) est dans `SiteChrome` ; **chaque page v2 se termine par `<Reveals />`** (apparitions GSAP, lancées une fois la page hydratée : dans le layout, SplitText casserait l'hydratation). Courbes `slush` et `slush-bounce`, attributs `data-heading-reveal`, `data-card-reveal`, `data-reveal-up`, `data-load-stagger`, `data-anim-slant`). Tout respecte `prefers-reduced-motion` (`DESIGN.md` §9.4).
- Mobile first, cibles tactiles ≥ 44 px, focus visible (anneau Copper 2 px).
- Accueil v2 (`/apercu`) : hero, ambiance P3 (vaisseau au défilement en 4 étapes, `ambiance.tsx`, vidéos `public/videos/ambiance-slide-N.mp4`), concept, prochains rendez-vous, CTA billets, communauté, bande géante + footer ; pas de galerie ni de contact. L'accueil public actuel (`src/components/home/`, dont `dimensional-switch-slider.tsx`) sera remplacé.
- Galerie `/galerie` : actuellement carrousel WebGL (`src/components/gallery/circular-gallery.tsx`, repli en grille dans `gallery-showcase.tsx`) puis mosaïque (`photo-grid.tsx`) ; en v2, mosaïque seule. Photos dans `src/data/gallery.ts`, légendes dans `Gallery.alt` (même ordre).
- DJs : `src/data/djs.ts` (`photo` pour le line-up, `photo2` optionnelle pour le mur de portraits), portraits 4:5 dans `public/images/djs/`.
- FAQ `/faq` (`src/app/[locale]/(v1)/faq/page.tsx`, textes dans `Faq.groups` de `messages/*.json`, accordéon `<details>` + JSON-LD FAQPage) : à tenir à jour avec tarifs, tables et règles de vente.
- Contact `/contact` : formulaire `src/components/contact/contact-form.tsx` → `POST /api/contact` (Turnstile + Resend, « répondre à » = visiteur). Il affiche encore réseaux et téléphone (`CONTACT_PHONE` dans `nav-items.ts`) ; en v2, formulaire seul (le téléphone reste dans le footer v2).
- Liens et coordonnées partagés par les deux chartes : `src/components/layout/nav-items.ts` (`navItems`, `socials` avec `short` et `handle`, `CONTACT_EMAIL`, `CONTACT_PHONE`). Polices : `src/app/fonts.ts`.

## Règles du projet
- i18n (`next-intl`) : routes sous `src/app/[locale]/`, FR sans préfixe (`/`), EN en `/en`. Textes dans `messages/fr.json` et `messages/en.json`, jamais en dur (sauf la page `/design`). Liens et navigation via `@/i18n/navigation`. Chaque page/layout appelle `setRequestLocale(locale)`. Le proxy (`src/proxy.ts`, ex-middleware en Next 16) gère la locale ; `cacheComponents` est activé.
- Aperçu `/apercu` (`src/app/apercu/`, composants `src/components/apercu/`, médias `public/apercu/`) : layout racine propre, hors `[locale]` et exclu du proxy, `noindex`, toujours en français (`setRequestLocale("fr")` + `NextIntlClientProvider` pour `SiteChrome` ; textes des bandes en dur tolérés tant que c'est un aperçu). Ses liens pointent vers les vraies pages.
- Dans un composant serveur, éviter `new Date()` (incompatible avec `cacheComponents`).
- Un parent avec `transform` casse `position: fixed` : le panneau du menu mobile est rendu hors du `<header>`.
- Secrets dans `.env.local`, jamais dans Git ni dans le chat.
- `ressources/` (≈ 1 Go de médias) est ignoré par Git : copier uniquement des versions optimisées dans `public/`.
- Polices : licences web à vérifier avant mise en production.
- Billetterie : schéma et fonctions SQL dans `supabase/` (voir `supabase/README.md`), logique serveur dans `src/lib/ticketing/`, réservation via `POST /api/billetterie/reserve`, page `/billetterie/[slug]`. Les règles de vente vivent dans les migrations SQL (`supabase/migrations/`, appliquées à la main dans le SQL Editor Supabase, pas de CLI) et font foi (le SQL tranche). `src/lib/ticketing/config.ts` en duplique la remise de groupe pour l'aperçu du total : le garder aligné avec `_group_discount_pct`. Sans Supabase configuré, mode démo en développement uniquement. Règles de vente (KARMA : ventes dès le 9 novembre ; early bird 5 000 FCFA ×70 sans date de fin, standard 8 000 FCFA ×30 ouvert seulement quand l'early bird est épuisé, les deux fermés le jour J (vente physique), capacité 100 ; 4 tables de 6 personnes à 80 000 FCFA du 9 au 17 novembre puis 100 000 FCFA du 18 au 20, hors capacité, 6 billets par table ; max 10, remise de groupe 10/15/20 % sur le standard seulement) : `supabase/README.md` (migrations 0009 et 0010). CGV : `/cgv`.
- Billetterie : paiement Kkiapay (`src/lib/ticketing/kkiapay.ts`, widget `src/components/ticketing/kkiapay-widget.ts`, routes `confirm` et `kkiapay-webhook`). Vérifier le paiement côté serveur avant d'émettre un billet, réserver les places de façon atomique (capacité 100 + 4 tables).
- Admin : `/admin/achats` liste toutes les commandes (filtres événement/statut, recherche nom, e-mail, WhatsApp ou référence) ; `/admin/achats/[id]` montre les billets avec leur QR (mêmes jetons que l'e-mail), le téléchargement du billet habillé (`/api/admin/ticket-image`) et le renvoi de l'e-mail (`sendTicketsEmail(id, { resend, to })`). Pas de page billet publique : le service client passe par l'admin.
- Admin (`src/app/admin/`, API `src/app/api/admin/`, logique `src/lib/admin/`, scanner `src/components/admin/scanner.tsx`) : hors `[locale]` et exclu du proxy, en français sans next-intl. Auth par mots de passe d'environnement (`ADMIN_PASSWORD`, `STAFF_PASSWORD`) et cookie signé ; chaque page lit la session derrière un `<Suspense>` (`requireRole`). Scan hors ligne : manifeste des signatures de QR en `localStorage`, file de scans, synchro via `scan_ticket_at` (migration 0005) ; le serveur fait foi. Voir `supabase/README.md`.
- Affiliation : liens `/r/<slug>[?c=campagne]` (route `src/app/r/[slug]/route.ts`, exclue du proxy i18n), cookie `teuf_ref` lu par `POST /api/billetterie/reserve` → `create_order(p_affiliate)`. Commission 20 % du total, figée à la réservation, comptée seulement sur commande payée. Espace influenceur `/influenceur` (session `src/lib/affiliate/`), gestion dans `/admin/influenceurs`. Codes promo génériques : `/admin/codes` (« Supprimer » : suppression définitive si jamais payé, sinon archivage `archived_at`, migration 0011). Voir `supabase/README.md`.
