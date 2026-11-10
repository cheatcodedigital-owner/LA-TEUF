"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

/*
 * P3 « Le vaisseau ouvre la voie » : la bande reste fixe pendant le scroll et le vaisseau
 * descend vers la planète en 4 étapes, synchronisées avec le texte et les vidéos.
 *   1. on voit seulement le vaisseau qui part ;
 *   2. « Notre ambiance » + vidéo 1, qui remplit une moitié de la bande de haut en bas ;
 *   3. « électrique te » + vidéo 2, qui prend la place de la vidéo 1 ;
 *   4. « fait voyager » + vidéo 3 ; le vaisseau rejoint la planète.
 * Grand écran : texte et vaisseau à gauche (axe vertical), vidéos à droite.
 * Mobile : même découpage en deux moitiés, texte et vaisseau progressent de gauche à droite.
 * Reduced-motion : tout est visible, vaisseau posé près de la planète, pas de lecture automatique.
 */

const videos = [1, 2, 3].map((i) => ({
  src: `/videos/ambiance-slide-${i}.mp4`,
  poster: `/videos/ambiance-slide-${i}.jpg`,
}));
const groups = [
  <>Notre ambiance</>,
  <>
    <span className="text-violet-pale">électrique</span> te
  </>,
  <>fait voyager</>,
];
// Étapes 2, 3, 4 ; le vaisseau touche la planète à 100 %
const THRESHOLDS = [0.22, 0.5, 0.78];

type Dir = "v" | "h";
type Pt = readonly [number, number];
// Trajectoires : repère 200 × 1000 (vertical, grand écran) et 1000 × 200 (horizontal, mobile)
const PATHS: Record<Dir, { vb: [number, number]; pts: readonly [Pt, Pt, Pt, Pt]; planet: Pt }> = {
  v: { vb: [200, 1000], pts: [[100, 85], [190, 300], [10, 560], [100, 780]], planet: [100, 920] },
  h: { vb: [1000, 200], pts: [[40, 100], [300, 0], [560, 200], [830, 100]], planet: [925, 100] },
};
const d = (dir: Dir) => {
  const [a, b, c, e] = PATHS[dir].pts;
  return `M${a.join(" ")} C ${b.join(" ")}, ${c.join(" ")}, ${e.join(" ")}`;
};
// La fusée du PNG est déjà inclinée d'environ 36° vers la droite
const SHIP_TILT = 36;
const round = (n: number) => Math.round(n * 100) / 100;

/** Position (en % de la boîte) et cap du vaisseau ; `aspect` = largeur / hauteur réelles de la boîte */
function shipAt(dir: Dir, t: number, aspect: number) {
  const { vb, pts } = PATHS[dir];
  const u = 1 - t;
  const pos = (i: 0 | 1) => u ** 3 * pts[0][i] + 3 * u * u * t * pts[1][i] + 3 * u * t * t * pts[2][i] + t ** 3 * pts[3][i];
  const der = (i: 0 | 1) =>
    3 * u * u * (pts[1][i] - pts[0][i]) + 6 * u * t * (pts[2][i] - pts[1][i]) + 3 * t * t * (pts[3][i] - pts[2][i]);
  // Dérivée ramenée à l'écran (la trajectoire est étirée à la taille de la boîte)
  const dx = (der(0) / vb[0]) * aspect;
  const dy = der(1) / vb[1];
  const heading = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return { x: round((pos(0) / vb[0]) * 100), y: round((pos(1) / vb[1]) * 100), rotate: round(heading - SHIP_TILT) };
}

