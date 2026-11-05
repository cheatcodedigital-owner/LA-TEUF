"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { GalleryPhoto } from "@/data/gallery";

type Labels = { open: string; close: string; previous: string; next: string };

// Mosaïque (colonnes CSS, proportions d'origine) et visionneuse plein écran en <dialog> natif :
// Échap ferme, le focus reste piégé dans la fenêtre, flèches pour naviguer.
export function PhotoGrid({ photos, alts, labels }: { photos: GalleryPhoto[]; alts: string[]; labels: Labels }) {
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
    "hover-glow inline-flex h-12 w-12 items-center justify-center rounded-full bg-cosmic-black/80 font-label text-xl text-warm-ivory";

  return (
    <>
      <ul className="columns-1 gap-3 sm:columns-2 md:gap-5 lg:columns-3">
        {photos.map((p, i) => (
          <li key={p.src} className="mb-3 break-inside-avoid md:mb-5">
            <button
              type="button"
              onClick={() => open(i)}
              aria-haspopup="dialog"
              aria-label={`${labels.open} : ${alts[i] ?? ""}`}
              className="group block w-full overflow-hidden rounded-card bg-deep-indigo"
            >
              <Image
                src={p.src}
                alt=""
                width={p.width}
                height={p.height}
                sizes="(min-width: 1152px) 360px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="h-auto w-full transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-label={current ? alts[index!] : undefined}
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-cosmic-black/90 backdrop:backdrop-blur-sm"
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
              className="pointer-events-auto h-auto max-h-[78dvh] w-auto max-w-full rounded-card object-contain"
            />
            <p className="max-w-xl text-center text-warm-ivory/80">{alts[index!]}</p>
            <div className="pointer-events-auto flex items-center gap-3">
              <button type="button" onClick={() => step(-1)} aria-label={labels.previous} className={control}>
                ←
              </button>
              <span className="min-w-16 text-center font-label tracking-widest text-warm-ivory/70">
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
