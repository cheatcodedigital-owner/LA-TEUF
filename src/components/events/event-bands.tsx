import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";
import { Band } from "@/components/ds/band";
import { ArrowUpRight } from "@/components/ds/icons";
import { Sticker } from "@/components/ds/sticker";
import { DjCard } from "@/components/djs/dj-card";
import { djs } from "@/data/djs";
import type { TeufEvent } from "@/data/events";
import { Link } from "@/i18n/navigation";

/* Bandes de la page d'un événement (maquette « Événement KARMA ») */

/** En-tête Cuivre : retour, nom de la soirée, infos clés (date, heure, lieu, billets), sticker du lieu */
export async function EventHeader({ event: e }: { event: TeufEvent }) {
  const t = await getTranslations("Ticketing");
  const format = await getFormatter();
  const start = new Date(e.startsAt);
  const tz = e.timeZone;
  const date = format.dateTime(start, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: tz });
  // « 03 h » → « 3 h »
  const hour = (d: Date) => format.dateTime(d, { hour: "numeric", timeZone: tz }).replace(/^0(?=\d)/, "");
  const time = e.endsAt ? `${hour(start)} – ${hour(new Date(e.endsAt))}` : hour(start);
  const [first, ...rest] = e.name.split(" au ");

  const facts = [
    { label: t("header.date"), value: date },
    { label: t("header.time"), value: time },
    { label: t("header.venue"), value: e.venue ? `${e.venue} · ${e.city}, ${e.country}` : `${e.city}, ${e.country}` },
    e.priceFrom !== null
      ? { label: t("header.tickets"), value: t("header.from", { price: format.number(e.priceFrom) }) }
      : { label: t("header.tickets"), value: t("header.tbd") },
  ];
  // Mobile : la capacité remplace le prix (déjà dans la barre d'achat en bas d'écran)
  const capacity = { label: t("header.capacity"), value: e.tables ? t("header.capacityValue", { count: e.capacity, tables: e.tables }) : String(e.capacity) };

  return (
    <Band duo="cuivre" className="flex flex-col gap-5 overflow-hidden px-[18px] pb-6 pt-5 md:gap-7 md:px-12 md:pb-11 md:pt-10">
      <div className="flex items-start justify-between">
        <Link
          href="/evenements"
          aria-label={t("back")}
          className="press flex size-11 items-center justify-center gap-2 rounded-full border border-cosmic-black font-label text-[14px] uppercase tracking-[0.04em] md:h-10 md:w-auto md:pl-3.5 md:pr-[18px]"
        >
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
            <path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="hidden md:inline">{t("back")}</span>
        </Link>
        <Sticker
          src={e.sticker.src}
          rotate={e.sticker.rotate}
          width={480}
          height={480}
          inFlow
          className="-mb-10 -mt-2 block size-[120px] shrink-0 md:absolute md:right-[60px] md:top-9 md:m-0 md:size-[220px] xl:size-[330px]"
        />
      </div>
      <h1 data-anim-slant className="font-title text-[64px] leading-[88%] tracking-[-0.03em] md:text-[clamp(96px,10.4vw,150px)]">
        {first}
        {rest.length > 0 && (
          <>
            <br />
            au {rest.join(" au ")}
          </>
        )}
      </h1>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-cosmic-black pt-4 md:flex md:flex-wrap md:items-end md:gap-x-12 md:gap-y-4 md:pt-5">
        {[...facts, capacity].map((f, i) => (
          <div key={f.label} data-load-stagger className={`flex flex-col gap-1 ${i === 3 ? "hidden md:flex" : i === 4 ? "md:hidden" : ""}`}>
            <dt className="font-label text-[12px] uppercase leading-4 tracking-[0.08em] md:text-[13px]">{f.label}</dt>
            <dd className="font-label text-[19px] uppercase leading-6 md:text-[24px] md:leading-9">{f.value}</dd>
          </div>
        ))}
      </dl>
    </Band>
  );
}

/** « La soirée » (Ivoire) : photo + titre + texte de présentation */
export async function EventAbout({ event: e }: { event: TeufEvent }) {
  const t = await getTranslations(`Events.items.${e.slug}`);
  const paragraphs = t.raw("about") as string[];
  return (
    <Band duo="ivoire" className="flex flex-col gap-6 p-5 md:flex-row md:gap-10 md:p-10">
      <div data-reveal-up className="relative aspect-[4/3] shrink-0 overflow-hidden rounded-[24px] border border-cosmic-black md:aspect-auto md:w-[300px] md:self-stretch lg:w-[340px]">
        <Image src={e.aboutImage} alt={t("aboutImageAlt")} fill sizes="(min-width: 768px) 340px, 100vw" className="object-cover" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-5 md:gap-6">
        <h2 data-heading-reveal className="font-title text-[32px] leading-[96%] md:text-[40px]">
          {t("aboutTitle")}
          {e.slug === "la-teuf-karma" && <span aria-hidden> 🇹🇬🇧🇯</span>}
        </h2>
        <div data-reveal-up className="flex flex-col gap-4 font-body text-[16px] leading-[150%] md:text-[18px]">
          <p className="text-[18px] leading-[130%] md:text-[20px]">{t("aboutLead")}</p>
          {paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </div>
    </Band>
  );
}

/** Line-up (Indigo) : portraits des DJs de la soirée, ou à défaut ceux qui ont déjà joué */
export async function EventLineup({ event: e }: { event: TeufEvent }) {
  const t = await getTranslations("Ticketing");
  const td = await getTranslations("Djs");
  const announced = e.lineup.length > 0;
  const cards = announced
    ? e.lineup.map((d) => ({ name: d.name, photo: d.photo, tint: d.tint, live: false }))
    : djs.slice(0, 4).map((d) => ({ name: d.name, photo: d.portrait, tint: d.tint, live: d.kind === "live" }));
  const accent = (c: React.ReactNode) => <span className="text-solar-copper">{c}</span>;

  return (
    <Band duo="indigo" className="flex flex-col gap-6 p-5 md:gap-8 md:px-12 md:py-10">
      <div className="flex flex-col gap-5">
        <h2 data-heading-reveal className="font-title text-[36px] leading-[95%] tracking-[-0.02em] md:text-[48px]">
          {announced ? t.rich("lineupTitle", { venue: e.venue ?? e.city, accent }) : t.rich("lineupPastTitle", { accent })}
        </h2>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
          {announced && e.genres && (
            <p className="max-w-[520px] font-body text-[16px] leading-[150%] md:text-[17px]">
              {t("lineupMeta", { genres: e.genres, count: e.lineup.length })}
            </p>
          )}
          <Link
            href="/djs"
            className="press flex h-12 items-center gap-3 self-start rounded-full border border-warm-ivory pl-[22px] pr-1.5 font-label text-[15px] uppercase tracking-[0.04em]"
          >
            {t("allDjs")}
            <span className="flex size-9 items-center justify-center rounded-full border border-warm-ivory">
              <ArrowUpRight className="size-3.5" />
            </span>
          </Link>
        </div>
      </div>
      <div data-card-reveal="wrap" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c, i) => (
          <DjCard
            key={c.name}
            name={c.name}
            photo={c.photo}
            tint={c.tint}
            live={c.live}
            role={td(`kind.${c.live ? "live" : "dj"}`)}
            offset={i % 2 === 1}
            className="h-[220px] md:h-[300px] xl:h-[380px]"
          />
        ))}
      </div>
    </Band>
  );
}
