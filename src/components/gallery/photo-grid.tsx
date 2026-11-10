"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { GalleryPhoto } from "@/data/gallery";

type Labels = { open: string; close: string; previous: string; next: string };

// Mosaïque (maquette « Galerie ») : grille de vignettes 3:2, les photos verticales occupent deux rangées,
// `children` (carte « La prochaine ») ferme la grille. Visionneuse plein écran en <dialog> natif :
// Échap ferme, le focus reste piégé dans la fenêtre, flèches pour naviguer.
export function PhotoGrid({
  photos,
  alts,
  labels,
  children,
}: {
  photos: GalleryPhoto[];
  alts: string[];
  labels: Labels;
  children?: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);

  const open = (i: number) => {
    setIndex(i);
    dialog.current?.showModal();
  };
  const step = (d: number) => setIndex((i) => (i === null ? i : (i + d + photos.length) % photos.length));

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    const onClose = () => setIndex(null);
    el.addEventListener("keydown", onKey);
    el.addEventListener("close", onClose);
    return () => {
      el.removeEventListener("keydown", onKey);
      el.removeEventListener("close", onClose);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- step ne dépend que du nombre de photos
  }, [photos.length]);

  const current = index === null ? null : photos[index];
  const control =
    "press inline-flex size-12 items-center justify-center rounded-full border border-warm-ivory bg-cosmic-black font-label text-xl text-warm-ivory";

  return (
    <>
      <ul data-card-reveal="wrap" className="grid grid-flow-dense grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
        {photos.map((p, i) => {
          const portrait = p.height > p.width;
          return (
            <li key={p.src} data-card-reveal="card" className={portrait ? "row-span-2" : "aspect-[3/2]"}>
              <button
                type="button"
                onClick={() => open(i)}
                aria-haspopup="dialog"
                aria-label={`${labels.open} : ${alts[i] ?? ""}`}
                className="group relative block size-full overflow-hidden rounded-[16px] border border-cosmic-black bg-deep-indigo"
              >
                <Image
                  src={p.src}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.65,0.05,0,1)] group-hover:scale-[1.04] motion-reduce:transition-none"
                />
              </button>
            </li>
          );
        })}
        {children && (
          <li data-card-reveal="card" className="col-span-2 lg:col-span-1">
            {children}
          </li>
        )}
      </ul>

      <dialog
        ref={dialog}
        aria-label={current ? alts[index!] : undefined}
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-cosmic-black/92"
      >
        {current && (
          <div className="pointer-events-none flex h-full flex-col items-center justify-center gap-4 p-4 md:p-10">
            <Image
              key={current.src}
              src={current.src}
              alt={alts[index!] ?? ""}
              width={current.width}
              height={current.height}
              sizes="100vw"
              className="pointer-events-auto h-auto max-h-[78dvh] w-auto max-w-full rounded-[24px] border border-warm-ivory object-contain"
            />
            <p className="max-w-xl text-center font-body text-[15px] text-warm-ivory">{alts[index!]}</p>
            <div className="pointer-events-auto flex items-center gap-3">
              <button type="button" onClick={() => step(-1)} aria-label={labels.previous} className={control}>
                ←
              </button>
              <span className="min-w-16 text-center font-label tracking-[0.06em] text-warm-ivory">
                {index! + 1} / {photos.length}
              </span>
              <button type="button" onClick={() => step(1)} aria-label={labels.next} className={control}>
                →
              </button>
            </div>
            <button
              type="button"
              autoFocus
              onClick={() => dialog.current?.close()}
              aria-label={labels.close}
              className={`${control} pointer-events-auto absolute right-4 top-4`}
            >
              ✕
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
