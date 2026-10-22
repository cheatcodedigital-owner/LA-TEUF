"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { introStore } from "./intro-state";

const ANIMATED = ".reveal-word, .reveal-fade, .home-reveal";

// Enveloppe l'accueil. Les animations de révélation (.reveal-word, .reveal-fade, .home-reveal)
// ne jouent que pour l'instance montée pendant l'intro. Toute instance affichée après la fin de
// l'overlay (changement de langue, retour sur l'accueil, réaffichage depuis le cache de Next)
// est figée dans son état final avant le premier affichage.
export function IntroScope({ children }: { children: ReactNode }) {
  const delay = useSyncExternalStore(
    introStore.subscribe,
    () => introStore.get().delay,
    () => null,
  );
  const [mountedAfterIntro] = useState(() => introStore.get().played);
  const ref = useRef<HTMLDivElement>(null);

  // Exécuté au montage et à chaque réaffichage (Activity) : avant la peinture
  useLayoutEffect(() => {
    if (!introStore.get().played) return;
    ref.current?.querySelectorAll<HTMLElement>(ANIMATED).forEach((el) => {
      el.style.animation = "none";
    });
  }, []);

  return (
    <div
      ref={ref}
      className="intro-scope"
      data-seen={mountedAfterIntro ? "" : undefined}
      style={delay ? ({ "--intro-delay": delay } as CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
