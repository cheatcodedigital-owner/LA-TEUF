"use client";

// Adapté de « Dimensional Switch Slider » (Hyperiux Vault : https://vault.hyperiux.com).
// Une carte qui bascule en 3D (rotateX) d'une vidéo à l'autre, le texte tourne avec elle.
// Ici, pas de flèches ni d'autoplay : c'est le défilement vertical qui fait avancer.
// La section est haute (une hauteur d'écran par étape) et la carte reste collée à l'écran
// pendant qu'on la traverse. Le défilement natif n'est jamais bloqué.
//
// Fluidité : chaque face garde ses 3 vidéos chargées une fois pour toutes (on change
// seulement laquelle est visible, rien n'est rechargé pendant la bascule), la bascule part
// tout de suite (ease-out court) et un seuil d'hystérésis évite les allers-retours quand
// on s'arrête pile entre deux étapes.
import gsap from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";

export type SwitchSlide = { video: string; poster: string; text: string; accent?: boolean };

const FLIP_EASE = "power2.inOut";
const FLIP_DURATION = 0.6;
const TEXT_EASE = "power2.out";
const TEXT_DURATION = 0.4;
const TEXT_TRANSLATE_PERCENT = 25;
const TEXT_ROTATE_DEG = 20;
const TEXT_Z = 40;
/** Part d'une étape à dépasser avant de changer de vidéo, dans un sens comme dans l'autre */
const HYSTERESIS = 0.12;

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function DimensionalSwitchSlider({ slides, label }: { slides: SwitchSlide[]; label: string }) {
  const count = slides.length;
  const wrapRef = useRef<HTMLElement>(null);
  const flipperRef = useRef<HTMLDivElement>(null);
  const prevTextRef = useRef<HTMLDivElement>(null);
  const nextTextRef = useRef<HTMLDivElement>(null);
  // videoRefs[face][slide] : 0 = face avant, 1 = face arrière
  const videoRefs = useRef<(HTMLVideoElement | null)[][]>([[], []]);

  const showingNextRef = useRef(false);
  const animatingRef = useRef(false);
  const rotationRef = useRef(0);
  const visibleIndexRef = useRef(0);
  const targetIndexRef = useRef(0);

  const [frontIndex, setFrontIndex] = useState(0);
  const [backIndex, setBackIndex] = useState(1 % count);
  const [current, setCurrent] = useState(0);
  const [near, setNear] = useState(false); // proche de l'écran : on charge les vidéos
  const [onScreen, setOnScreen] = useState(false); // à l'écran : elles jouent
  const [still, setStill] = useState(false); // animations réduites : images fixes

  useEffect(() => {
    gsap.set([prevTextRef.current, nextTextRef.current], { z: TEXT_Z, force3D: true });
    gsap.set(flipperRef.current, { force3D: true });
    setStill(reducedMotion());
  }, []);

  const flipTo = useCallback(function flip(newIndex: number) {
    if (animatingRef.current || newIndex === visibleIndexRef.current) return;
    const goingNext = newIndex > visibleIndexRef.current;
    const wasShowingNext = showingNextRef.current;

    // La face cachée affiche déjà la bonne vidéo (préchargée) avant d'être tournée vers nous
    setCurrent(newIndex);
    if (wasShowingNext) setFrontIndex(newIndex);
    else setBackIndex(newIndex);
    showingNextRef.current = !wasShowingNext;
    visibleIndexRef.current = newIndex;

    const outgoing = wasShowingNext ? nextTextRef.current : prevTextRef.current;
    const incoming = wasShowingNext ? prevTextRef.current : nextTextRef.current;
    rotationRef.current += goingNext ? -180 : 180;

    if (reducedMotion()) {
      gsap.set(flipperRef.current, { rotateX: rotationRef.current });
      gsap.set(outgoing, { yPercent: 0, rotateX: 0, opacity: 0 });
      gsap.set(incoming, { yPercent: 0, rotateX: 0, opacity: 1 });
      return;
    }

    animatingRef.current = true;
    const tl = gsap.timeline({
      onComplete: () => {
        animatingRef.current = false;
        // Si l'on a continué à défiler pendant la bascule, on rejoint directement l'étape visée
        if (targetIndexRef.current !== visibleIndexRef.current) flip(targetIndexRef.current);
      },
    });
    tl.to(flipperRef.current, { rotateX: rotationRef.current, ease: FLIP_EASE, duration: FLIP_DURATION }, 0);

    // Le texte sortant part en tournant, le suivant arrive de l'autre côté
    const sign = goingNext ? -1 : 1;
    tl.to(
      outgoing,
      { yPercent: sign * TEXT_TRANSLATE_PERCENT, rotateX: -sign * TEXT_ROTATE_DEG, opacity: 0, duration: TEXT_DURATION * 0.5, ease: "power1.in" },
      0,
    );
    tl.fromTo(
      incoming,
      { yPercent: -sign * TEXT_TRANSLATE_PERCENT, rotateX: sign * TEXT_ROTATE_DEG, opacity: 0 },
      { yPercent: 0, rotateX: 0, opacity: 1, duration: TEXT_DURATION, ease: TEXT_EASE },
      0.2,
    );
  }, []);

  // Le défilement choisit l'étape : la traversée de la section est découpée en `count` parts
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const range = rect.height - window.innerHeight;
      if (range <= 0) return;
      const position = Math.min(Math.max(-rect.top / range, 0), 0.9999) * count;
      const target = targetIndexRef.current;
      // On ne change d'étape qu'après avoir franchi la limite d'une marge, pour éviter le va-et-vient
      let index = target;
      if (position >= target + 1 + HYSTERESIS || position < target - HYSTERESIS) {
        index = Math.min(count - 1, Math.max(0, Math.floor(position)));
      }
      if (index !== target) {
        targetIndexRef.current = index;
        flipTo(index);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [count, flipTo]);

  // Chargement à l'approche, lecture seulement quand la section est à l'écran
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const nearObs = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), {
      rootMargin: "100% 0px",
    });
    const screenObs = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    nearObs.observe(wrap);
    screenObs.observe(wrap);
    return () => {
      nearObs.disconnect();
      screenObs.disconnect();
    };
  }, []);

  // Seules les vidéos affichées sur chaque face jouent ; les autres restent en pause, prêtes
  useEffect(() => {
    const shown = [frontIndex, backIndex];
    videoRefs.current.forEach((faceVideos, f) =>
      faceVideos.forEach((video, i) => {
        if (!video) return;
        if (i === shown[f] && onScreen && near && !still) video.play().catch(() => {});
        else video.pause();
      }),
    );
  }, [frontIndex, backIndex, onScreen, near, still]);

  const face = (faceIndex: number, f: 0 | 1) => (
    <div
      className={`absolute inset-0 overflow-hidden rounded-card border border-frame-line bg-deep-indigo backface-hidden ${
        f === 1 ? "rotate-x-180" : ""
      }`}
    >
      {slides.map((s, i) => (
        <video
          key={s.video}
          ref={(el) => {
            videoRefs.current[f][i] = el;
          }}
          src={near && !still ? s.video : undefined}
          poster={s.poster}
          muted
          loop
          playsInline
          preload="auto"
          className={`absolute inset-0 h-full w-full object-cover ${i === faceIndex ? "" : "invisible"}`}
        />
      ))}
      <div className="absolute inset-0 bg-cosmic-black/35" />
    </div>
  );

  const textClass = (index: number) =>
    `absolute w-full px-6 text-center font-title text-6xl leading-[1.05] will-change-transform ${
      slides[index].accent ? "text-solar-copper" : "text-warm-ivory"
    }`;

  return (
    <section ref={wrapRef} aria-label={label} className="relative isolate z-0" style={{ height: `${count * 90}svh` }}>
      <p className="sr-only">{label}</p>
      <div aria-hidden className="sticky top-0 flex h-svh flex-col gap-4 pb-6 pt-20">
        {/* Perspective lointaine et découpe : la carte ne déborde jamais de son cadre pendant la bascule */}
        <div className="relative w-full flex-1 overflow-hidden rounded-card" style={{ perspective: "2400px" }}>
          <div ref={flipperRef} className="relative h-full w-full transform-3d will-change-transform">
            {face(frontIndex, 0)}
            {face(backIndex, 1)}
          </div>
          <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ perspective: "1200px" }}>
            <div ref={prevTextRef} className={textClass(frontIndex)}>
              {slides[frontIndex].text}
            </div>
            <div ref={nextTextRef} className={`${textClass(backIndex)} opacity-0`}>
              {slides[backIndex].text}
            </div>
          </div>
        </div>
        {/* Repère d'étape (pas de navigation : on avance en défilant) */}
        <div className="flex justify-center gap-2">
          {slides.map((s, i) => (
            <span
              key={s.video}
              className={`h-1.5 w-6 rounded-full transition-colors duration-300 ${
                i === current ? "bg-solar-copper" : "bg-warm-ivory/30"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
