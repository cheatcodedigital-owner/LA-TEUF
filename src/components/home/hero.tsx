import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { nextEvent } from "@/data/events";
import { Countdown } from "./countdown";
import { RevealTitle } from "./reveal-title";

export async function Hero() {
  const t = await getTranslations("Hero");
  const format = await getFormatter();

  const date = format.dateTime(new Date(nextEvent.startsAt), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <section className="home-reveal relative isolate overflow-hidden rounded-card bg-deep-indigo">
      <Image
        src="/images/hero.jpg"
        alt={t("imageAlt")}
        fill
        priority
        sizes="(min-width: 1152px) 1152px, 100vw"
        className="-z-20 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-cosmic-black/60" aria-hidden />

      <div className="px-5 pb-10 pt-24 md:px-12 md:pb-14 md:pt-40">
        <h1 className="max-w-4xl font-title text-[clamp(2.75rem,12.5vw,6.5rem)] leading-[1.05]">
          <RevealTitle lines={[t("title1"), t("title2")]} accent={t("titleAccent")} />
        </h1>

        <div className="reveal-fade mt-8 flex flex-col gap-1">
          <p className="font-label text-3xl uppercase tracking-wide text-solar-copper md:text-4xl">
            {date}
          </p>
          <p className="text-lg text-warm-ivory/90">
            {nextEvent.name} · {nextEvent.city}, {nextEvent.country}
          </p>
        </div>

        <div className="reveal-fade mt-8">
          <Countdown target={nextEvent.startsAt} />
        </div>

        <div className="reveal-fade mt-10 flex flex-wrap gap-3">
          <Link
            href={`/billetterie/${nextEvent.slug}`}
            className="hover-glow inline-flex min-h-11 w-40 items-center justify-center rounded-full bg-solar-copper py-3.5 font-label text-base uppercase tracking-wider text-cosmic-black"
          >
            {t("tickets")}
          </Link>
          <Link
            href="/evenements"
            className="hover-glow inline-flex min-h-11 w-40 items-center justify-center rounded-full bg-cosmic-black py-3.5 font-label text-base uppercase tracking-wider text-warm-ivory"
          >
            {t("agenda")}
          </Link>
        </div>
      </div>
    </section>
  );
}
