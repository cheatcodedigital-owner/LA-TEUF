import { Band } from "./band";
import { Sticker } from "./sticker";

/**
 * P7 En-tête de page (Nuit) : titre géant avec un mot-clé Copper, sticker en haut à droite
 * (à droite du titre sur mobile), puis un contenu libre (intro, sommaire, filtres…).
 * Le titre glisse lettre par lettre au chargement (data-anim-slant, un seul par page).
 */
export function PageHeader({
  title,
  sticker,
  surtitle,
  children,
}: {
  /** Titre déjà mis en forme : utiliser `<span className="block md:inline">` pour couper la ligne sur mobile */
  title: React.ReactNode;
  sticker?: { src: string; rotate: number; width?: number; height?: number };
  /** Seule exception à la règle « pas de surtitre » : « Informations légales » (pages légales) */
  surtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <Band duo="nuit" line="border-warm-ivory/24" className="flex flex-col gap-4 px-[18px] pb-6 pt-5 md:gap-6 md:px-12 md:pb-14 md:pt-24">
      {surtitle && (
        <p data-load-stagger className="font-label text-[13px] uppercase tracking-[0.08em] text-solar-copper md:text-[14px]">
          {surtitle}
        </p>
      )}
      <div className="flex items-end justify-between gap-1.5">
        <h1
          data-anim-slant
          className={`min-w-0 flex-1 font-title text-[52px] leading-[90%] tracking-[-0.03em] md:text-[clamp(88px,10.4vw,150px)] ${
            sticker ? "md:pr-[200px] lg:pr-[260px]" : ""
          }`}
        >
          {title}
        </h1>
        {sticker && (
          <Sticker
            src={sticker.src}
            rotate={sticker.rotate}
            width={sticker.width ?? 440}
            height={sticker.height ?? 440}
            inFlow
            className="block size-20 shrink-0 md:absolute md:right-12 md:top-10 md:size-40 lg:right-[90px] lg:size-[220px]"
          />
        )}
      </div>
      {children}
    </Band>
  );
}

/** Coupure de ligne du titre sur mobile seulement (SplitText garderait un <br> sur grand écran) */
export const mobileLine = (c: React.ReactNode) => <span className="block md:inline">{c}</span>;
/** Mot-clé Copper d'un titre sur fond sombre */
export const copperWord = (c: React.ReactNode) => <span className="text-solar-copper">{c}</span>;
