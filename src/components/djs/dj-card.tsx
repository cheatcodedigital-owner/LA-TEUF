import Image from "next/image";

const tintBg = {
  "copper-pale": "bg-copper-pale",
  "violet-pale": "bg-violet-pale",
  "solar-copper": "bg-solar-copper",
  "warm-ivory": "bg-warm-ivory",
  "cosmic-black": "bg-cosmic-black",
} as const;

export type DjTint = keyof typeof tintBg;

/**
 * Carte DJ (mur des DJs, line-up d'un événement) : portrait détouré sur un fond de la charte,
 * pastille de rôle, nom en ATP Dizzy. Une carte sur deux descend de 48 px (`offset`) sur grand écran.
 */
export function DjCard({
  name,
  photo,
  tint,
  role,
  live = false,
  offset = false,
  className = "h-[220px] md:h-[316px]",
}: {
  name: string;
  photo: string;
  tint: DjTint;
  role: string;
  live?: boolean;
  offset?: boolean;
  /** hauteur du portrait */
  className?: string;
}) {
  return (
    <figure data-card-reveal="card" className={`flex min-w-0 flex-col gap-3 ${offset ? "md:pt-12" : ""}`}>
      <div className={`relative overflow-hidden rounded-[24px] border border-warm-ivory ${tintBg[tint]} ${className}`}>
        <Image
          src={photo}
          alt={name}
          fill
          sizes="(min-width: 1024px) 260px, 50vw"
          className={live ? "object-cover" : "object-cover object-top"}
        />
        <span
          className={`absolute left-3.5 top-3.5 flex h-7 items-center rounded-full px-3 font-label text-[12px] uppercase leading-4 tracking-[0.04em] ${
            live ? "bg-solar-copper text-cosmic-black" : "bg-cosmic-black text-warm-ivory"
          }`}
        >
          {role}
        </span>
      </div>
      <figcaption className="font-title text-[26px] leading-none text-warm-ivory md:text-[34px]">{name}</figcaption>
    </figure>
  );
}
