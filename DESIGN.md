# LA TEUF — Design system

> Complète `BRAINSTORMING.md` (§2, §3, §6). Décisions prises pas à pas le 21/10/2026.
> Légende : ✅ décidé · ❓ à trancher · ⚠️ point de vigilance.

## 1. Direction

- **Ambiance** ✅ : sombre immersif avec touches éditoriales. Fond sombre dominant, sections Ivory pour respirer (concept, boutique, infos pratiques, légal).
- **Densité** ✅ : équilibrée, une idée forte par section, mobile first.
- **Signature** ✅ : la **typographie** et le **trou de serrure graphique**. Photos et visuels génératifs habillent, ils ne portent pas l'identité.
- **Thème** ✅ : sombre par défaut + sections Ivory. Pas de bascule clair/sombre utilisateur.

## 2. Couleurs

Tokens de la charte (voir BRAINSTORMING §3) :

| Token | Hex | Rôle |
|---|---|---|
| `cosmic-black` | `#090A10` | Fond de page (≈ 60 %) |
| `deep-indigo` | `#202052` | Cartes, sections, champs (≈ 20 %) |
| `warm-ivory` | `#F3E9D5` | Texte sur sombre, fond des sections claires (≈ 12 %) |
| `solar-copper` | `#E66C3F` | Titres forts, dates, prix, **CTA** |
| `ultraviolet` | `#7655FF` | Lueurs, survols, états actifs, éléments décoratifs |

Règles ✅ :
- Copper et Ultraviolet ont des **rôles séparés** et ne se combinent jamais sur un même élément.
- Fonds en **aplats nets**, sans grain ni dégradé. L'effet vient de la typo, du portail et de la lueur au survol.
- **Sections Ivory** : texte Deep Indigo, accents Copper.
- **Electric Aqua retiré du site** (21/10/2026) : le Copper porte aussi les CTA, pour plus d'homogénéité.
- **CTA** : Copper plein, texte Cosmic Black, forme pilule.

⚠️ Contrastes (estimations à vérifier avec un outil WCAG avant intégration) :
- Ivory sur Cosmic Black : très élevé, OK partout.
- Deep Indigo sur Ivory : élevé, OK partout.
- Copper `#E66C3F` sur Cosmic Black : ≈ 6:1, OK.
- **Copper `#E66C3F` sur Ivory : ≈ 2,6:1, insuffisant même pour les grands titres.** Proposition ❓ : token `copper-deep` ≈ `#A8451A` (≈ 4,9:1) réservé aux accents sur fond Ivory.
- Ultraviolet sur Cosmic Black : ≈ 4,3:1. Réserver aux éléments d'interface et aux grands textes, pas au texte courant.

États ❓ : succès / erreur / avertissement du scan (vert, rouge, orange, voir BRAINSTORMING §5.1) à définir comme couleurs fonctionnelles propres à l'admin, hors palette de marque.

## 3. Typographie

| Police | Rôle ✅ | Casse |
|---|---|---|
| **ATP Dizzy** (ronde, groovy) | **H1 du hero**, titres de section (H2/H3), accents expressifs | Normale |
| **Tropic Ground** (serif décoratif) | Citations, mots d'accroche | Normale |
| **Anton** (condensée) | Dates, prix, compte à rebours, étiquettes de statut, boutons | MAJUSCULES |
| **Pain de Mie** | Texte courant, formulaires, mentions légales | Normale |

- **Hero mobile** ✅ : XXL, ≈ 56 à 72 px, 2 ou 3 lignes.
- **Effet** ✅ : un **mot-clé du titre en couleur** (Copper sur sombre, Copper deep sur Ivory), le reste en Ivory ou Indigo.
- Échelle indicative ❓ (à finaliser en `clamp()`) : H1 56–72 · H2 36–48 · H3 24–28 · corps 16–18 · petit 13–14.
- ⚠️ Fichiers : `ressources/textes/Fonts/` (`TropicGround-Regular.otf`, `ATP-Dizzy.otf`, `Anton.otf`, `Pain de Mie.otf`). À convertir en WOFF2 et à charger via `next/font/local`. **Licences web à vérifier.**
- ⚠️ Vérifier que Tropic Ground et ATP Dizzy couvrent les accents français et les caractères utiles (é, è, ç, œ, ’, «»).

## 4. Formes et matière

