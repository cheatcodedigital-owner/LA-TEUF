// Données d'exemple : sera remplacé par la table `djs` (Supabase), voir BRAINSTORMING §5.3.
// Portraits recadrés depuis ressources/photos/<NOM DU DJ>/.
// ❓ Liens SoundCloud et Instagram à compléter.

export type DjKind = "dj" | "live";

export type Dj = {
  slug: string;
  name: string;
  /** Rôle affiché (libellé dans messages, Djs.kind.<kind>) */
  kind: DjKind;
  /** Portrait 4:5 dans public/images/djs */
  photo: string;
  soundcloud?: string;
  instagram?: string;
};

export const djs: Dj[] = [
  { slug: "shayn", name: "Shayn", kind: "dj", photo: "/images/djs/shayn.jpg" },
  { slug: "ak2m", name: "AK2M", kind: "dj", photo: "/images/djs/ak2m.jpg" },
  { slug: "ivalmok", name: "Ivalmok", kind: "dj", photo: "/images/djs/ivalmok.jpg" },
  { slug: "manu-drums", name: "Manu Drums", kind: "live", photo: "/images/djs/manu-drums.jpg" },
  { slug: "gogosky", name: "Gogosky", kind: "dj", photo: "/images/djs/gogosky.jpg" },
  { slug: "sweetlikemango", name: "Sweetlikemango", kind: "dj", photo: "/images/djs/sweetlikemango.jpg" },
  { slug: "mask", name: "Mask", kind: "dj", photo: "/images/djs/mask.jpg" },
  { slug: "vovoelectro", name: "Vovoelectro", kind: "dj", photo: "/images/djs/vovoelectro.jpg" },
];
