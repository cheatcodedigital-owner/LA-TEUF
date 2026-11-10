"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Flip } from "@/components/ds/flip";
import { getLenis } from "@/components/ds/slush-motion";

const DESKTOP = "(min-width: 1024px)";
const subscribe = (onChange: () => void) => {
  const mq = window.matchMedia(DESKTOP);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

/**
 * Panneau d'achat de la page événement. Grand écran : colonne de droite collante (Ivoire, contour Cuivre 2 px).
 * Mobile : barre fixe en bas d'écran (« Billets dès … » + « Prendre ton billet ») qui ouvre le même panneau
 * en volet plein écran. Le formulaire n'est monté qu'une fois : son état survit à l'ouverture et la fermeture.
 */
export function PurchaseShell({ from, children }: { from: string | null; children: React.ReactNode }) {
  const t = useTranslations("Ticketing");
  const desktop = useSyncExternalStore(subscribe, () => window.matchMedia(DESKTOP).matches, () => true);
  const [open, setOpen] = useState(false);
  const sheetOpen = open && !desktop;

  // Volet ouvert : la page derrière ne défile plus, Échap ferme
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const lenis = getLenis();
    lenis?.stop();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      lenis?.start();
      window.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  return (
    <>
      <div
        role={desktop ? "region" : "dialog"}
        aria-modal={sheetOpen || undefined}
        aria-label={t("panelLabel")}
        inert={!desktop && !open}
        data-lenis-prevent={!desktop || undefined}
        className={`fixed inset-x-0 bottom-0 z-50 max-h-[94svh] overflow-y-auto overscroll-contain rounded-t-[32px] border-t-2 border-solar-copper bg-warm-ivory transition-transform duration-500 ease-[cubic-bezier(0.65,0.05,0,1)] motion-reduce:transition-none ${
          open ? "translate-y-0" : "translate-y-full"
        } lg:sticky lg:inset-auto lg:top-24 lg:z-auto lg:max-h-none lg:translate-y-0 lg:overflow-hidden lg:rounded-band-lg lg:border-2 lg:transition-none`}
      >
        {/* Mobile : poignée et fermeture du volet */}
        <div className="sticky top-0 z-10 flex justify-end bg-warm-ivory/95 px-4 pt-3 lg:hidden">
          <span aria-hidden className="absolute left-1/2 top-2.5 h-1 w-11 -translate-x-1/2 rounded-full bg-cosmic-black/25" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("closePanel")}
            className="flex size-11 items-center justify-center rounded-full border border-cosmic-black text-cosmic-black"
          >
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden>
              <path d="M4.3 4.3l11.4 11.4M15.7 4.3L4.3 15.7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>

      {/* Voile derrière le volet (mobile) */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-cosmic-black/70 transition-opacity duration-500 lg:hidden ${sheetOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      {/* Mobile : barre d'achat fixe en bas d'écran */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-warm-ivory/25 bg-cosmic-black px-[18px] py-3.5 text-warm-ivory lg:hidden">
        {from && (
          <p className="flex flex-col">
            <span className="font-label text-[12px] uppercase leading-4 tracking-[0.06em]">{t("from")}</span>
            <span className="font-label text-[24px] leading-7">{from}</span>
          </p>
        )}
        <Flip tone="copper" size="h-[52px] px-6 text-[15px]" className={from ? "" : "w-full"} onClick={() => setOpen(true)}>
          {t("openPanel")}
        </Flip>
      </div>
    </>
  );
}
