"use client";

import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { useEffect } from "react";

/*
 * Mouvements repris de slush.app (leur script public, mêmes valeurs), DESIGN.md §9 :
 * - défilement : Lenis, lerp 0,12, branché sur le ticker GSAP (créé une fois pour tout le site) ;
 * - [data-anim-slant] : lettres qui glissent de la droite (-0,25 em), au chargement ;
 * - [data-load-stagger] : éléments du hero qui montent de 3 em, en cascade ;
 * - [data-heading-reveal] : lignes de titre qui pivotent en 3D (rotateY -45°, z 5 em) à l'entrée ;
 * - [data-card-reveal="wrap"] > [data-card-reveal="card"] : cartes qui arrivent de biais et de loin ;
 * - [data-reveal-up] : boutons et textes qui montent de 3 em à l'entrée ;
 * - [data-sticker] : stickers qui apparaissent en « pop » (le flottement est en CSS).
 * Deux composants : <SmoothScroll /> dans l'habillage (un seul Lenis pour la visite) et <Reveals />
 * à la fin de chaque page v2. Placé dans la page, Reveals ne démarre qu'une fois la page hydratée
 * (SplitText modifie le DOM : lancé plus tôt, il casserait l'hydratation). Rien ne bouge avec reduced-motion.
 */

let registered = false;
/** Enregistre les plugins GSAP et les courbes « slush » / « slush-bounce » (une seule fois) */
export function registerSlush() {
  if (registered) return;
  registered = true;
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
  CustomEase.create("slush", "0.65, 0.05, 0, 1");
  CustomEase.create(
    "slush-bounce",
    "M0,0 L0.076,0.5737 L0.1187,0.8382 L0.1419,0.9463 L0.1654,1.0292 L0.1897,1.0886 L0.2153,1.1258 L0.2297,1.137 L0.2448,1.1424 L0.261,1.1423 L0.2786,1.1366 L0.3101,1.1165 L0.3862,1.0507 L0.4257,1.0219 L0.4699,0.9995 L0.5163,0.9872 L0.5877,0.9842 L0.8126,1.0011 L1,1",
  );
}

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type LenisWindow = Window & { __lenis?: Lenis };
/** Défilement Lenis du site, s'il tourne (le menu mobile l'arrête pendant qu'il est ouvert) */
export const getLenis = () => (window as LenisWindow).__lenis;

/** Défilement doux (Lenis) : un seul pour toute la visite, dans SiteChrome */
export function SmoothScroll() {
  useEffect(() => {
    registerSlush();
    if (prefersReducedMotion()) return;
    const lenis = new Lenis({ lerp: 0.12, anchors: true });
    (window as LenisWindow).__lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      delete (window as LenisWindow).__lenis;
    };
  }, []);

  return null;
}

/** Apparitions au défilement : à placer en dernier dans chaque page v2 */
export function Reveals() {
  useEffect(() => {
    registerSlush();
    if (prefersReducedMotion()) return;

    const splits: SplitText[] = [];
    const clear = "transform,opacity,visibility";
    const once = (trigger: Element, onEnter: () => void) =>
      ScrollTrigger.create({ trigger, start: "top 80%", once: true, onEnter });

    // SplitText découpe en lignes : on attend les polices pour couper au bon endroit
    let ctx: gsap.Context | undefined;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      ctx = gsap.context(() => {
        // Hero : lettres du titre puis éléments en cascade
        const slant = document.querySelector<HTMLElement>("[data-anim-slant]");
        const stagger = gsap.utils.toArray<HTMLElement>("[data-load-stagger]");
        gsap.set(stagger, { y: "3em", autoAlpha: 0 });
        let chars: Element[] = [];
        let slantSplit: SplitText | undefined;
        if (slant) {
          slantSplit = new SplitText(slant, { type: "words, chars", charsClass: "slush-char" });
          splits.push(slantSplit);
          chars = slantSplit.chars;
          gsap.set(chars, { x: "-0.25em", autoAlpha: 0 });
        }
        gsap
          .timeline({ delay: 0.1, defaults: { ease: "slush-bounce" } })
          .to(
            chars,
            {
              x: "0em",
              autoAlpha: 1,
              duration: 0.65,
              stagger: { each: 0.015, from: "end" },
              onComplete: () => slantSplit?.revert(),
            },
            0,
          )
          .to(stagger, { y: "0em", autoAlpha: 1, duration: 1, stagger: 0.1, clearProps: clear }, 0.5);

        // Titres de section : lignes en 3D
        gsap.utils.toArray<HTMLElement>("[data-heading-reveal]").forEach((el) => {
          const split = new SplitText(el, { type: "lines, words" });
          splits.push(split);
          gsap.set(el, { perspective: 1000 });
          gsap.set(split.lines, { z: "5em", rotateY: -45, autoAlpha: 0 });
          once(el, () =>
            gsap.to(split.lines, {
              z: "0em",
              rotateY: 0,
              autoAlpha: 1,
              ease: "slush-bounce",
              duration: 0.85,
              stagger: 0.15,
              onComplete: () => split.revert(),
            }),
          );
        });

        // Cartes : arrivent de biais (rotateY -30°), de loin (z 20 em) et en petit (0,75)
        gsap.utils.toArray<HTMLElement>('[data-card-reveal="wrap"]').forEach((wrap) => {
          const cards = wrap.querySelectorAll('[data-card-reveal="card"]');
          gsap.set(wrap, { perspective: 1000 });
          gsap.set(cards, { x: "5em", z: "20em", rotateY: -30, scale: 0.75, autoAlpha: 0 });
          once(wrap, () =>
            gsap.to(cards, {
              x: "0em",
              z: "0em",
              rotateY: 0,
              scale: 1,
              autoAlpha: 1,
              ease: "slush-bounce",
              duration: 0.85,
              stagger: { amount: 0.2 },
              clearProps: clear,
            }),
          );
        });

        // Stickers : « pop » à l'arrivée (0,6 → 1 avec une petite rotation), 500 ms
        gsap.utils.toArray<HTMLElement>("[data-sticker]").forEach((el) => {
          gsap.set(el, { scale: 0.6, rotation: -12, autoAlpha: 0 });
          once(el, () =>
            gsap.to(el, { scale: 1, rotation: 0, autoAlpha: 1, ease: "slush-bounce", duration: 0.5, clearProps: clear }),
          );
        });

        // Boutons et textes : montent de 3 em
        gsap.utils.toArray<HTMLElement>("[data-reveal-up]").forEach((el) => {
          gsap.set(el, { y: "3em", autoAlpha: 0 });
          once(el, () => gsap.to(el, { y: "0em", autoAlpha: 1, ease: "slush-bounce", duration: 1, clearProps: clear }));
        });
      });
      // Les polices changent la hauteur des sections : on recalcule les déclencheurs
      ScrollTrigger.refresh();
    });

    return () => {
      cancelled = true;
      ctx?.revert();
      splits.forEach((s) => s.revert());
    };
  }, []);

  return null;
}
