import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";
import { Band } from "@/components/ds/band";
import { Flip } from "@/components/ds/flip";
import { eventOnSale, ticketsHref } from "@/components/ds/links";
import { nextEvent } from "@/data/events";
import { Countdown } from "./countdown";
import { Ribbon } from "./ribbon";

/** P1 Hero (Nuit) : lieu et date de la prochaine soirée, « Passe le portail », ruban, photo, prix, compte à rebours */
export async function Hero() {
  const t = await getTranslations("Home.hero");
  const th = await getTranslations("Hero");
  const format = await getFormatter();
  const e = nextEvent;
  const start = new Date(e.startsAt);
  const date = format.dateTime(start, { weekday: "short", day: "numeric", month: "short", timeZone: e.timeZone });
  const time = format.dateTime(start, { hour: "numeric", timeZone: e.timeZone });
  const price = e.priceFrom === null ? null : format.number(e.priceFrom);

  return (
    <Band duo="nuit" line={false} className="isolate flex flex-col gap-5 overflow-hidden px-2 pb-4 pt-2 md:px-12 md:pb-12 md:pt-14 lg:h-[770px] lg:flex-row lg:gap-10">
      {/* Ruban : sous le titre sur mobile, en travers du bas du hero sur grand écran */}
      <Ribbon className="relative order-3 -mx-8 flex h-12 items-center px-6 lg:absolute lg:left-[-60px] lg:top-[585px] lg:m-0 lg:h-[72px] lg:w-[1560px] lg:origin-top-left lg:px-8" />

      {/* Colonne texte : ses enfants se rangent avec la photo sur mobile (contents) */}
      <div className="contents lg:relative lg:z-10 lg:flex lg:grow-[1.35] lg:basis-0 lg:flex-col lg:justify-between lg:gap-8">
        <div data-load-stagger className="order-1 flex items-center gap-4 md:gap-6">
          {e.logo && (
            <>
              <Image src={e.logo} alt={e.venue ?? e.name} width={600} height={200} priority unoptimized className="h-11 w-auto md:h-16" />
              <div className="h-11 w-px shrink-0 bg-warm-ivory/40 md:h-14" />
            </>
          )}
          <div className="flex flex-col gap-0.5">
            <p className="font-label text-[30px] uppercase leading-none tracking-[-0.02em] text-solar-copper md:text-[40px]">{date}</p>
            <p className="font-label text-[11px] uppercase leading-[16px] tracking-[0.12em] md:text-[14px]">
              {t("place", { city: e.city, country: e.country, time })}
            </p>
          </div>
        </div>

        <h1 data-anim-slant className="order-2 font-title text-[clamp(4.25rem,19vw,7rem)] leading-[86%] tracking-[-0.03em] md:text-[clamp(7rem,13.2vw,190px)]">
          {th("title1")} <span className="text-solar-copper">{th("title2")}</span>
        </h1>

        <div className="order-5 flex flex-col-reverse gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
          <div data-load-stagger className="flex flex-col gap-3 sm:flex-row">
            <Flip href={ticketsHref} tone="copper" size="h-14 px-8 text-[16px]">
              {eventOnSale ? t("cta") : t("ctaSoon")}
            </Flip>
            <Flip href="/evenements" tone="outlineDark" size="h-14 px-7 text-[16px]">
              {t("more")}
            </Flip>
          </div>
          <div data-load-stagger>
            <Countdown target={e.startsAt} />
          </div>
        </div>
      </div>

      <div data-load-stagger className="relative order-4 lg:z-10 lg:min-w-0 lg:grow lg:basis-0">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] border border-warm-ivory lg:aspect-auto lg:h-full lg:rounded-[32px]">
          <Image src="/images/hero-karma.jpg" alt={th("imageAlt")} fill priority unoptimized className="object-cover" />
        </div>
        {price && (
          <div
            className="absolute -bottom-3 right-2 flex size-[104px] items-center justify-center lg:bottom-[-12px] lg:right-[-8px] lg:size-[140px]"
            style={{ rotate: "-10deg" }}
          >
            <svg viewBox="0 0 160 160" className="absolute inset-0 size-full" aria-hidden>
              <path
                d="M80 4l13 26 27-12 1 30 29 8-17 25 17 25-29 8-1 30-27-12-13 26-13-26-27 12-1-30-29-8 17-25-17-25 29-8 1-30 27 12z"
                fill="var(--color-solar-copper)"
                stroke="var(--color-cosmic-black)"
              />
            </svg>
            <p className="relative text-center font-label text-[12px] uppercase leading-[110%] text-cosmic-black lg:text-[15px]">
              {t("from")}
              <br />
              {price}
              <br />
              {t("currency")}
            </p>
          </div>
        )}
      </div>
    </Band>
  );
}
