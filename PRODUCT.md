# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Visiteur principal : jeune amateur ou curieux de musique électronique, à Lomé (Togo) ou à Cotonou (Bénin), ou dans la diaspora. Il arrive surtout sur mobile, souvent depuis Instagram, TikTok ou la communauté WhatsApp. Son but : **acheter un billet vite**. Il découvre l'univers en chemin, puis paie en Mobile Money (Flooz, T-Money, MTN, Moov) ou par carte en quelques minutes.

Autres publics confirmés :
- **Staff et organisateur** (une seule personne pilote le site) : suivi des commandes, codes promo, influenceurs, scan des QR à l'entrée, souvent avec un réseau faible en soirée (`/admin`).
- **Influenceurs** : suivi de leurs liens d'affiliation et commissions (`/influenceur`).

## Product Purpose

Site de LA TEUF ÉLECTRONIQUE, collectif qui organise une soirée de musique électronique par mois, dans des lieux qui changent, à Lomé et à Cotonou. Objectif n°1 : **promouvoir les événements et vendre les billets en ligne**. Avant le site, les billets se vendaient seulement sur place le jour J.

Réussite : le visiteur passe d'un lien social à un billet payé, avec un QR unique reçu par e-mail, sans friction. La vente physique est conservée.

## Positioning

- **Mission culturelle africaine** : faire connaître la musique électronique sur la scène africaine (familles house : afro house, deep house, tech house, disco house, afro tech, avec des ouvertures vers la techno et l'amapiano).
- **Fête libre et respectueuse** : un mouvement d'expression libre et de rencontres, qui respecte les limites et le consentement, chaleureux et ouvert à tous.

## Operating Context

- Parcours d'achat : événement → tarif (Early bird, Standard, Table) et quantité → nom, e-mail, WhatsApp, pays → code promo → paiement Kkiapay → confirmation et billet par e-mail avec un QR par place.
- Prix en FCFA (XOF), même monnaie au Togo et au Bénin.
- Trafic surtout mobile, venu des réseaux sociaux, et des liens d'affiliation `/r/<slug>`.
- Le jour J, l'entrée se fait par scan de QR à usage unique, y compris hors ligne.
- Langues : français par défaut, anglais en `/en`.

## Capabilities and Constraints

- Billetterie : places réservées de façon atomique avant paiement, paiement vérifié côté serveur avant d'émettre un billet. Les règles de vente vivent dans les migrations SQL (`supabase/migrations/`), qui font foi.
- KARMA (Lomé, 20 novembre 2026) : capacité de 100 places (70 early bird à 5 000 FCFA, puis 30 standard à 8 000 FCFA), plus 4 tables de 6 personnes hors capacité. Ventes en ligne fermées le jour J. Détails dans `supabase/README.md`.
- Édition de Cotonou : 12 décembre 2026.
- Statuts d'événement : `Bientôt`, `En vente`, `Complet`, `Terminé`.
- Pages existantes : accueil, événements, billetterie, DJs, galerie, FAQ, contact, CGV, mentions légales, confidentialité.
- Prévu, pas encore construit : boutique T-shirts (livraison Togo et Bénin ou retrait en soirée), newsletter e-mail + WhatsApp avec consentement explicite.
- Non tranchés : frais de service, flux Instagram intégré, envoi du billet par WhatsApp.
- Pas de message de prévention sur le site (décision prise).

## Brand Commitments

- Nom : LA TEUF (« LA TEUF ÉLECTRONIQUE »). Logo bulle typographique « LA / TEUF » (`ressources/logo/`).
- Symbole : le trou de serrure, un portail secret entre le quotidien et un espace de liberté.
- Ton : chaleureux, libre, complice, mystérieux sans être élitiste. **Tutoiement** sur le site, **vouvoiement** sur les pages légales et dans le service client.
- Le design system de référence est `DESIGN.md`.

## Evidence on Hand

- Photos réelles des soirées : `public/images/gallery/` (liste dans `src/data/gallery.ts`) et photos du hero `public/images/hero-*.jpg`.
- DJs réels avec portraits : `src/data/djs.ts`, `public/images/djs/`.
- Vidéos d'ambiance : `public/videos/`.
- Médias bruts (≈ 1 Go, hors Git) : `ressources/`.
- Absents, à ne pas inventer : témoignages, chiffres de fréquentation, presse, partenaires, visuels produits de la boutique (mockups provisoires seulement).

## Product Principles

1. Le billet d'abord : chaque page rapproche le visiteur mobile d'un achat, sans détour.
2. Faire confiance au paiement : prix, règles et disponibilité affichés clairement, avec la même vérité que le SQL.
3. Montrer la vraie fête : photos, vidéos et DJs réels plutôt que des promesses.
4. Ouvert à tous : chaleureux et complice, jamais élitiste, avec le respect et le consentement au cœur.
5. Fiable sur le terrain : mobile modeste, réseau faible, une seule personne aux commandes.

## Accessibility & Inclusion

- WCAG AA pour chaque couple texte/fond, focus visible, cibles tactiles ≥ 44 px.
- Animations désactivées avec `prefers-reduced-motion` et allégées sur appareil modeste.
- Mobile first, connexions lentes : cible Lighthouse mobile ≥ 90.
- Bilingue FR/EN.