function Trail({ dir, className, ship, planet }: { dir: Dir; className: string; ship: string; planet: string }) {
  const maskId = useId();
  const { vb, planet: pl } = PATHS[dir];
  // Rendu serveur : ratio supposé, corrigé au montage
  const start = shipAt(dir, 0, dir === "v" ? 0.2 : 5);
  return (
    <div aria-hidden data-trail={dir} className={`pointer-events-none ${className}`}>
      <svg viewBox={`0 0 ${vb[0]} ${vb[1]}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
        <mask id={maskId} maskUnits="userSpaceOnUse" x={-vb[0]} y={-vb[1]} width={vb[0] * 3} height={vb[1] * 3}>
          <path data-trail-mask d={d(dir)} pathLength={1} fill="none" stroke="white" strokeWidth="60" strokeDasharray="1 1" strokeDashoffset="1" />
        </mask>
        <path
          d={d(dir)}
          mask={`url(#${maskId})`}
          fill="none"
          stroke="var(--color-violet-pale)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="1 12"
          vectorEffect="non-scaling-stroke"
          opacity="0.85"
        />
      </svg>
      <Image
        src="/stickers/planete.png"
        alt=""
        width={440}
        height={440}
        unoptimized
        className={`absolute -translate-x-1/2 -translate-y-1/2 ${planet}`}
        style={{ left: `${(pl[0] / vb[0]) * 100}%`, top: `${(pl[1] / vb[1]) * 100}%`, rotate: "-8deg" }}
      />
      <Image
        data-ship
        src="/stickers/fusee.png"
        alt=""
        width={400}
        height={400}
        unoptimized
        className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 will-change-transform ${ship}`}
        style={{ left: `${start.x}%`, top: `${start.y}%`, rotate: `${start.rotate}deg` }}
      />
    </div>
  );
}

function Title({ step, className }: { step: number; className: string }) {
  return (
    <h2 className={`font-title tracking-[-0.02em] text-warm-ivory ${className}`}>
      {groups.map((g, i) => (
        <span key={i} data-on={step >= i + 2 || undefined} className="p3-line block">
          {g}
        </span>
      ))}
    </h2>
  );
}

/** Vidéos empilées : chacune recouvre la précédente quand son étape arrive */
function Videos({ step, className }: { step: number; className: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {videos.map((v, i) => (
        <div key={v.src} data-on={step >= i + 2 || undefined} className="p3-layer absolute inset-0">
          <video data-clip={i} src={v.src} poster={v.poster} muted loop playsInline preload="none" className="size-full object-cover" />
        </div>
      ))}
    </div>
  );
}

export function Ambiance() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(1);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const trails = [...track.querySelectorAll<HTMLElement>("[data-trail]")];
    const place = (p: number) => {
      trails.forEach((trail) => {
        const dir = trail.dataset.trail as Dir;
        const aspect = trail.offsetHeight ? trail.offsetWidth / trail.offsetHeight : 1;
        const pt = shipAt(dir, p, aspect);
        const ship = trail.querySelector<HTMLElement>("[data-ship]");
        if (ship) {
          ship.style.left = `${pt.x}%`;
          ship.style.top = `${pt.y}%`;
          ship.style.rotate = `${pt.rotate}deg`;
        }
        trail.querySelector("[data-trail-mask]")?.setAttribute("stroke-dashoffset", String(1 - p));
      });
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      place(0.92);
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    // Posé hors de React : masque le texte et les vidéos jusqu'à leur étape
    track.setAttribute("data-anim", "");
    const state = { p: 0 };
    place(0);
    const tween = gsap.to(state, {
      p: 1,
      ease: "none",
      onUpdate: () => {
        place(state.p);
        setStep(1 + THRESHOLDS.filter((t) => state.p >= t).length);
      },
      scrollTrigger: { trigger: track, start: "top top", end: "bottom bottom", scrub: 0.5 },
    });
    const onResize = () => place(state.p);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      tween.scrollTrigger?.kill();
      tween.kill();
      track.removeAttribute("data-anim");
    };
  }, []);

  // Seule la vidéo du dessus joue (dans la mise en page affichée : grand écran ou mobile)
  useEffect(() => {
    const track = trackRef.current;
    if (!track?.hasAttribute("data-anim")) return;
    track.querySelectorAll<HTMLVideoElement>("video[data-clip]").forEach((v) => {
      const playing = Number(v.dataset.clip) === step - 2 && v.offsetParent !== null;
      if (playing && v.paused) v.play().catch(() => {});
      if (!playing && !v.paused) v.pause();
    });
  }, [step]);

  return (
    <div ref={trackRef} className="p3 p3-track relative h-[300svh]">
      <section className="p3-sticky sticky top-2 overflow-hidden rounded-band border border-warm-ivory bg-violet-deep md:rounded-band-lg">
        {/* Mobile : moitié haute = vaisseau (gauche → droite) et texte, moitié basse = vidéos */}
        <div className="flex h-[calc(100svh-16px)] max-h-[900px] flex-col lg:hidden">
          {/* pt-[76px] : la navbar collante passe par-dessus le haut de la bande */}
          <div className="flex min-h-0 flex-1 basis-0 flex-col gap-4 px-5 pb-5 pt-[76px]">
            <Trail dir="h" className="relative h-[76px] w-full shrink-0" ship="w-[62px]" planet="w-[80px]" />
            <div className="flex min-h-0 flex-1 items-center">
              <Title step={step} className="text-[clamp(40px,12vw,60px)] leading-[95%]" />
            </div>
          </div>
          <Videos step={step} className="min-h-0 flex-1 basis-0 border-t border-warm-ivory" />
        </div>

        {/* Grand écran : moitié gauche = texte et vaisseau (haut → bas), moitié droite = vidéos */}
        <div className="hidden h-[min(calc(100svh-16px),840px)] grid-cols-2 lg:grid">
          <div className="relative flex items-center py-14 pl-14 pr-[230px]">
            <Title step={step} className="text-[clamp(56px,5.6vw,92px)] leading-[94%]" />
            <Trail dir="v" className="absolute bottom-6 right-12 top-6 w-[160px]" ship="w-[112px]" planet="w-[150px]" />
          </div>
          <Videos step={step} className="h-full border-l border-warm-ivory" />
        </div>
      </section>
    </div>
  );
}