- **Rayons** ✅ : boutons et champs en **pilule** (`rounded-full`), cartes et visuels en grands rayons (24 à 32 px).
- **Surfaces** ✅ : cartes **Deep Indigo pleines, sans bordure**. Chaque section est un **encadré arrondi** (Deep Indigo ou Ivory) dans une page de largeur limitée ; les éléments internes (cartes, champs) passent en Cosmic Black.
- **Profondeur** ✅ : aucune ombre. **Lueur Ultraviolet au survol** seulement sur les éléments interactifs.
- **Trou de serrure dans l'interface** ✅ :
  - curseur personnalisé (desktop) et puces de listes ;
  - **filigrane géant** très discret derrière certaines sections.
  - Non retenus pour l'instant : masque sur les photos, séparateurs de sections. L'intro portail (BRAINSTORMING §6) reste inchangée.
- Assets : `ressources/inspirations/Serrure Keyhole.png`, `Serrure.png`. Prévoir une version SVG.

## 5. Grille et espacements

- **Mise en page** ✅ : page de **largeur limitée** (≈ 1152 px) centrée, sections en encadrés arrondis séparés de 24 à 32 px. Texte courant contenu (≈ 720 px).
- **Rythme vertical** ✅ : **respirant**, 64 px mobile, 96 à 128 px desktop entre sections.
- **Échelle d'espacement** ❓ : base 4 px (4, 8, 12, 16, 24, 32, 48, 64, 96, 128).
- **Navigation mobile** ✅ : menu plein écran animé + **CTA Billets Copper toujours visible**.
- **Navigation desktop** ✅ : barre qui **se cache en descendant et réapparaît en remontant**, sélecteur FR/EN. Fond transparent en haut de page.

## 6. Composants clés

| Composant | Décision ✅ |
|---|---|
| **Bouton CTA** | Pilule Copper pleine, texte Anton MAJUSCULES Cosmic Black |
| **Bouton secondaire** | Pilule transparente ou Indigo, texte Ivory |
| **Carte événement** | Affiche verticale 4:5, puis date Anton en Copper, lieu, badge de statut (`Bientôt`, `En vente`, `Complet`, `Terminé`), bouton |
| **Tunnel billetterie** | Un seul panneau (bottom sheet sur mobile, panneau latéral sur desktop), étapes visibles : tarif, infos acheteur, code promo, paiement |
| **Champs** | Pilule remplie Indigo, label flottant, erreurs sous le champ |
| **Billet confirmé** | Pass façon Wallet : carte arrondie, infos en haut, QR en bas |
| **Fiche DJ** ❓ | Photo en rectangle arrondi, nom en ATP Dizzy, liens SoundCloud et Instagram |

⚠️ Billet : le **QR doit être sombre sur fond Ivory** (zone claire dédiée) pour une lecture fiable au scan, même si le reste du pass est sombre.

## 7. Mouvement

- **Personnalité** ✅ : organique et ondulante, rebonds légers, sensation de vibration.
- **Scroll** ✅ : les **titres se révèlent mot par mot ou ligne par ligne**.
- **Survol** ✅ : lueur Ultraviolet + zoom de 2 à 3 %.
- **Durées** ❓ : micro-interactions 200 à 300 ms, révélations 500 à 800 ms.
- **Dégradation** ✅ : version simplifiée **automatique** avec `prefers-reduced-motion` et sur appareil modeste. Le site reste complet.

## 8. Images et vidéos

- **Photos** ✅ : couleurs naturelles de la soirée, sans filtre de marque.
- **Cadrage** ✅ : rectangles aux coins arrondis, **ratios fixes** : 4:5 affiches, 16:9 vidéos, 9:16 stories.
- **Vidéos** ✅ : **aucun autoplay**, lecture au clic. Le hero utilise une image de poster. ⚠️ Cela diverge de BRAINSTORMING §4 (« visuel ou vidéo d'ambiance ») : le hero est donc une photo ou une affiche, avec la vidéo en option au clic.
- **Placeholders** ✅ : mockups réalistes provisoires (T-shirts, silhouettes DJs), remplaçables depuis l'admin.

## 9. Accessibilité et performance

- Contraste WCAG AA vérifié pour chaque couple texte/fond (voir §2).
- Focus clavier visible : anneau Copper, jamais supprimé.
- Cibles tactiles ≥ 44 px.
- Animations désactivables, textes alternatifs, `font-display: swap`.
- Cible Lighthouse mobile ≥ 90.

## 10. Prochaines étapes

1. Valider ce document, en particulier ❓ (échelle de tailles, `copper-deep`, durées).
2. Analyser 2 à 4 références Dribbble / Mobbin à partir de captures, pour affiner la carte événement, le tunnel billetterie et le hero.
3. Traduire en tokens Tailwind (`tailwind.config`, variables CSS) pendant la phase 1 du plan (BRAINSTORMING §11).
4. Construire une **page de démonstration des composants** pour valider le rendu avant les pages réelles.
