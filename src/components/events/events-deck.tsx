"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useRef, useState, useSyncExternalStore } from "react";
import { ButtonLink, Keyhole, StatusBadge } from "@/components/ui";
import { EventModal, type EventView, type Opened, type ShowcaseLabels } from "./events-showcase";

// Pile de cartes événements, adaptée du composant « animated-card » de 21st.dev :
// - la carte du dessus s'incline en 3D vers le curseur (ressort), les autres sont en éventail derrière ;
// - un clic (ou Entrée) sur une carte arrière la passe au premier plan ;
// - pas d'ombres portées (charte) : le relief vient de l'inclinaison, du filet et du contour au survol ;
// - prefers-reduced-motion : pas d'inclinaison, transitions instantanées.

type Slot = { x: string; y: number; rotate: number; scale: number };

// Position de chaque carte selon son rang (0 = devant) : au centre, puis à droite, puis à gauche
const SLOTS: Slot[] = [
  { x: "0%", y: 0, rotate: 0, scale: 1 },
  { x: "54%", y: 30, rotate: 7, scale: 0.94 },
  { x: "-54%", y: 30, rotate: -7, scale: 0.94 },
];
const BEHIND: Slot = { x: "0%", y: 52, rotate: 0, scale: 0.86 };

// Sur petit écran il n'y a pas la place d'ouvrir l'éventail sur les côtés : les cartes arrière dépassent par le bas
const SLOTS_NARROW: Slot[] = [
  { x: "0%", y: 0, rotate: 0, scale: 1 },
  { x: "10%", y: 70, rotate: 4, scale: 0.94 },
  { x: "-10%", y: 70, rotate: -4, scale: 0.94 },
];

const NARROW_QUERY = "(max-width: 639px)";
function useNarrow() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(NARROW_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false,
  );
}

const TOP_BORDER = {
  "en-vente": "border-t-solar-copper",
  bientot: "border-t-ultraviolet",
  complet: "border-t-warm-ivory/40",
  termine: "border-t-warm-ivory/20",
} as const;

function DeckCard({
  event,
  rank,
  labels,
  reduced,
  narrow,
  onSelect,
  onOpen,
}: {
  event: EventView;
  rank: number;
  labels: ShowcaseLabels;
  reduced: boolean;
  narrow: boolean;
  onSelect: () => void;
  onOpen: (trigger: HTMLElement) => void;
}) {
  const front = rank === 0;
  const slot = (narrow ? SLOTS_NARROW : SLOTS)[rank] ?? BEHIND;

  // Inclinaison 3D vers le curseur, amortie par un ressort (carte du dessus uniquement)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const cardRef = useRef<HTMLElement>(null);
  const rotateX = useSpring(useTransform(mouseY, [-150, 150], [9, -9]), { stiffness: 300, damping: 20, mass: 0.5 });
  const rotateY = useSpring(useTransform(mouseX, [-150, 150], [-9, 9]), { stiffness: 300, damping: 20, mass: 0.5 });
  const tilt = front && !reduced;

  function onPointerMove(e: React.PointerEvent) {
    if (!tilt || e.pointerType !== "mouse" || !cardRef.current) return;
    const { left, top, width, height } = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - left - width / 2);
    mouseY.set(e.clientY - top - height / 2);
  }
  function resetTilt() {
    mouseX.set(0);
    mouseY.set(0);
  }

  const behindProps = front
    ? {}
    : {
        role: "button" as const,
        tabIndex: 0,
        "aria-label": `${labels.details} · ${event.name}`,
        onClick: onSelect,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        },
      };

  return (
    <motion.article
      ref={cardRef}
      {...behindProps}
      onPointerMove={onPointerMove}
      onPointerLeave={resetTilt}
      initial={false}
      animate={{ x: slot.x, y: slot.y, rotate: slot.rotate, scale: slot.scale }}
      transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 26 }}
      style={{
        rotateX: tilt ? rotateX : 0,
        rotateY: tilt ? rotateY : 0,
        zIndex: 30 - rank,
      }}
      className={`hover-glow absolute inset-x-0 top-0 mx-auto w-[min(19rem,76vw)] transform-gpu rounded-card border-t-[3px] bg-cosmic-black p-3 pb-5 ${TOP_BORDER[event.status]} ${
        front ? "" : "cursor-pointer"
      }`}
    >
      <div>
        <div className="relative aspect-[5/4] overflow-hidden rounded-[22px] bg-deep-indigo">
          <Keyhole className="absolute left-1/2 top-1/2 h-3/5 -translate-x-1/2 -translate-y-1/2 text-cosmic-black/50" />
          <div className="absolute left-3 top-3">
            <StatusBadge status={event.status} label={event.statusLabel} />
          </div>
        </div>

        <div className="px-3 pt-4">
          <p className="font-label text-3xl uppercase tracking-wide text-solar-copper">{event.dateShort}</p>
          <h3 className="mt-1 font-title text-2xl leading-tight">{event.name}</h3>
          <p className="mt-1 text-warm-ivory/70">{event.place}</p>

          {/* Actions sur la carte du dessus ; hauteur réservée pour garder des cartes identiques */}
          <div className="mt-4 grid min-h-[6.25rem] content-start gap-2">
            {front && (
              <>
                {event.status === "en-vente" && (
                  <ButtonLink href={`/billetterie/${event.slug}`} className="w-full px-4">
                    {labels.tickets}
                  </ButtonLink>
                )}
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={(e) => onOpen(e.currentTarget)}
                  className="hover-glow inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-full border border-warm-ivory/40 px-4 font-label text-base uppercase tracking-wider"
                >
                  {labels.details}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function EventsDeck({
  events,
  labels,
  hint,
}: {
  events: EventView[];
  labels: ShowcaseLabels;
  hint: string;
}) {
  const reduced = useReducedMotion() ?? false;
  const narrow = useNarrow();
  const [order, setOrder] = useState(() => events.map((e) => e.slug));
  const [opened, setOpened] = useState<Opened | null>(null);

  const bringToFront = (slug: string) => setOrder((o) => [slug, ...o.filter((s) => s !== slug)]);

  return (
    <>
      <div className="relative mx-auto h-[37rem] w-full max-w-3xl" style={{ perspective: "1000px" }}>
        {events.map((event) => (
          <DeckCard
            key={event.slug}
            event={event}
            rank={order.indexOf(event.slug)}
            labels={labels}
            reduced={reduced}
            narrow={narrow}
            onSelect={() => bringToFront(event.slug)}
            onOpen={(trigger) => setOpened({ event, trigger })}
          />
        ))}
      </div>
      {events.length > 1 && (
        <p className="mt-2 text-center font-label text-sm uppercase tracking-wider text-warm-ivory/70">{hint}</p>
      )}

      {opened && <EventModal opened={opened} labels={labels} onClosed={() => setOpened(null)} />}
    </>
  );
}
