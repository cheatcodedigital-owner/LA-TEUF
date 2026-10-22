"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ButtonLink, Keyhole, StatusBadge, type Status } from "@/components/ui";

export type EventView = {
  slug: string;
  name: string;
  dateShort: string;
  dateLong: string;
  place: string;
  venue: string | null;
  status: Status;
  statusLabel: string;
  description: string;
  rows: { label: string; value: string }[];
};

export type ShowcaseLabels = {
  details: string;
  close: string;
  tickets: string;
  ticketsSoon: string;
  soldOut: string;
  practical: string;
  lineup: string;
  lineupTbd: string;
};

const DURATION = 300;
const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

// --- Faces de la carte ------------------------------------------------------------------

function Details({ event, labels }: { event: EventView; labels: ShowcaseLabels }) {
  return (
    <div className="h-full overflow-y-auto overscroll-contain rounded-card bg-deep-indigo px-6 py-8 md:px-9">
      <StatusBadge status={event.status} label={event.statusLabel} />
      <h2 className="mt-4 font-title text-4xl leading-[1.05] md:text-5xl">{event.name}</h2>
      <p className="mt-4 font-label text-2xl uppercase tracking-wide text-solar-copper md:text-3xl">
        {event.dateLong}
      </p>
      <p className="mt-1 text-warm-ivory/90">
        {event.venue ? `${event.venue} · ` : ""}
        {event.place}
      </p>

      <div className="mt-6">
        {event.status === "en-vente" && (
          <ButtonLink href={`/billetterie/${event.slug}`} className="w-40 px-0">
            {labels.tickets}
          </ButtonLink>
        )}
        {event.status === "bientot" && <p className="text-warm-ivory/80">{labels.ticketsSoon}</p>}
        {event.status === "complet" && (
          <p className="font-label text-xl uppercase tracking-wider text-solar-copper">{labels.soldOut}</p>
        )}
      </div>

      <p className="mt-8 text-warm-ivory/90">{event.description}</p>

      <h3 className="mt-8 font-title text-2xl">{labels.practical}</h3>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {event.rows.map((r) => (
          <div key={r.label}>
            <dt className="font-label text-sm uppercase tracking-widest text-solar-copper">{r.label}</dt>
            <dd className="mt-1">{r.value}</dd>
          </div>
        ))}
      </dl>

      <h3 className="mt-8 font-title text-2xl">{labels.lineup}</h3>
      <p className="mt-3 text-warm-ivory/80">{labels.lineupTbd}</p>

    </div>
  );
}

// --- Fenêtre : fond assombri en fondu, carte au premier plan -----------------------------

type Opened = { event: EventView; trigger: HTMLElement };

function EventModal({ opened, labels, onClosed }: { opened: Opened; labels: ShowcaseLabels; onClosed: () => void }) {
  const { event } = opened;
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const animsRef = useRef<Animation[]>([]);
  const closingRef = useRef(false);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const options: KeyframeAnimationOptions = { duration: DURATION, easing: EASING, fill: "both" };
    const anims = [
      backdrop.animate([{ opacity: 0 }, { opacity: 1 }], options),
      panel.animate(
        reduced
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0, transform: "translateY(18px) scale(0.97)" },
              { opacity: 1, transform: "translateY(0) scale(1)" },
            ],
        options,
      ),
    ];
    animsRef.current = anims;
    return () => anims.forEach((a) => a.cancel());
  }, []);

  function close() {
    if (closingRef.current) return;
    closingRef.current = true;
    const anims = animsRef.current;
    anims.forEach((a) => a.reverse());
    Promise.all(anims.map((a) => a.finished)).then(onClosed).catch(() => {});
  }

  // Verrouille le scroll de la page, Échap ferme, focus sur la fenêtre puis retour au déclencheur
  const latestClose = useRef(close);
  useEffect(() => {
    latestClose.current = close;
  });
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && latestClose.current();
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    const trigger = opened.trigger;
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      trigger.focus();
    };
  }, [opened.trigger]);

  return (
    <div role="dialog" aria-modal="true" aria-label={event.name} className="fixed inset-0 z-60 grid place-items-center p-4">
      <div ref={backdropRef} onClick={close} className="absolute inset-0 bg-cosmic-black/85" />
      <button
        ref={closeRef}
        type="button"
        onClick={close}
        aria-label={labels.close}
        className="absolute right-4 top-4 z-10 grid size-11 place-items-center rounded-full bg-deep-indigo"
      >
        <span className="relative block size-5" aria-hidden>
          <span className="absolute left-0 top-1/2 h-0.5 w-5 rotate-45 rounded bg-warm-ivory" />
          <span className="absolute left-0 top-1/2 h-0.5 w-5 -rotate-45 rounded bg-warm-ivory" />
        </span>
      </button>

      <div ref={panelRef} className="relative h-[min(86dvh,760px)] w-[min(92vw,520px)]">
        <Details event={event} labels={labels} />
      </div>
    </div>
  );
}

// --- Grille de cartes --------------------------------------------------------------------

export function EventsShowcase({ events, labels }: { events: EventView[]; labels: ShowcaseLabels }) {
  const [opened, setOpened] = useState<Opened | null>(null);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-3">
        {events.map((event) => {
          return (
            <article
              key={event.slug}
              className="hover-glow rounded-card bg-cosmic-black"
            >
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={(e) => {
                  const trigger = e.currentTarget;
                  setOpened({ event, trigger });
                }}
                className="block w-full cursor-pointer rounded-card p-3 pb-6 text-left"
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-deep-indigo">
                  <Keyhole className="absolute left-1/2 top-1/2 h-3/5 -translate-x-1/2 -translate-y-1/2 text-cosmic-black/50" />
                  <div className="absolute left-3 top-3">
                    <StatusBadge status={event.status} label={event.statusLabel} />
                  </div>
                </div>
                <div className="px-3 pt-5">
                  <p className="font-label text-3xl uppercase tracking-wide text-solar-copper">{event.dateShort}</p>
                  <h3 className="mt-2 font-title text-2xl">{event.name}</h3>
                  <p className="mt-1 text-warm-ivory/70">{event.place}</p>
                  <span
                    aria-hidden
                    className="mt-5 inline-flex min-h-11 w-40 items-center justify-center rounded-full border border-warm-ivory/40 py-3.5 font-label text-base uppercase tracking-wider"
                  >
                    {labels.details}
                  </span>
                </div>
              </button>
            </article>
          );
        })}
      </div>

      {opened && <EventModal opened={opened} labels={labels} onClosed={() => setOpened(null)} />}
    </>
  );
}
