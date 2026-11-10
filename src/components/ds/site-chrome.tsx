import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { SmoothScroll } from "./slush-motion";

/** Marge de page 6 px (8 px dès 768 px) et 8 px entre les bandes (DESIGN.md §4) */
export const BAND_STACK = "flex flex-col gap-2 px-1.5 md:px-2";

/**
 * Habillage commun des pages v2 : bandeau d'annonce et navigation, pile de bandes, footer, défilement Lenis.
 * Le contenu de la page est une suite de <Band>, puis <GiantBand /> (pages vitrine seulement, pas les
 * pages de contenu T4) et enfin <Reveals /> (apparitions Slush).
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SmoothScroll />
      <SiteHeader />
      {/* overflow-x clip : les cartes arrivent de côté sans créer de défilement horizontal (et sans casser le sticky) */}
      <div className={`${BAND_STACK} overflow-x-clip pb-1.5 md:pb-2`}>
        <main id="contenu" tabIndex={-1} className="flex flex-col gap-2 outline-none">
          {children}
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
