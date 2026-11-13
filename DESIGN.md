# LA TEUF — Design system (v2)

> Charte validée le 10/11/2026. Source visuelle : fichier Paper **« LA TEUF — Design System »** (pages Fondations, Composants, Patterns, Templates, Maquettes). Référence codée : composants partagés **`src/components/ds/`**, pages dans `src/app/[locale]/`, styles dans `src/app/globals.css`.
> Inspirations : **Caldera** (mise en page centrée ou pleine largeur, cartes dates, communauté, footer), **Shelby** (duo de couleurs par section), **Slush** (bandes arrondies, stickers, rubans, pilules, boutons qui basculent, apparitions et défilement).
> Le site entier suit cette charte depuis le 10/11/2026 (voir §13). L'intro du portail (WebGL) est conservée telle quelle avant l'accueil.

## 1. Direction

- **Ambiance** : festive, chaleureuse et nocturne. Des **bandes de couleur pleine largeur aux coins arrondis** se succèdent, sombres et claires en alternance franche.
- **Signature** : la typographie groovy (ATP Dizzy), les **stickers illustrés** inclinés, les rubans de styles musicaux et l'univers du **portail / trou de serrure** (logo, vaisseau, planète).
- **Densité** : une idée forte par bande, mobile first. Chaque bande se termine par une action quand c'est possible (le site mène au billet).
- **Pas de surtitre** : aucun petit label au-dessus des titres (« Agenda », « Line-up »…). Seule exception : « Informations légales » sur les pages légales. Ne pas en réintroduire sans demande.
- **Thème** : pas de bascule clair/sombre utilisateur ; le contraste vient de l'alternance des bandes.

## 2. Couleurs

### 2.1 Palette

| Token | Hex | Rôle |
|---|---|---|
| `cosmic-black` | `#090A10` | Fond de page, bande Nuit, texte sur fonds clairs, contours sur clair |
| `deep-indigo` | `#202052` | Bande Indigo, texte sur Ivoire, Pêche et Lilas |
| `warm-ivory` | `#F3E9D5` | Bande Ivoire, texte et contours sur fonds sombres |
| `solar-copper` | `#E66C3F` | CTA, dates, prix, bande Cuivre |
| `copper-deep` | `#A8451A` | Accents Copper **sur fond clair** (Ivoire, Pêche) |
| `ultraviolet` | `#7655FF` | Rubans, stickers, focus décoratif, grands textes seulement |
| `copper-pale` — **Pêche** | `#F7C9AE` | Fond de section (FAQ, infos, cartes) |
| `violet-pale` — **Lilas** | `#D8CFFF` | Fond de section (dates, galerie), accent sur Violet |
| `violet-deep` — **Violet profond** | `#4B32C8` | Fond de section (ambiance, newsletter) |

Les 3 teintes Pêche, Lilas et Violet profond s'ajoutent à la charte d'origine pour donner à chaque section sa couleur (Shelby), sans sortir de l'univers LA TEUF. Tokens dans `src/app/globals.css` (bloc `@theme`) ; jamais de hex en dur.

### 2.2 Les 7 duos de section

| Duo | Fond | Texte | Accent | Contour |
|---|---|---|---|---|
| 1 · Nuit | Cosmic Black | Ivory | Copper | Ivory |
| 2 · Cuivre | Solar Copper | Cosmic Black | — | Cosmic Black |
| 3 · Ivoire | Warm Ivory | Deep Indigo | Copper deep | Cosmic Black |
| 4 · Indigo | Deep Indigo | Ivory | Copper | Ivory |
| 5 · Pêche | Pêche | Deep Indigo | Copper deep (grands corps) | Cosmic Black |
| 6 · Lilas | Lilas | Deep Indigo | Violet profond | Cosmic Black |
| 7 · Violet | Violet profond | Ivory | Lilas (jamais Copper) | Ivory |

### 2.3 Règles

1. Copper et Ultraviolet ne se touchent jamais sur un même élément.
2. Une seule couleur vive par bande : le reste est fond + texte.
3. Jamais deux bandes du même duo à la suite.
4. Contours 1 px : Cosmic Black sur fond clair, Ivory sur fond sombre.
5. Aplats nets : ni dégradé, ni grain, ni ombre portée.
6. **Pas de « couleur de section »** : la barre de navigation et le fond de page ne changent pas de couleur au défilement (décision du 10/11/2026).

### 2.4 États du scan (admin seulement)

`#059669` entrée validée (texte blanc) · `#B91C1C` déjà utilisé / refusé (texte blanc) · `#F59E0B` hors ligne, scan en attente (texte Cosmic Black). Réservés aux résultats du scan à l'entrée, jamais sur le site public ni ailleurs dans l'admin.

