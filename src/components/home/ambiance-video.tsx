"use client";

import { useEffect, useRef, useState } from "react";

// Vidéo d'ambiance en fond de section (muette, en boucle). Horizontale dès 768 px,
// verticale en dessous. Chargée seulement à l'approche de la section et mise en pause
// hors écran. Avec prefers-reduced-motion ou l'économie de données : image fixe.
const SOURCES = {
  wide: { video: "/videos/ambiance-paysage.mp4", poster: "/videos/ambiance-paysage.jpg" },
  tall: { video: "/videos/ambiance-portrait.mp4", poster: "/videos/ambiance-portrait.jpg" },
};

export function AmbianceVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [source, setSource] = useState<(typeof SOURCES)["wide"] | null>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    const update = () => {
      setSource(wide.matches ? SOURCES.wide : SOURCES.tall);
      setAnimated(!reduced.matches && !saveData);
    };
    update();
    wide.addEventListener("change", update);
    reduced.addEventListener("change", update);
    return () => {
      wide.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video || !source || !animated) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!video.src.endsWith(source.video)) video.src = source.video;
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(video);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [source, animated]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
      {source && (
        <video
          key={source.video}
          ref={ref}
          poster={source.poster}
          muted
          loop
          playsInline
          preload="none"
          className="h-full w-full object-cover"
        />
      )}
      {/* Voile : le titre et les cartes restent lisibles, la vidéo reste une ambiance */}
      <div className="absolute inset-0 bg-cosmic-black/40" />
      <div className="absolute inset-0 bg-linear-to-b from-deep-indigo/70 via-transparent to-cosmic-black/60" />
    </div>
  );
}
