"use client";

import { type ElementType, type ReactNode, useEffect, useRef } from "react";

// Révélation au scroll : l'élément glisse et apparaît une seule fois quand il entre dans
// l'écran. L'état « révélé » est posé directement sur le DOM (data-in) : aucun re-rendu.
// Le style vit dans globals.css (.reveal) ; sans JS ou avec prefers-reduced-motion,
// tout reste visible.
export function Reveal({
  as: Tag = "div",
  delay = 0,
  className = "",
  children,
}: {
  as?: ElementType;
  /** Décalage en ms, pour échelonner des éléments voisins */
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // Un élément déjà passé (rechargement en milieu de page) est révélé d'emblée
          if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
            el.setAttribute("data-in", "");
            observer.unobserve(el);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
