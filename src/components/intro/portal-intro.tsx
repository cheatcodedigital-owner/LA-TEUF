"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { introStore } from "./intro-state";
import { startPortal } from "./portal-gl";

const DURATION_MS = 4200;
const LEAVE_MS = 450;

function release() {
  document.body.style.overflow = "";
  introStore.set({ played: true });
}

export function PortalIntro() {
  const t = useTranslations("Intro");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const [finished, setFinished] = useState(introStore.get().played);
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (introStore.get().played) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Animations réduites : l'overlay est masqué en CSS, on ne lance rien
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = window.setTimeout(() => {
        release();
        setFinished(true);
      }, 0);
      return () => window.clearTimeout(id);
    }

    document.body.style.overflow = "hidden";

    const stop = startPortal(canvas, {
      duration: DURATION_MS,
      onFirstFrame: () => setReady(true),
      onDone: () => {
        release();
        setFinished(true);
      },
    });

    if (!stop) {
      // WebGL indisponible : pas d'intro, le site s'affiche directement
      introStore.set({ delay: "0s" });
      const id = window.setTimeout(() => {
        release();
        setFinished(true);
      }, 0);
      return () => window.clearTimeout(id);
    }

    stopRef.current = stop;
    return () => {
      stop();
      stopRef.current = null;
      document.body.style.overflow = "";
    };
  }, []);

  function skip() {
    stopRef.current?.();
    stopRef.current = null;
    // Le hero se révèle tout de suite, l'overlay s'efface en fondu
    introStore.set({ delay: "0.1s" });
    setLeaving(true);
    window.setTimeout(() => {
      release();
      setFinished(true);
    }, LEAVE_MS);
  }

  if (finished) return null;

  return (
    <div
      id="portal-intro"
      className={`fixed inset-0 z-100 transition-opacity ease-out ${
        ready ? "" : "bg-cosmic-black"
      } ${leaving ? "opacity-0" : "opacity-100"}`}
      style={{ transitionDuration: `${LEAVE_MS}ms` }}
    >
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 size-full" />
      <button
        type="button"
        onClick={skip}
        className="absolute bottom-8 left-1/2 min-h-11 -translate-x-1/2 rounded-full border border-warm-ivory/40 px-6 font-label text-sm uppercase tracking-widest text-warm-ivory transition-colors hover:border-solar-copper hover:text-solar-copper"
      >
        {t("skip")}
      </button>
    </div>
  );
}
