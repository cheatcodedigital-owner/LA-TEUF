"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { CircularGallery, type GalleryItem } from "./circular-gallery";

// Galerie circulaire WebGL avec repli : tant que le rendu WebGL n'est pas prêt, la zone garde sa hauteur ;
// s'il échoue (WebGL indisponible), la grille HTML passée en `children` prend le relais.
export function GalleryShowcase({
  items,
  hint,
  children,
}: {
  items: GalleryItem[];
  hint: string;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onError = useCallback(() => rootRef.current?.setAttribute("data-failed", ""), []);

  return (
    <div ref={rootRef} className="group">
      <div className="group-data-[failed]:hidden">
        <div className="h-[24rem] sm:h-[28rem] md:h-[34rem]">
          <CircularGallery items={items} bend={2.5} borderRadius={0.06} scrollEase={0.05} onError={onError} />
        </div>
        <p className="mt-4 text-center font-label text-sm uppercase tracking-wider text-deep-indigo/70">{hint}</p>
      </div>
      <div className="hidden group-data-[failed]:block">{children}</div>
    </div>
  );
}