### 2.5 Contrastes

Ivory / Cosmic Black, Indigo / Ivoire, Indigo / Pêche (≈ 10:1), Indigo / Lilas (≈ 10:1) : OK partout. Ivory / Violet profond ≈ 6,7:1 : OK. Copper / Cosmic Black ≈ 6:1 : OK. **Copper sur Ivoire ≈ 2,6:1 : interdit**, utiliser `copper-deep` (≈ 4,9:1). Copper deep sur Pêche ≈ 3,9:1 : grands textes seulement (≥ 24 px). Ultraviolet sur Cosmic Black ≈ 4,3:1 : décoratif et grands textes seulement.

## 3. Typographie

| Style | Police | Web (taille / interligne) | Mobile |
|---|---|---|---|
| Display (hero, mot géant) | ATP Dizzy | 200 / 0,88 | 96 / 0,9 |
| H1 (titre de page) | ATP Dizzy | 120 / 0,95 | 56 / 1 |
| H2 (titre de section) | ATP Dizzy | 72 / 1 | 40 / 1,05 |
| H3 (carte, bloc) | ATP Dizzy | 40 / 1,05 | 28 / 1,1 |
| Accroche (citation) | Tropic Ground | 48 / 1,1 | 30 / 1,15 |
| Prix · date | Anton, MAJUSCULES | 64 / 1 | 40 / 1 |
| Label · bouton | Anton, MAJUSCULES, +0,04 em | 15 / 1 | 14 / 1 |
| Corps | Pain de Mie, 720 px max | 18 / 1,5 | 16 / 1,5 |
| Petit (mentions) | Pain de Mie | 15 / 1,45 | 15 / 1,45 |

