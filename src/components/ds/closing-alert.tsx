"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { introStore, whenLoaded } from "@/components/intro/intro-state";
import { usePathname } from "@/i18n/navigation";
import { Flip } from "./flip";
import { eventOnSale, ticketsHref } from "./links";
import { copperWord } from "./page-header";

/* Pop-up « la billetterie ferme à minuit » : affiché dans les 24 h qui précèdent la fin de la vente en ligne
   (`onlineSalesEnd` dans src/data/events.ts), une fois par session, après l'écran de chargement
   (et après l'intro du portail sur l'accueil). La base reste seule juge de la fermeture réelle. */

const WINDOW_MS = 24 * 3_600_000;
const SEEN_KEY = "teuf-closing-alert";

const end = eventOnSale?.onlineSalesEnd ? new Date(eventOnSale.onlineSalesEnd).getTime() : null;

function seen() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === String(end);
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, String(end));
  } catch {
    /* stockage indisponible : le pop-up pourra revenir, sans gravité */
  }
}

const inWindow = (now: number) => end !== null && now < end && now >= end - WINDOW_MS;

export function ClosingAlert() {
  const t = useTranslations("ClosingAlert");
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const [now, setNow] = useState<number | null>(null);
  const onTicketsPage = pathname === ticketsHref;

  // Ouverture : après le chargement, et après l'intro sur l'accueil
  useEffect(() => {
    if (!inWindow(Date.now()) || seen()) return;
    let unsubscribe = () => {};
    const open = () => {
      if (!inWindow(Date.now()) || seen()) return;
      markSeen();
      setNow(Date.now());
      dialog.current?.showModal();
    };
    const cancelLoaded = whenLoaded(() => {
      const introPending = pathname === "/" && !introStore.get().played;
      if (!introPending) return open();
      unsubscribe = introStore.subscribe(() => {
        if (!introStore.get().played) return;
        unsubscribe();
        window.setTimeout(open, 600);
      });
    });
    return () => {
      cancelLoaded();
      unsubscribe();
    };
    // une seule fois au montage : l'habillage reste monté d'une page à l'autre
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compte à rebours, à la minute
  useEffect(() => {
    if (now === null) return;
    const id = window.setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (!inWindow(n)) dialog.current?.close();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [now === null]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!eventOnSale || end === null) return null;

  const left = Math.max(0, (end - (now ?? end)) / 60_000);
  const hours = Math.floor(left / 60);
  const minutes = Math.floor(left % 60);
  const close = () => dialog.current?.close();

  return (
    <dialog
      ref={dialog}
      aria-labelledby="closing-alert-title"
      aria-describedby="closing-alert-text"
      onClick={(e) => e.target === e.currentTarget && close()}
      className="m-auto w-[calc(100%-32px)] max-w-[520px] rounded-band border border-warm-ivory bg-deep-indigo p-0 text-warm-ivory backdrop:bg-cosmic-black/80 md:rounded-band-lg"
    >
      <div className="relative flex flex-col gap-5 p-6 pt-14 md:p-10 md:pt-14">
        <button
          type="button"
          onClick={close}
          aria-label={t("close")}
          className="absolute right-3 top-3 grid size-11 place-items-center rounded-full border border-warm-ivory font-label text-[16px] text-warm-ivory transition-colors hover:bg-warm-ivory hover:text-cosmic-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solar-copper"
        >
          ✕
        </button>
        <p className="w-max rounded-full bg-solar-copper px-4 py-1.5 font-label text-[14px] uppercase tracking-[0.04em] text-cosmic-black" aria-live="polite">
          {t("countdown", { hours, minutes })}
        </p>
        <h2 id="closing-alert-title" className="font-title text-[40px] uppercase leading-[0.95] md:text-[52px]">
          {t.rich("title", { accent: copperWord })}
        </h2>
        <p id="closing-alert-text" className="font-body text-[16px] leading-[1.5] md:text-[17px]">
          {t("text", { name: eventOnSale.name })}
        </p>
        <div className="flex flex-wrap gap-3">
          {onTicketsPage ? (
            <Flip tone="copper" size="h-12 px-6 text-[16px]" onClick={close}>
              {t("cta")}
            </Flip>
          ) : (
            <Flip tone="copper" size="h-12 px-6 text-[16px]" href={ticketsHref} onClick={close}>
              {t("cta")}
            </Flip>
          )}
          <Flip tone="outlineDark" size="h-12 px-6 text-[16px]" onClick={close}>
            {t("later")}
          </Flip>
        </div>
      </div>
    </dialog>
  );
}
