# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# LA TEUF — Site web

@AGENTS.md

Site de LA TEUF ÉLECTRONIQUE (soirées de musique électronique, Lomé et Cotonou) : vitrine immersive + billetterie en ligne.

## Documents de référence
- `BRAINSTORMING.md` : périmètre, fonctionnalités, stack, risques, plan de réalisation, points ❓ à trancher.
- `DESIGN.md` : design system (couleurs, typo, formes, composants, mouvement). **À respecter pour tout composant ou page.**

## Stack
Next.js 16 (App Router, TypeScript, `src/`), Tailwind v4 (tokens dans `src/app/globals.css`, bloc `@theme`), `next/font/local`. Prévus : Supabase, Kkiapay, Lumail.ai, `next-intl` (FR par défaut + EN), GSAP/Framer Motion, Lenis, Zod.

## Commandes
- `npm run dev` : serveur de dev (port 3000, config `.claude/launch.json`)
- `npm run build` · `npm run lint` · `npx tsc --noEmit`
- `npm run test:db` : tests du schéma SQL de la billetterie (Postgres en mémoire PGlite, `supabase/tests/ticketing.test.mjs`). C'est la seule suite de tests ; pas de runner JS/E2E.
- Variables d'environnement : modèle dans `.env.example`, valeurs dans `.env.local`.

## Conventions design
- Utiliser les tokens Tailwind (`bg-cosmic-black`, `bg-deep-indigo`, `text-warm-ivory`, `text-solar-copper`, `text-ultraviolet`, `copper-deep`), jamais de hex en dur.
- **Electric Aqua est retiré** : le Copper porte les CTA.
- Polices : `font-title` (ATP Dizzy, H1 et titres de section), `font-display` (Tropic Ground, citations), `font-label` (Anton, MAJUSCULES : dates, prix, boutons), `font-body` (Pain de Mie).
- Sections en encadrés arrondis (`rounded-card`) dans une page `max-w-6xl`. Sections sombres : fond Deep Indigo, éléments internes Cosmic Black. Sections claires : `section-light`.
- Sur fond Ivory, accents en `copper-deep`, pas en Copper (contraste insuffisant).
- Pas d'ombres : lueur Ultraviolet au survol uniquement (`hover-glow`). Désactiver les animations avec `prefers-reduced-motion`.
- Mobile first, cibles tactiles ≥ 44 px, focus visible.
- Composants partagés : `src/components/ui.tsx`. Layout (header, menu mobile, footer) : `src/components/layout/`. Page de démonstration du design system : `/design` (`src/app/[locale]/design/page.tsx`).

## Règles du projet
- i18n (`next-intl`) : routes sous `src/app/[locale]/`, FR sans préfixe (`/`), EN en `/en`. Textes dans `messages/fr.json` et `messages/en.json`, jamais en dur (sauf la page `/design`). Liens et navigation via `@/i18n/navigation`. Chaque page/layout appelle `setRequestLocale(locale)`. Le proxy (`src/proxy.ts`, ex-middleware en Next 16) gère la locale ; `cacheComponents` est activé.
- Dans un composant serveur, éviter `new Date()` (incompatible avec `cacheComponents`).
- Un parent avec `transform` casse `position: fixed` : le panneau du menu mobile est rendu hors du `<header>`.
- Secrets dans `.env.local`, jamais dans Git ni dans le chat.
- `ressources/` (≈ 1 Go de médias) est ignoré par Git : copier uniquement des versions optimisées dans `public/`.
- Polices : licences web à vérifier avant mise en production.
- Billetterie : schéma et fonctions SQL dans `supabase/` (voir `supabase/README.md`), logique serveur dans `src/lib/ticketing/`, réservation via `POST /api/billetterie/reserve`, page `/billetterie/[slug]`. Les règles de vente vivent dans les migrations SQL (`supabase/migrations/`, appliquées à la main dans le SQL Editor Supabase, pas de CLI) et font foi (le SQL tranche). `src/lib/ticketing/config.ts` en duplique la remise de groupe pour l'aperçu du total : le garder aligné avec `_group_discount_pct`. Sans Supabase configuré, mode démo en développement uniquement. Règles de vente (early bird 3 000 FCFA ×60 de J-21 à J-7, standard 5 000 FCFA ×100 dès J-7 ou dès l'early bird épuisé, max 10, remise de groupe 10/15/20 %) : `supabase/README.md`. CGV : `/cgv`.
- Billetterie : paiement Kkiapay (`src/lib/ticketing/kkiapay.ts`, widget `src/components/ticketing/kkiapay-widget.ts`, routes `confirm` et `kkiapay-webhook`). Vérifier le paiement côté serveur avant d'émettre un billet, réserver les places de façon atomique (capacité 160).
- Admin (`src/app/admin/`, API `src/app/api/admin/`, logique `src/lib/admin/`, scanner `src/components/admin/scanner.tsx`) : hors `[locale]` et exclu du proxy, en français sans next-intl. Auth par mots de passe d'environnement (`ADMIN_PASSWORD`, `STAFF_PASSWORD`) et cookie signé ; chaque page lit la session derrière un `<Suspense>` (`requireRole`). Scan hors ligne : manifeste des signatures de QR en `localStorage`, file de scans, synchro via `scan_ticket_at` (migration 0005) ; le serveur fait foi. Voir `supabase/README.md`.
- Affiliation : liens `/r/<slug>[?c=campagne]` (route `src/app/r/[slug]/route.ts`, exclue du proxy i18n), cookie `teuf_ref` lu par `POST /api/billetterie/reserve` → `create_order(p_affiliate)`. Commission 20 % du total, figée à la réservation, comptée seulement sur commande payée. Espace influenceur `/influenceur` (session `src/lib/affiliate/`), gestion dans `/admin/influenceurs`. Codes promo génériques : `/admin/codes`. Voir `supabase/README.md`.
