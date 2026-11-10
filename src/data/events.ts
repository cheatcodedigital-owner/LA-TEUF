// Données d'exemple : sera remplacé par la table `events` (Supabase).
// Les textes (descriptions, accroches, survol) sont dans messages/{fr,en}.json sous Events.items.<slug>.

export type EventStatus = "bientot" | "en-vente" | "complet" | "termine";

/** Portrait détouré du line-up, posé sur un fond de la charte (cartes dates au survol, page de l'événement) */
export type LineupEntry = { name: string; photo: string; tint: "copper-pale" | "violet-pale" | "solar-copper" | "warm-ivory" };

export type TeufEvent = {
  slug: string;
  name: string;
  /** Lieu affiché ; null tant qu'il n'est pas annoncé */
  venue: string | null;
  city: string;
  country: string;
  /** Fuseau du lieu, pour afficher la date et l'heure locales */
  timeZone: string;
  startsAt: string;
  endsAt?: string;
  status: EventStatus;
  capacity: number;
  /** Tables (salons) vendues en plus de la capacité */
  tables?: number;
  /** Prix du billet le moins cher (FCFA), null si les tarifs ne sont pas annoncés */
  priceFrom: number | null;
  /** Visuel de la carte date (4:3 sur mobile) */
  image: string;
  /** Photo du bloc « La soirée » de la page de l'événement */
  aboutImage: string;
  /** Logo du lieu dans le hero de l'accueil */
  logo?: string;
  /** Sticker de la carte date (DESIGN.md §6.1) */
  sticker: { src: string; rotate: number };
  /** Fond du bloc infos de la carte date (duo Ivoire ou Pêche) */
  tint: "ivoire" | "peche";
  /** Styles joués, affichés avec le line-up */
  genres?: string;
  lineup: LineupEntry[];
};

export const events: TeufEvent[] = [
  {
    slug: "la-teuf-karma",
    name: "LA TEUF au KARMA",
    venue: "KARMA",
    city: "Lomé",
    country: "Togo",
    timeZone: "Africa/Lome",
    // 21 h - 3 h à Lomé (UTC+0)
    startsAt: "2026-11-20T21:00:00Z",
    endsAt: "2026-11-21T03:00:00Z",
    status: "en-vente",
    capacity: 100,
    tables: 4,
    priceFrom: 5000,
    image: "/images/events/karma.jpg",
    aboutImage: "/images/events/karma-soiree.jpg",
    logo: "/images/events/karma-logo.png",
    sticker: { src: "/stickers/dj-karma.png", rotate: 6 },
    tint: "ivoire",
    genres: "House, Afro House, Afro Tech, SA Tech",
    lineup: [
      { name: "Shayn", photo: "/images/lineup/dj-shayn.png", tint: "copper-pale" },
      { name: "AK2M", photo: "/images/lineup/dj-ak2m.png", tint: "violet-pale" },
      { name: "Wafa", photo: "/images/lineup/dj-wafa.png", tint: "solar-copper" },
      { name: "Famouz", photo: "/images/lineup/dj-famouz.png", tint: "warm-ivory" },
    ],
  },
  {
    slug: "la-teuf-cotonou",
    name: "LA TEUF · Cotonou",
    venue: "Zone 5 Plage",
    city: "Cotonou",
    country: "Bénin",
    timeZone: "Africa/Porto-Novo",
    // 16 h - 4 h à Cotonou (UTC+1)
    startsAt: "2026-12-12T15:00:00Z",
    endsAt: "2026-12-13T03:00:00Z",
    status: "bientot",
    capacity: 100,
    priceFrom: null,
    image: "/images/events/cotonou.jpg",
    aboutImage: "/images/events/cotonou.jpg",
    sticker: { src: "/stickers/palmiers.png", rotate: -8 },
    tint: "peche",
    lineup: [],
  },
];

const byDate = (a: TeufEvent, b: TeufEvent) => a.startsAt.localeCompare(b.startsAt);

export const upcomingEvents = events.filter((e) => e.status !== "termine").sort(byDate);
export const pastEvents = events.filter((e) => e.status === "termine").sort((a, b) => byDate(b, a));

export const nextEvent = upcomingEvents[0];
