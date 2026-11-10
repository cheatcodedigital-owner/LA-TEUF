/**
 * Les 7 duos de section (DESIGN.md §2.2) : fond + texte, contour 1 px, et couleur du mot-clé.
 * Jamais deux bandes du même duo à la suite ; une seule couleur vive par bande.
 */
export const duos = {
  nuit: { surface: "bg-cosmic-black text-warm-ivory", line: "border-warm-ivory", accent: "text-solar-copper" },
  cuivre: { surface: "bg-solar-copper text-cosmic-black", line: "border-cosmic-black", accent: "text-cosmic-black" },
  ivoire: { surface: "bg-warm-ivory text-deep-indigo", line: "border-cosmic-black", accent: "text-copper-deep" },
  indigo: { surface: "bg-deep-indigo text-warm-ivory", line: "border-warm-ivory", accent: "text-solar-copper" },
  /* Sur Pêche, le Copper deep n'atteint que 3,9:1 : mot-clé en grands corps seulement (≥ 24 px) */
  peche: { surface: "bg-copper-pale text-deep-indigo", line: "border-cosmic-black", accent: "text-copper-deep" },
  lilas: { surface: "bg-violet-pale text-deep-indigo", line: "border-cosmic-black", accent: "text-violet-deep" },
  /* Sur Violet profond, jamais de Copper : accent Lilas */
  violet: { surface: "bg-violet-deep text-warm-ivory", line: "border-warm-ivory", accent: "text-violet-pale" },
} as const;

export type Duo = keyof typeof duos;

/**
 * Bande pleine largeur aux coins arrondis (24 px sur mobile, 40 px dès 768 px), contour 1 px.
 * Les marges de page et l'écart entre bandes viennent de SiteChrome (`BAND_STACK`).
 * `line` remplace la couleur du contour (ex. `border-warm-ivory/25`), `false` le retire.
 */
export function Band({
  duo,
  as: Tag = "section",
  line,
  className = "",
  children,
  ...rest
}: {
  duo: Duo;
  as?: "section" | "div" | "header" | "aside";
  line?: string | false;
  className?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">) {
  const border = line === false ? "" : `border ${line ?? duos[duo].line}`;
  return (
    <Tag className={`relative rounded-band md:rounded-band-lg ${border} ${duos[duo].surface} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
