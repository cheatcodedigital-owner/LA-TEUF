"use client";

import { useTranslations } from "next-intl";

// ❓ Durée de la soirée à confirmer : on suppose 6 h pour le rappel
const DURATION_MS = 6 * 3_600_000;

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escapeIcs = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

const button =
  "hover-glow inline-flex min-h-11 items-center justify-center rounded-full px-7 py-3.5 font-label text-base uppercase tracking-wider";

export function AddToCalendar({
  slug,
  name,
  startsAt,
  location,
  description,
}: {
  slug: string;
  name: string;
  startsAt: string;
  location: string;
  description: string;
}) {
  const t = useTranslations("Thanks");
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + DURATION_MS);

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
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      <a href={google} target="_blank" rel="noopener noreferrer" className={`${button} bg-solar-copper text-cosmic-black`}>
        {t("google")}
      </a>
      <button type="button" onClick={downloadIcs} className={`${button} border border-warm-ivory/40 text-warm-ivory`}>
        {t("ics")}
      </button>
    </div>
  );
}
