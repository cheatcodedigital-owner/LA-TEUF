import { type TeufEvent, nextEvent, upcomingEvents } from "@/data/events";

/** Évènement dont la billetterie est ouverte (le premier à venir), s'il y en a un */
export const eventOnSale: TeufEvent | undefined = upcomingEvents.find((e) => e.status === "en-vente");

/** Cible des CTA « Billets » : la billetterie ouverte, sinon la page de la prochaine soirée (état « Billetterie fermée »),
 * sinon la liste des évènements */
const ticketsEvent = eventOnSale ?? nextEvent;
export const ticketsHref = ticketsEvent ? `/billetterie/${ticketsEvent.slug}` : "/evenements";

/** « 20.11 » à partir de la date ISO (jour en UTC : Lomé est en UTC+0, Cotonou en UTC+1 le soir même) */
export const shortDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

/** « KARMA · Lomé », ou la ville seule quand le lieu n'est pas annoncé */
export const eventPlace = (e: TeufEvent) => (e.venue ? `${e.venue} · ${e.city}` : e.city);
