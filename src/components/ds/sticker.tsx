import Image from "next/image";

/**
 * Sticker décoratif incliné (DESIGN.md §6.1). PNG de `public/stickers/`, contour déjà dessiné,
 * exporté à 2× sa taille d'affichage et servi tel quel (`unoptimized`) pour rester net.
 * Trois couches : la boîte se place et « pop » à l'arrivée (GSAP, slush-motion.tsx), le milieu
 * flotte en continu (±6 px, ±2°), l'image porte l'inclinaison et se redresse au survol.
 * `inFlow` : sticker dans le flux de la page (sinon positionné en absolu par `className`).
 */
export function Sticker({
  src,
  className,
  rotate,
  width = 400,
  height = 400,
  inFlow = false,
}: {
  src: string;
  className: string;
  /** inclinaison en degrés, entre −10 et +10 */
  rotate: number;
  width?: number;
  height?: number;
  inFlow?: boolean;
}) {
  // Décalage du flottement propre à chaque sticker, pour qu'ils ne bougent pas en même temps
  const delay = `${-((Math.abs(rotate) * 7) % 50) / 10}s`;
  return (
    <span data-sticker aria-hidden className={`sticker ${inFlow ? "relative" : "absolute"} ${className}`}>
      <span className="sticker-float block size-full" style={{ animationDelay: delay }}>
        <Image
          src={src}
          alt=""
          width={width}
          height={height}
          unoptimized
          draggable={false}
          className="sticker-img size-full select-none object-contain"
          style={{ "--r": `${rotate}deg` } as React.CSSProperties}
        />
      </span>
    </span>
  );
}
