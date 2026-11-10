"use client";

import { useTranslations } from "next-intl";
import { Flip } from "@/components/ds/flip";

// Durée supposée quand l'heure de fin n'est pas connue
const DURATION_MS = 6 * 3_600_000;

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escapeIcs = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

export function AddToCalendar({
  slug,
  name,
  startsAt,
  endsAt,
  location,
  description,
}: {
  slug: string;
  name: string;
  startsAt: string;
  endsAt?: string;
  location: string;
  description: string;
}) {
  const t = useTranslations("Thanks");
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : new Date(start.getTime() + DURATION_MS);

  const google = `https://calendar.google.com/calendar/render?${new URLSearchParams({
    action: "TEMPLATE",
    text: name,
    dates: `${stamp(start)}/${stamp(end)}`,
    location,
    details: description,
  })}`;

  function downloadIcs() {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//LA TEUF ELECTRONIQUE//Billetterie//FR",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${slug}-${stamp(start)}@lateufelectronic.com`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${escapeIcs(name)}`,
      `LOCATION:${escapeIcs(location)}`,
      `DESCRIPTION:${escapeIcs(description)}`,
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcs(name)}`,
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Flip href={google} external tone="ivory" size="h-[52px] px-6 text-[16px]">
        {t("google")}
      </Flip>
      <Flip tone="outlineDark" size="h-[52px] px-6 text-[16px]" onClick={downloadIcs}>
        {t("ics")}
      </Flip>
    </div>
  );
}
