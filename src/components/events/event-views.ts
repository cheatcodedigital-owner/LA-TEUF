import { getFormatter, getTranslations } from "next-intl/server";
import type { TeufEvent } from "@/data/events";
import type { EventView, ShowcaseLabels } from "./events-showcase";

// Prépare (côté serveur, traduit) les données que la grille de cartes affiche
export async function getEventViews(events: TeufEvent[]): Promise<EventView[]> {
  const t = await getTranslations("Events");
  const format = await getFormatter();

  return events.map((e) => {
    const startsAt = new Date(e.startsAt);
    return {
      slug: e.slug,
      name: e.name,
      dateShort: format.dateTime(startsAt, { day: "numeric", month: "short", timeZone: "UTC" }),
      dateLong: format.dateTime(startsAt, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
      place: `${e.city}, ${e.country}`,
      venue: e.venue,
      status: e.status,
      statusLabel: t(`status.${e.status}`),
      description: t(`items.${e.slug}.description`),
      rows: [
        { label: t("venue"), value: e.venue ?? t("venueTbd") },
        { label: t("city"), value: `${e.city}, ${e.country}` },
        { label: t("capacity"), value: t("capacityValue", { count: e.capacity }) },
      ],
    };
  });
}

export async function getShowcaseLabels(): Promise<ShowcaseLabels> {
  const t = await getTranslations("Events");
  return {
    details: t("details"),
    close: t("close"),
    tickets: t("tickets"),
    ticketsSoon: t("ticketsSoon"),
    soldOut: t("soldOut"),
    practical: t("practical"),
    lineup: t("lineup"),
    lineupTbd: t("lineupTbd"),
  };
}
