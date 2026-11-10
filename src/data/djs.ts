// Données d'exemple : sera remplacé par la table `djs` (Supabase), voir BRAINSTORMING §5.3.
// Portraits détourés repris de la maquette « DJs » (Paper), dans public/images/djs/cutouts/.
// ❓ Liens SoundCloud et Instagram à compléter.

export type DjKind = "dj" | "live";

export type Dj = {
  slug: string;
  name: string;
  /** Rôle affiché (libellé dans messages, Djs.kind.<kind>) */
  kind: DjKind;
  /** Portrait détouré (maquette Paper), posé sur `tint` dans le mur des DJs */
  portrait: string;
  tint: "copper-pale" | "violet-pale" | "solar-copper" | "warm-ivory" | "cosmic-black";
  soundcloud?: string;
  instagram?: string;
};

// Ordre et fonds repris de la maquette « DJs » (Paper)
export const djs: Dj[] = [
  { slug: "shayn", name: "Shayn", kind: "dj", portrait: "/images/djs/cutouts/shayn.png", tint: "copper-pale" },
  { slug: "ak2m", name: "AK2M", kind: "dj", portrait: "/images/djs/cutouts/ak2m.png", tint: "violet-pale" },
  { slug: "wafa", name: "Wafa", kind: "dj", portrait: "/images/djs/cutouts/wafa.png", tint: "solar-copper" },
  { slug: "famouz", name: "Famouz", kind: "dj", portrait: "/images/djs/cutouts/famouz.png", tint: "warm-ivory" },
  { slug: "ivalmok", name: "Ivalmok", kind: "dj", portrait: "/images/djs/cutouts/ivalmok.png", tint: "violet-pale" },
  { slug: "manu-drums", name: "Manu Drums", kind: "live", portrait: "/images/djs/cutouts/manu-drums.jpg", tint: "cosmic-black" },
  { slug: "gogosky", name: "Gogosky", kind: "dj", portrait: "/images/djs/cutouts/gogosky.png", tint: "copper-pale" },
  { slug: "sweetlikemango", name: "Sweetlikemango", kind: "dj", portrait: "/images/djs/cutouts/sweetlikemango.png", tint: "warm-ivory" },
  { slug: "mask", name: "Mask", kind: "dj", portrait: "/images/djs/cutouts/mask.png", tint: "solar-copper" },
  { slug: "vovoelectro", name: "Vovoelectro", kind: "dj", portrait: "/images/djs/cutouts/vovoelectro.png", tint: "violet-pale" },
];
