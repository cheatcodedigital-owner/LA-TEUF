// Données d'exemple : sera remplacé par la table `djs` (Supabase), voir BRAINSTORMING §5.3.
// Portraits recadrés en 4:5 depuis ressources/photos/<NOM DU DJ>/ (nouvelles photos ; Manu Drums et
// Sweetlikemango gardent leur photo précédente, faute de nouvelle).
// ❓ Liens SoundCloud et Instagram à compléter.

export type DjKind = "dj" | "live";

export type Dj = {
  slug: string;
  name: string;
  /** Rôle affiché (libellé dans messages, Djs.kind.<kind>) */
  kind: DjKind;
  /** Portrait 4:5 dans public/images/djs (line-up) */
  photo: string;
  /** Second portrait, affiché dans le mur de portraits quand il existe */
  photo2?: string;
  soundcloud?: string;
  instagram?: string;
};

export const djs: Dj[] = [
  { slug: "shayn", name: "Shayn", kind: "dj", photo: "/images/djs/shayn.jpg", photo2: "/images/djs/shayn-2.jpg" },
  { slug: "ak2m", name: "AK2M", kind: "dj", photo: "/images/djs/ak2m.jpg", photo2: "/images/djs/ak2m-2.jpg" },
  { slug: "ivalmok", name: "Ivalmok", kind: "dj", photo: "/images/djs/ivalmok.jpg", photo2: "/images/djs/ivalmok-2.jpg" },
  { slug: "manu-drums", name: "Manu Drums", kind: "live", photo: "/images/djs/manu-drums.jpg" },
  { slug: "gogosky", name: "Gogosky", kind: "dj", photo: "/images/djs/gogosky.jpg", photo2: "/images/djs/gogosky-2.jpg" },
  { slug: "sweetlikemango", name: "Sweetlikemango", kind: "dj", photo: "/images/djs/sweetlikemango.jpg" },
  { slug: "mask", name: "Mask", kind: "dj", photo: "/images/djs/mask.jpg" },
  { slug: "vovoelectro", name: "Vovoelectro", kind: "dj", photo: "/images/djs/vovoelectro.jpg", photo2: "/images/djs/vovoelectro-2.jpg" },
];
