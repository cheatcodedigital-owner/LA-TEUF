import { Link } from "@/i18n/navigation";

/** Couleurs des deux faces d'un bouton : `face` au repos, `back` qui bascule au survol (DESIGN.md §7.2) */
export const flip = {
  copper: { face: "bg-solar-copper text-cosmic-black", back: "bg-warm-ivory text-cosmic-black border border-cosmic-black" },
  /* Navigation : fond plein pour rester lisible au-dessus des bandes claires */
  nav: { face: "bg-cosmic-black border border-warm-ivory text-warm-ivory", back: "bg-solar-copper text-cosmic-black border border-cosmic-black" },
  outlineDark: { face: "border border-warm-ivory text-warm-ivory", back: "bg-solar-copper text-cosmic-black border border-cosmic-black" },
  outlineLight: { face: "border border-cosmic-black text-cosmic-black", back: "bg-cosmic-black text-warm-ivory" },
  black: { face: "bg-cosmic-black text-solar-copper", back: "bg-violet-pale text-cosmic-black border border-cosmic-black" },
  /* Noir à texte Ivoire : CTA sur la bande Cuivre et dans le menu mobile */
  blackIvory: { face: "bg-cosmic-black text-warm-ivory", back: "bg-violet-pale text-cosmic-black border border-cosmic-black" },
  ivory: { face: "bg-warm-ivory text-violet-deep", back: "bg-solar-copper text-cosmic-black border border-cosmic-black" },
} as const;

export type FlipTone = keyof typeof flip;

type FlipProps = {
  children: React.ReactNode;
  tone: FlipTone;
  /** hauteur, marges et taille du texte, communes aux deux faces */
  size: string;
  className?: string;
} & (
  | { href: string; external?: boolean; onClick?: () => void; /** page en cours (navigation) */ current?: boolean }
  | { href?: undefined; type?: "button" | "submit"; onClick?: () => void; disabled?: boolean }
);

/**
 * Bouton pilule qui bascule en 3D au survol, comme slush.app (voir .flip-btn dans globals.css).
 * Lien interne via la navigation next-intl (garde la langue), lien externe ou <button>.
 */
export function Flip(props: FlipProps) {
  const { children, tone, size, className = "", onClick } = props;
  const outer = `flip-btn font-label uppercase tracking-[0.04em] ${className}`;
  const faces = (
    <>
      <span className={`flip-face flip-front ${size} ${flip[tone].face}`}>{children}</span>
      <span aria-hidden className={`flip-face flip-back ${size} ${flip[tone].back}`}>
        {children}
      </span>
    </>
  );
  if (props.href !== undefined) {
    return props.external ? (
      <a href={props.href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={outer}>
        {faces}
      </a>
    ) : (
      <Link href={props.href} onClick={onClick} aria-current={props.current ? "page" : undefined} className={outer}>
        {faces}
      </Link>
    );
  }
  return (
    <button type={props.type ?? "button"} onClick={onClick} disabled={props.disabled} className={`${outer} disabled:opacity-50`}>
      {faces}
    </button>
  );
}
