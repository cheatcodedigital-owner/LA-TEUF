// Données d'exemple : sera remplacé par la table `events` (Supabase).
// Les textes (descriptions) sont dans messages/{fr,en}.json sous Events.items.<slug>.

export type EventStatus = "bientot" | "en-vente" | "complet" | "termine";

export type TeufEvent = {
  slug: string;
  name: string;
  /** ❓ lieu précis de Cotonou à confirmer */
  venue: string | null;
  city: string;
  country: string;
  /** ❓ heures de début à confirmer (Lomé et Cotonou = UTC+0 / UTC+1) */
  startsAt: string;
  status: EventStatus;
  capacity: number;
};

export const events: TeufEvent[] = [
  {
    slug: "la-teuf-karma",
    name: "LA TEUF au KARMA",
    venue: "KARMA",
    city: "Lomé",
    country: "Togo",
    startsAt: "2026-11-20T20:00:00Z",
    status: "en-vente",
    capacity: 160,
  },
  {
    slug: "la-teuf-cotonou",
    name: "LA TEUF · Cotonou",
    venue: null,
    city: "Cotonou",
    country: "Bénin",
    startsAt: "2026-12-12T20:00:00Z",
    status: "bientot",
    capacity: 160,
  },
];

const byDate = (a: TeufEvent, b: TeufEvent) => a.startsAt.localeCompare(b.startsAt);

export const upcomingEvents = events.filter((e) => e.status !== "termine").sort(byDate);
export const pastEvents = events.filter((e) => e.status === "termine").sort((a, b) => byDate(b, a));

export const nextEvent = upcomingEvents[0];
