"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { introStore } from "@/components/intro/intro-state";

/*
 * Écran de chargement (avant l'intro du portail) : fond Cosmic Black, pourcentage réel des médias de la page.
 * Rendu dès le HTML serveur pour couvrir la page au premier affichage ; une seule fois par chargement du site
 * (une navigation interne ou un changement de langue ne le rejoue pas). On compte :
 *  - les images de la page, y compris celles plus bas (chargement différé) : on les précharge ;
 *  - les vidéos (assez chargées pour jouer sans coupure) et leurs affiches ;
 *  - les polices.
 * Au-delà de MAX_MS, le site s'ouvre quand même (connexion lente) : le reste continue en arrière-plan.
 */

const MAX_MS = 15000;
/** Durée minimale d'affichage, pour que le compteur se lise même quand tout est en cache */
const MIN_MS = 900;
const LEAVE_MS = 600;

/** Charge une image comme le ferait la balise (même srcset et sizes, donc le même fichier) */
function preloadImage(img: HTMLImageElement): Promise<void> {
  if (img.complete && img.naturalWidth > 0) return Promise.resolve();
  return new Promise((resolve) => {
    const probe = new window.Image();
    probe.onload = probe.onerror = () => resolve();
    if (img.sizes) probe.sizes = img.sizes;
    if (img.srcset) probe.srcset = img.srcset;
    probe.src = img.currentSrc || img.src;
    if (!probe.src && !probe.srcset) resolve();
  });
}

function preloadVideo(video: HTMLVideoElement): Promise<void> {
  const src = video.currentSrc || video.src || video.querySelector("source")?.src;
  if (!src || video.readyState >= 4) return Promise.resolve();
  return new Promise((resolve) => {
    const probe = document.createElement("video");
    probe.muted = true;
    probe.preload = "auto";
    const end = () => {
      probe.removeAttribute("src");
      probe.load();
      resolve();
    };
    probe.addEventListener("canplaythrough", end, { once: true });
    probe.addEventListener("error", end, { once: true });
    probe.src = src;
    probe.load();
  });
}

function trackMedia(onProgress: (ratio: number) => void): Promise<void> {
  const tasks: Promise<unknown>[] = [document.fonts.ready];
  document.querySelectorAll("img").forEach((img) => {
    if (!img.closest("#site-loader")) tasks.push(preloadImage(img));
  });
  document.querySelectorAll("video").forEach((video) => {
    tasks.push(preloadVideo(video));
    if (video.poster) {
      const poster = new window.Image();
      poster.src = video.poster;
      tasks.push(poster.decode().catch(() => {}));
    }
  });
  let done = 0;
  onProgress(0);
  return Promise.all(
    tasks.map((t) =>
      t.catch(() => {}).finally(() => {
        done++;
        onProgress(done / tasks.length);
      }),
    ),
  ).then(() => {});
}

export function SiteLoader() {
  const t = useTranslations("Loader");
  const loaded = useSyncExternalStore(introStore.subscribe, () => introStore.get().loaded, () => false);
  const [percent, setPercent] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const target = useRef(0);

  useEffect(() => {
    if (introStore.get().loaded) return;
    const root = document.documentElement;
    root.style.overflow = "hidden";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const started = performance.now();
    let finished = false;
    let timer = 0;
    let shown = 0;
    let last = performance.now();

    const finish = () => {
      if (finished) return;
      finished = true;
      target.current = 1;
    };

    // Le compteur rattrape le pourcentage réel en douceur, sans jamais reculer. Minuterie plutôt que
    // requestAnimationFrame : un onglet ouvert en arrière-plan continue de charger et sera prêt au retour.
    const tick = () => {
      const goal = target.current * 100;
      // Lissage selon le temps écoulé (et non le nombre de passages) : même vitesse au premier plan
      // comme en arrière-plan, où la minuterie ralentit
      const now = performance.now();
      const k = 1 - Math.exp(-(now - last) / 130);
      last = now;
      shown = reduced ? goal : Math.min(goal, shown + (goal - shown) * k + (goal > shown ? 0.15 : 0));
      setPercent(Math.floor(shown));
      if (finished && shown >= 99.9 && performance.now() - started >= MIN_MS) {
        setPercent(100);
        root.style.overflow = "";
        // L'intro et les animations démarrent pendant que l'écran s'efface
        introStore.set({ loaded: true });
        setLeaving(true);
        window.setTimeout(() => setGone(true), reduced ? 0 : LEAVE_MS);
        return;
      }
      timer = window.setTimeout(tick, 16);
    };
    timer = window.setTimeout(tick, 16);

    const timeout = window.setTimeout(finish, MAX_MS);
    trackMedia((ratio) => {
      target.current = Math.max(target.current, ratio);
    }).then(finish);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(timeout);
      root.style.overflow = "";
    };
  }, []);

  if (gone || (loaded && !leaving)) return null;

  return (
    <div
      id="site-loader"
      role="progressbar"
      aria-label={t("label")}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={`fixed inset-0 z-110 flex flex-col items-center justify-center gap-8 bg-cosmic-black px-6 text-warm-ivory transition-opacity ease-out motion-reduce:transition-none ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${LEAVE_MS}ms` }}
    >
      <Image src="/brand/logo-blanc.svg" alt="" width={122} height={120} priority unoptimized className="h-16 w-auto md:h-20" />
      <p className="font-title text-[clamp(96px,26vw,220px)] leading-[85%] tracking-[-0.03em] tabular-nums" aria-hidden>
        {percent}
        <span className="text-solar-copper">%</span>
      </p>
      <div className="h-2 w-full max-w-[320px] overflow-hidden rounded-full border border-warm-ivory/40">
        <div className="h-full origin-left rounded-full bg-solar-copper" style={{ transform: `scaleX(${percent / 100})` }} />
      </div>
      {/* Sans JavaScript, l'écran ne doit pas bloquer la page */}
      <noscript>
        <style>{"#site-loader{display:none!important}"}</style>
      </noscript>
    </div>
  );
}
