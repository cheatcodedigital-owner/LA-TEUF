"use client";

import { useEffect, useRef } from "react";

// Ciel étoilé en fond de page : étoiles sur 3 plans de profondeur (dérive lente,
// scintillement, parallaxe au scroll et à la souris), étoiles filantes rares et
// nébuleuses Ultraviolet / Indigo en CSS. Canvas transparent : le fond Cosmic Black
// vient de <html>. prefers-reduced-motion : ciel fixe, sans animation.

interface Star {
  /** Position normalisée (0 à 1) : le ciel se redimensionne sans changer de dessin */
  x: number;
  y: number;
  r: number;
  depth: number; // 0.2 (loin) à 1 (proche)
  alpha: number;
  phase: number;
  speed: number;
  rgb: string;
}

interface Shooting {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
}

const IVORY = "243,233,213"; // warm-ivory
const VIOLET = "170,150,255"; // Ultraviolet éclairci
const DRIFT = 5; // px/s pour le plan le plus proche
const SCROLL_PARALLAX = 0.12;
const MOUSE_PARALLAX = 14;

const wrap = (v: number, max: number) => ((v % max) + max) % max;

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    let W = 0;
    let H = 0;
    let raf = 0;
    const stars: Star[] = [];
    let shooting: Shooting | null = null;
    let nextShooting = performance.now() + 5000 + Math.random() * 5000;
    const mouse = { x: 0, y: 0 };
    const mouseTarget = { x: 0, y: 0 };

    // Au redimensionnement, on ajuste le nombre d'étoiles sans retirer celles déjà placées
    const buildStars = () => {
      const count = Math.round(Math.min(340, Math.max(90, (W * H) / (coarse ? 6500 : 4200))));
      if (stars.length >= count) {
        stars.length = count;
        return;
      }
      const extra = Array.from({ length: count - stars.length }, () => {
        const depth = 0.2 + Math.random() * 0.8;
        return {
          x: Math.random(),
          y: Math.random(),
          r: 0.5 + depth * 1.2 + (Math.random() < 0.07 ? 0.8 : 0),
          depth,
          alpha: 0.45 + depth * 0.5,
          phase: Math.random() * Math.PI * 2,
          speed: 0.6 + Math.random() * 1.6,
          rgb: Math.random() < 0.18 ? VIOLET : IVORY,
        };
      });
      stars.push(...extra);
    };

    const setSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
      draw(performance.now());
    };

    function draw(now: number) {
      ctx!.clearRect(0, 0, W, H);
      const t = now / 1000;
      const scroll = window.scrollY;

      for (const s of stars) {
        const drift = reduced ? 0 : t * DRIFT * s.depth;
        const x = wrap(s.x * W + mouse.x * MOUSE_PARALLAX * s.depth, W);
        const y = wrap(s.y * H - drift - scroll * SCROLL_PARALLAX * s.depth + mouse.y * MOUSE_PARALLAX * s.depth, H);
        const twinkle = reduced ? 1 : 0.65 + 0.35 * Math.sin(t * s.speed + s.phase);
        const a = s.alpha * twinkle;

        if (s.r > 1.4) {
          ctx!.fillStyle = `rgba(${s.rgb},${(a * 0.14).toFixed(3)})`;
          ctx!.beginPath();
          ctx!.arc(x, y, s.r * 3.2, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.fillStyle = `rgba(${s.rgb},${a.toFixed(3)})`;
        ctx!.beginPath();
        ctx!.arc(x, y, s.r, 0, Math.PI * 2);
        ctx!.fill();
      }

      if (shooting) {
        const age = (now - shooting.born) / shooting.life;
        if (age >= 1) {
          shooting = null;
        } else {
          const len = 140;
          const head = { x: shooting.x + shooting.vx * age * shooting.life, y: shooting.y + shooting.vy * age * shooting.life };
          const mag = Math.hypot(shooting.vx, shooting.vy);
          const tail = { x: head.x - (shooting.vx / mag) * len, y: head.y - (shooting.vy / mag) * len };
          const fade = Math.sin(age * Math.PI);
          const grd = ctx!.createLinearGradient(tail.x, tail.y, head.x, head.y);
          grd.addColorStop(0, `rgba(${IVORY},0)`);
          grd.addColorStop(1, `rgba(${IVORY},${(0.85 * fade).toFixed(3)})`);
          ctx!.strokeStyle = grd;
          ctx!.lineWidth = 1.4;
          ctx!.beginPath();
          ctx!.moveTo(tail.x, tail.y);
          ctx!.lineTo(head.x, head.y);
          ctx!.stroke();
        }
      }
    }

    const animate = (now: number) => {
      mouse.x += (mouseTarget.x - mouse.x) * 0.04;
      mouse.y += (mouseTarget.y - mouse.y) * 0.04;
      if (!shooting && now > nextShooting) {
        const fromLeft = Math.random() < 0.5;
        shooting = {
          x: fromLeft ? Math.random() * W * 0.5 : W * 0.5 + Math.random() * W * 0.5,
          y: Math.random() * H * 0.4,
          vx: (fromLeft ? 1 : -1) * (0.5 + Math.random() * 0.3),
          vy: 0.3 + Math.random() * 0.2,
          born: now,
          life: 900 + Math.random() * 500,
        };
        nextShooting = now + 7000 + Math.random() * 8000;
      }
      draw(now);
      raf = requestAnimationFrame(animate);
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseTarget.x = e.clientX / W - 0.5;
      mouseTarget.y = e.clientY / H - 0.5;
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) raf = requestAnimationFrame(animate);
    };

    setSize();
    window.addEventListener("resize", setSize);
    if (!reduced) {
      window.addEventListener("mousemove", onMouseMove, { passive: true });
      document.addEventListener("visibilitychange", onVisibility);
      raf = requestAnimationFrame(animate);
    } else {
      window.addEventListener("scroll", () => draw(performance.now()), { passive: true });
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", setSize);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="nebula nebula-a" />
      <div className="nebula nebula-b" />
      <div className="nebula nebula-c" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
