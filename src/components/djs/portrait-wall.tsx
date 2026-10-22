"use client";

import Image from "next/image";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  type MotionValue,
  easeIn,
  easeOut,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

export type WallPortrait = {
  name: string;
  caption: string;
  src: string;
};

// Placement déterministe (identique serveur et client) : un portrait par rangée, un
// second toutes les trois rangées, colonnes parcourues en quinconce. -1 = case vide.
function buildLayout(count: number, cols: number): number[][] {
  const rows: number[][] = [];
  let i = 0;
  for (let r = 0; i < count; r++) {
    const row = new Array<number>(cols).fill(-1);
    const a = (r * 2 + (r % 2)) % cols;
    row[a] = i++;
    if (r % 3 === 0 && i < count) {
      let b = (a + 2) % cols;
      if (b === a) b = (a + 1) % cols;
      row[b] = i++;
    }
    rows.push(row);
  }
  return rows;
}

// Commence à `desired` pour que le premier rendu client corresponde au HTML serveur,
// puis réduit à 3 colonnes (≥ 640 px) ou 2 (mobile) pour garder des portraits lisibles.
function useColumns(desired: number) {
  const [cols, setCols] = useState(desired);
  useEffect(() => {
    const sm = window.matchMedia("(min-width: 640px)");
    const lg = window.matchMedia("(min-width: 1024px)");
    const update = () => setCols(lg.matches ? desired : Math.min(desired, sm.matches ? 3 : 2));
    update();
    sm.addEventListener("change", update);
    lg.addEventListener("change", update);
    return () => {
      sm.removeEventListener("change", update);
      lg.removeEventListener("change", update);
    };
  }, [desired]);
  return cols;
}

// Chaque portrait grandit depuis son coin en entrant dans l'écran, culmine au centre
// puis se rétracte en sortant. Transformations seulement (pas de reflow).
function Portrait({ portrait, origin, still }: { portrait: WallPortrait; origin: string; still: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 0], { ease: [easeOut, easeIn] });

  return (
    <motion.div
      ref={ref}
      className="group relative h-full w-full"
      style={{ transformOrigin: origin, scale: still ? 1 : scale }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[22px] bg-deep-indigo">
        <Image
          src={portrait.src}
          alt=""
          fill
          sizes="(min-width: 1024px) 280px, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
        />
      </div>
      <p className="absolute inset-x-1 top-full mt-2 flex justify-between gap-2 font-label text-xs uppercase tracking-widest sm:text-sm">
        <span className="truncate">{portrait.name}</span>
        <span className="shrink-0 text-warm-ivory/60">{portrait.caption}</span>
      </p>
    </motion.div>
  );
}

function FadingHint({ progress, children }: { progress: MotionValue<number>; children: ReactNode }) {
  const opacity = useTransform(progress, [0, 0.08], [1, 0]);
  return (
    <motion.div
      aria-hidden
      style={{ opacity }}
      className="pointer-events-none absolute left-1/2 top-[calc(50svh+5rem)] -translate-x-1/2 text-center"
    >
      <span className="relative block max-w-[16ch] font-label text-xs uppercase leading-snug tracking-widest text-warm-ivory/60 after:absolute after:left-1/2 after:top-full after:mt-3 after:h-16 after:w-px after:bg-gradient-to-b after:from-warm-ivory/50 after:to-transparent">
        {children}
      </span>
    </motion.div>
  );
}

// Mur de portraits au scroll, inspiré de « scroll-portrait-wall » : titre collant qui
// s'inverse (mix-blend-difference) au passage des photos. Sur fond Cosmic Black, la
// différence garde l'Ivory intact hors des photos. Le mur est décoratif (aria-hidden) :
// la liste accessible des artistes est rendue à part par la page.
export function PortraitWall({
  title,
  subtitle,
  hint,
  portraits,
  columns = 4,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  hint?: ReactNode;
  portraits: WallPortrait[];
  columns?: number;
}) {
  const root = useRef<HTMLElement>(null);
  const still = useReducedMotion() ?? false;
  const cols = useColumns(Math.max(1, columns));
  const layout = useMemo(() => buildLayout(portraits.length, cols), [portraits.length, cols]);
  const { scrollYProgress } = useScroll({ target: root, offset: ["start start", "end start"] });

  return (
    <section
      ref={root}
      className="relative overflow-clip rounded-card border border-frame-line bg-cosmic-black px-3 md:px-6"
    >
      {hint && !still && <FadingHint progress={scrollYProgress}>{hint}</FadingHint>}

      <div className="pointer-events-none sticky top-1/2 z-20 -translate-y-1/2 px-2 text-center text-warm-ivory mix-blend-difference">
        <h1 className="font-title text-[clamp(3.5rem,14vw,10rem)] leading-[0.95]">{title}</h1>
        {subtitle && (
          <p className="mt-3 font-label text-sm uppercase tracking-widest text-warm-ivory/70 md:text-base">
            {subtitle}
          </p>
        )}
      </div>

      <div aria-hidden className="relative z-0 mb-[50svh] mt-[50svh]">
        {layout.map((row, ri) => (
          <div key={ri} className="flex w-full">
            {row.map((idx, ci) => (
              <div key={ci} className="min-w-0 flex-1 p-2 pb-10 md:p-3 md:pb-12">
                <div className="aspect-[4/5]">
                  {idx !== -1 && (
                    <Portrait
                      portrait={portraits[idx]}
                      origin={ci < cols / 2 ? "right bottom" : "left bottom"}
                      still={still}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