- Tokens : `font-title` (ATP Dizzy), `font-display` (Tropic Ground), `font-label` (Anton), `font-body` (Pain de Mie, qui s'affiche en capitales par dessin).
- Un **mot-clé coloré** par titre : Copper sur sombre, Copper deep sur clair, Lilas sur Violet. Approche légèrement serrée (−0,02 à −0,03 em) sur les grands titres.
- Les tailles des maquettes priment sur l'échelle quand le contexte l'exige (ex. titres de bande à 48 px).
- ⚠️ Licences web des 4 polices à vérifier avant la mise en production ; fichiers dans `src/fonts/`, chargés par `next/font/local`.

## 4. Grille et espaces

- **Bandes** d'un bord à l'autre : marge de page **8 px** (6 px sur mobile), **8 px entre les bandes**.
- **Web ≥ 1024 px** : 12 colonnes, marge 40, gouttière 24, contenu max 1280. **Mobile 390** : 4 colonnes, marge 16, gouttière 12.
- Trois dispositions : **centrée** (colonnes 3 → 10 : annonces, communauté), **pleine largeur** (1 → 12 : mot géant, dates, galerie), **asymétrique** (7 + 4 colonnes, 1 vide : concept, infos).
- Échelle (base 4) : 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- Rythme : haut et bas d'une bande 96–128 (mobile 48–64) ; titre → texte 24 (mobile 16).

## 5. Formes

- Rayons : vignette **12**, carte et champ **24**, bande **40** (mobile 24), pilule **999**.
- **Pas d'ombre** : la profondeur vient des contours 1 px, des superpositions et du mouvement. Seule lueur autorisée : le contour Ultraviolet du **visuel d'une carte date au survol** (`shadow-glow`). Jamais de halo ni de dégradé derrière un bouton.

## 6. Stickers, rubans et bandeaux

### 6.1 Stickers

15 illustrations maison (`ressources/stickers/`), en 4 familles :
- **Le portail** : portail, fusée, planète, étoiles (ambiance, décor des fonds sombres).
- **La fête** : DJ, danseurs, percussionniste, rencontres (concept, line-up, CTA, galerie).
- **Rooftop & plage** : soleil, badge palmiers, transat, cocktail, DJ Karma (cartes dates, lieux, communauté).
- **Billetterie** : calendrier, billet (agenda, ventes, billet confirmé).

Règles :
- PNG détourés, contour noir déjà dessiné : ne pas ajouter de contour, d'ombre ni de fond.
- Inclinaison entre −10° et +10°, jamais deux fois la même dans une bande. Web 120 à 300 px, mobile 70 à 160 px.
- Ils chevauchent un bord (photo, carte, titre) **sans jamais masquer un mot**. Sur mobile, un sticker qui gêne passe au-dessus du titre.
- 2 par bande au plus, **aucun dans le hero** (la photo et la date suffisent).
- Choisis pour illustrer le propos de la section, jamais pour remplir.
- Servis à 2× leur taille d'affichage, sans recompression (`unoptimized`), pour rester nets.

### 6.2 Rubans

- **Ruban du hero** : Ultraviolet, incliné à −5°, contour 1 px, sous le titre. Il porte les registres musicaux (Afro house ✦ Deep house ✦ Tech house ✦ Afro tech ✦ Disco house). Il reste fixe ; chaque mot et chaque ✦ **s'illumine de l'intérieur** à son propre rythme (voir §9).
- **Rubans croisés** derrière un titre : −5° et +4°, contour 1 px, toujours derrière le titre, défilement en sens opposés.

### 6.3 Bandeaux

- **Bandeau d'annonce** en haut de page : 32 px (mobile 28), défilement continu vers la gauche, drapeaux Togo et Bénin. Variantes Cuivre (vente), Ivoire (info), Lilas (urgence douce).
- **Bande géante avant le footer** : pastilles logo et mot « LA TEUF » en pilule, défilement continu.

## 7. Composants

### 7.1 Navigation (C1)

- Bandeau d'annonce en haut de page (il part avec le défilement), puis **barre collante et transparente** : pastille logo à gauche, liens en **pilules à fond noir cerclées d'Ivoire**, sélecteur FR/EN, CTA **Billets** Cuivre. Les fonds pleins restent lisibles au-dessus de toutes les bandes.
- Comme sur slush.app : après 50 px de défilement vers le bas, les liens remontent un par un hors de l'écran (750 ms, décalage 30 ms) ; ils reviennent dès qu'on remonte. Le logo et « Billets » restent toujours visibles.
- **Mobile** : logo, Billets et bouton « + » toujours visibles. Le « + » ouvre un **menu plein écran Cuivre** : liens numérotés (01 à 05) en ATP Dizzy 48 px séparés par des filets, CTA noir « Prendre mon billet », réseaux IG / TT / WA en ronds, FR/EN en bas. Il se déplie du haut vers le bas, puis les éléments montent en cascade. La page derrière ne défile plus ; Échap ferme.
- États d'un lien : repos (cerclé), survol (face Cuivre qui bascule), page active (pilule Ivoire pleine, texte noir), focus clavier (anneau 2 px).

### 7.2 Boutons et badges (C2)

- Toujours en **pilule**, texte Anton en majuscules. Principal : Cuivre, un par écran. Secondaire : cerclé 1 px. Mobile : principal en pleine largeur, 52 px.
- **Survol (Slush)** : la face avant pivote de 85° vers le haut et s'efface ; une face de couleur arrive de −90° à 0° par-dessous, avec un rebond (850 ms). Faces : Cuivre → Ivoire · cerclé clair → Noir · cerclé sombre → Cuivre · Noir → Lilas. Pression : 95,5 %.
- Badges de statut : Bientôt (Lilas), En vente (Cuivre avec point), Complet (noir), Terminé (pointillés).
- Boutons ronds : 48 px (cible ≥ 44).
- Implémentation : composant `Flip` (`src/components/ds/flip.tsx`) et classe `.flip-btn`.

### 7.3 Cartes (C4)

- **Carte date** : visuel (badge de statut) + bloc infos (date Anton en Copper deep, lieu, nom, description, prix, un seul bouton : « Billets » ou « Me prévenir »). Pas de bouton « Détails ».
- **Survol du visuel (web)** : voile Cosmic Black 82 % qui monte en 300 ms, titre, description, « Line-up · genres » puis grille des portraits DJs sur fonds Pêche / Lilas / Cuivre / Ivoire, contour en lueur Ultraviolet. Sans line-up : « Line-up annoncé bientôt ». Pas de survol sur mobile.
- **Mobile** : visuel puis infos, lieu à droite de la date, bouton pleine largeur (« Prendre mon billet »).
- **Cartes dépliables** (concept, FAQ) : **toutes fermées au chargement** ; illustration au-dessus du titre sur web, vignette à gauche sur mobile ; bouton « + » qui devient « − ».
- **Cartes réseaux** (communauté) : Ivoire, icône dans un rond Cuivre, nom en ATP Dizzy, précision en Anton Copper deep. WhatsApp en pleine largeur sur mobile.

### 7.4 Formulaires (C5)

- Champs en **pilule cerclée, 56 px**, label au-dessus. Focus : contour 2 px, fond Lilas. L'erreur s'écrit sous le champ, jamais seulement en couleur.
- Choix du tarif en **cartes radio** ; quantité en compteur − / + (max 10) ; cases de consentement rondes.
- Sur bande sombre : champs noirs cerclés d'Ivoire, CTA Cuivre « Payer … FCFA ».

### 7.5 Footer (C6)

Bloc marque Indigo (logo, « Évènement festif tourné vers l'amour de la musique électronique », CTA) + **très grandes tuiles réseaux** (Instagram Cuivre, TikTok Lilas, WhatsApp Pêche) + bloc liens Ivoire (La teuf · Aide · Écris-nous, mentions).

### 7.6 Espace interne : admin et influenceur (C7)

Fond Cosmic Black, cartes Indigo, pilules ; pas de bandeau, de sticker ni de footer. Chiffres en Cuivre ; **une seule carte Cuivre pleine par écran**, pour ce qui demande une action (ex. « Reste à verser »). Lignes de liste en pilules Cosmic Black dans une carte Indigo. Couleurs du scan : §2.4.

## 8. Patterns de l'accueil

| Pattern | Contenu |
|---|---|
| P1 Hero (Nuit) | Logo KARMA rooftop + date (« Ven. 27 nov. », « Lomé · Togo · À partir de 21 h »), titre « Passe le portail », ruban, photo, badge prix, CTA « Prendre ton billet » + « Voir plus », compte à rebours avec secondes. Aucun sticker. |
| P3 Ambiance (Violet) | Animation au scroll en 4 étapes (§9.3), web et mobile. |
| P2 Concept (Ivoire) | « Qu'est-ce que LA TEUF ? », intro courte, 3 cartes dépliables fermées. |
| P9 Prochains rendez-vous (Lilas) | Titre + sticker calendrier collé à droite (au-dessus sur mobile), cartes dates en quinconce. |
| P5 CTA billets (Cuivre) | « Early bird à 5 000 FCFA », bouton noir, sticker billet (centré au-dessus du titre sur mobile). |
| P10 Communauté (Nuit) | « Rejoins la communauté », 3 cartes réseaux, bloc newsletter Violet. Sans chiffres d'abonnés. |
| P11 | Bande géante LA TEUF + footer. |

Autres patterns : P4 line-up DJs, P6 galerie (mosaïque, « Toutes les photos »), P7 en-tête de page, P8 FAQ. Ordre de l'accueil (T1) : P1, P3, P2, P9, P5, P10, P11. Pas de galerie ni de contact sur l'accueil.

## 9. Mouvement

### 9.1 Principes (repris de slush.app)

- **Défilement** : Lenis, `lerp 0.12`, branché sur le ticker GSAP. Sur téléphone, le défilement tactile natif est gardé.
- **Courbes** : `slush` = `cubic-bezier(0.65, 0.05, 0, 1)` ; `slush-bounce` = léger dépassement puis retour (courbe élastique, voir `slush-motion.tsx`).
- **Apparitions** (déclenchées à 80 % de l'écran, une seule fois) :
  - titres : lignes qui pivotent en 3D (rotateY −45° → 0, z 5 em), 850 ms, décalage 150 ms ;
  - cartes : arrivent de biais (rotateY −30°), de loin (z 20 em) et en petit (×0,75), 850 ms ;
  - boutons et textes : montent de 3 em, 1 s ;
  - hero au chargement : lettres du titre qui glissent (−0,25 em), puis date, boutons, décompte et photo en cascade.
- Implémentation : `src/components/ds/slush-motion.tsx` (`SmoothScroll` dans l'habillage, `<Reveals />` à la fin de chaque page), attributs `data-heading-reveal`, `data-card-reveal`, `data-reveal-up`, `data-load-stagger`, `data-anim-slant`.

### 9.2 Interactions

| Élément | Comportement | Valeurs |
|---|---|---|
| Boutons | Bascule 3D de la face (§7.2) | 850 ms · rebond |
| Cartes cliquables | Légère pression | 96 % |
| Cartes dépliables | Hauteur qui s'ouvre vers le bas, texte qui descend légèrement en apparaissant | 650 ms · `slush` |
| Navigation | Liens qui remontent / redescendent (§7.1) | 750 ms · décalage 30 ms |
| Stickers | « Pop » à l'arrivée (0,6 → 1 + petite rotation), puis flottement continu ±6 px / ±2°, chacun à son rythme ; redressement à 0° au survol | pop 500 ms · flottement 5 s |
| Ruban du hero | Chaque mot et ✦ s'illumine de l'intérieur (dégradé blanc → Ivoire découpé par les lettres, jamais de halo), ✦ ×1,35 | 2,4 à 5,6 s, ordre aléatoire |
| Bandeau | Défilement continu vers la gauche | 40 s par cycle |

### 9.3 P3 « Le vaisseau ouvre la voie »

- La bande Violet reste fixe pendant 2 hauteurs d'écran de défilement, coupée en deux moitiés : **titre + trajectoire** et **vidéos sur toute la hauteur**.
- Le vaisseau part **en haut** et descend vers la planète le long de pointillés qui se dessinent derrière lui ; son nez suit la trajectoire ; sa position suit directement le défilement. Vaisseau et planète ne passent jamais sur les vidéos.
- 4 étapes : (1) vaisseau seul ; (2) « Notre ambiance » + vidéo 1 ; (3) « électrique te » + vidéo 2 qui prend la place de la 1 ; (4) « fait voyager » + vidéo 3, arrivée sur la planète. Repères : 22 %, 50 %, 78 %, 100 %.
- Chaque ligne monte de 0,35 em en apparaissant (600 ms) ; chaque vidéo se dévoile par-dessus la précédente de haut en bas (900 ms). Seule la vidéo visible joue (muette, en boucle).
- **Mobile** : moitié haute = trajectoire horizontale + titre, moitié basse = vidéos ; vaisseau, lignes et vidéos progressent de **gauche à droite**.
- Implémentation : `src/components/home/ambiance.tsx` ; storyboards dans Paper (Patterns, P3 web étapes 1 à 4 et mobile 4 étapes).

### 9.4 Mouvement réduit

Avec `prefers-reduced-motion` : défilement natif, bandeau et ruban figés, aucune apparition, stickers immobiles, P3 sans épinglage (tout visible, vaisseau posé près de la planète, pas de lecture automatique), boutons qui changent de couleur sans basculer.

## 10. Images et vidéos

- Photos aux couleurs naturelles des soirées, sans filtre ; rectangles arrondis (24, ou 32 pour la photo du hero) cerclés de 1 px.
- Ratios : 4:5 affiches et portraits, 4:3 visuels de cartes date sur mobile, 9:16 vidéos d'ambiance.
- **Vidéos** : lecture automatique **muette** autorisée seulement pour l'ambiance (P3) et quand elles sont visibles ; sinon lecture au clic. Images fixes avec reduced-motion.
- Portraits DJs détourés posés sur fonds Pêche / Lilas / Cuivre / Ivoire.
- Billet confirmé : pass façon Wallet, **QR sombre sur zone claire** pour la lecture au scan.

## 11. Pages (maquettes Paper)

Accueil, Événement KARMA (panneau d'achat collant, volet d'achat sur mobile), Billet confirmé, Tous les évènements, DJs (mur de portraits), Galerie (mosaïque), FAQ (une bande par rubrique), Contact (formulaire seul), pages légales (CGV, Mentions légales, Confidentialité : sommaire + texte 720 px, vouvoiement, sans sticker), admin (tableau de bord, achats, détail, codes promo, influenceurs, scan, connexion) et espace influenceur (connexion, tableau de bord). Les pages de contenu n'ont pas de bande géante LA TEUF (T4).

## 12. Accessibilité et performance

- Contraste WCAG AA pour chaque couple texte / fond (§2.5).
- Focus clavier visible (anneau Copper 2 px, décalé de 3 px), jamais supprimé ; les boutons qui basculent montrent aussi leur face au focus.
- Cibles tactiles ≥ 44 px ; texte courant jamais sous 16 px sur mobile.
- Mouvement réduit respecté partout (§9.4) ; textes alternatifs ; `font-display: swap`.
- Stickers et décors : `aria-hidden`. Cible Lighthouse mobile ≥ 90.

## 13. Migration du site

Terminée le 10/11/2026 :
1. Fondations : tokens, stickers (`public/stickers/`), logos (`public/brand/`), composants partagés `src/components/ds/`.
2. Page événement et billetterie (panneau d'achat collant, volet sur mobile, merci), sans changement de la logique de vente.
3. Accueil (avec l'intro du portail), Tous les évènements.
4. DJs, Galerie (mosaïque seule), FAQ, Contact (formulaire seul), pages légales ; textes anglais.
5. Admin et espace influenceur : habillage C7 (cartes 24 px, pilules, boutons qui basculent, logo).
6. Contrôles : types, lint, build, rendu web et mobile. Reste à faire : licences web des polices.

L'ancienne charte (encadrés Indigo, ciel étoilé, `hover-glow`, carrousel WebGL de la galerie, page `/design`, aperçu `/apercu`) est retirée du code.
