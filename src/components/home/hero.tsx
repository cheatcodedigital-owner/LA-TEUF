import Image from "next/image";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { nextEvent } from "@/data/events";
import { Countdown } from "./countdown";
import { RevealTitle } from "./reveal-title";

export async function Hero() {
  const t = await getTranslations("Hero");
  const format = await getFormatter();
  const locale = await getLocale();
  // Titre borné par la largeur ET la hauteur de l'écran (svh) : le hero doit tenir en entier.
  // Les lignes FR sont plus courtes (« Passe le » / « portail ») : on le grossit en proportion.
  // Classes écrites en entier : Tailwind ne détecte pas celles construites par concaténation.
  const titleSize =
    locale === "fr"
      ? "text-[clamp(3rem,min(calc(1.25rem+14vw),calc((100svh_-_34rem)_/_2.4)),9rem)] short:text-[clamp(3rem,min(calc(1.25rem+14vw),calc((100svh_-_28rem)_/_2.4)),9rem)] md:text-[clamp(3rem,min(calc(1.25rem+14vw),calc((100svh_-_26rem)_/_2.4)),9rem)] md:short:text-[clamp(3rem,min(calc(1.25rem+14vw),calc((100svh_-_24rem)_/_2.4)),9rem)] lg:text-[clamp(3rem,min(13vw,calc((100svh_-_29rem)_/_2.4)),10rem)] lg:short:text-[clamp(3rem,min(13vw,calc((100svh_-_21rem)_/_2.4)),10rem)]"
      : "text-[clamp(3rem,min(calc(1.25rem+11.5vw),calc((100svh_-_34rem)_/_3)),9rem)] short:text-[clamp(3rem,min(calc(1.25rem+11.5vw),calc((100svh_-_28rem)_/_3)),9rem)] md:text-[clamp(3rem,min(calc(1.25rem+11.5vw),calc((100svh_-_26rem)_/_2.4)),9rem)] md:short:text-[clamp(3rem,min(calc(1.25rem+11.5vw),calc((100svh_-_24rem)_/_2.4)),9rem)] lg:text-[clamp(3rem,min(13.5vw,calc((100svh_-_29rem)_/_2.4)),10rem)] lg:short:text-[clamp(3rem,min(13.5vw,calc((100svh_-_21rem)_/_2.4)),10rem)]";

  const date = format.dateTime(new Date(nextEvent.startsAt), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <section className="home-reveal relative isolate flex min-h-[max(30rem,calc(100svh-6.25rem))] flex-col overflow-hidden border border-frame-line rounded-card bg-deep-indigo">
      <Image
        src="/images/hero-cabine.jpg"
        alt={t("imageAlt")}
        fill
        priority
        sizes="(min-width: 1152px) 1152px, 100vw"
        className="-z-20 object-cover object-[50%_72%]"
      />
      {/* Voile plus dense en haut (header lisible) et en bas (bloc infos) */}
      <div
        className="absolute inset-0 -z-10 bg-linear-to-b from-cosmic-black/60 via-cosmic-black/10 to-cosmic-black/70"
        aria-hidden
      />

      <div className="flex flex-1 flex-col justify-between gap-6 px-4 pb-4 pt-8 short:gap-4 short:pb-4 short:pt-6 sm:px-6 sm:pb-6 md:gap-8 md:px-8 md:pt-12 md:short:pt-8 lg:gap-10 lg:px-12 lg:pb-8 lg:pt-24 lg:short:pt-12">
        <h1 className={`max-w-5xl font-title ${titleSize} leading-[1.05]`}>
          <RevealTitle lines={[t("title1"), t("title2")]} accent={t("titleAccent")} />
        </h1>

        <div className="reveal-fade flex w-full flex-col items-start gap-5 rounded-card bg-cosmic-black p-4 short:gap-3 short:p-4 sm:p-5 md:flex-row md:items-center md:justify-between md:gap-6 md:p-6 md:short:gap-4 md:short:p-5 lg:gap-6 lg:p-8 lg:short:p-5 lg:max-xl:gap-4 lg:max-xl:p-6 xl:gap-8">
          {/* Sous 1024 px : colonne gauche (infos + décompte) et colonne boutons ; dès 1024 px le groupe disparaît (contents) et les trois blocs sont alignés sur une ligne */}
          <div className="flex w-full flex-col items-start gap-4 md:w-auto md:gap-5 lg:contents">
            <div className="flex flex-col items-start gap-1 text-left">
              <p className="font-label text-[clamp(1.5rem,1rem+2.8vw,2.25rem)] uppercase tracking-wide text-solar-copper short:text-[clamp(1.25rem,0.8rem+2.4vw,2rem)] lg:text-4xl lg:max-xl:text-[clamp(2rem,3.4vw,2.25rem)] lg:short:text-3xl">
                {date}
              </p>
              <p className="text-[clamp(0.95rem,0.8rem+0.7vw,1.125rem)] text-warm-ivory short:text-base lg:text-lg">
                {nextEvent.name} · {nextEvent.city}, {nextEvent.country}
              </p>
            </div>

            <Countdown target={nextEvent.startsAt} />
          </div>

          <div className="grid w-full max-w-[26rem] grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-3 max-md:short:grid-cols-2 max-md:short:gap-2 md:max-w-none md:w-[clamp(10rem,18vw,11rem)] md:grid-cols-1 md:gap-4 lg:w-44 xl:w-48">
            <Link
              href={`/billetterie/${nextEvent.slug}`}
              className="hover-glow flex min-h-11 items-center justify-center whitespace-nowrap rounded-full bg-solar-copper px-6 py-3 font-label text-base uppercase tracking-wider max-md:short:px-3 max-md:short:text-sm text-cosmic-black short:min-h-10 short:py-2 md:min-h-12 md:text-lg md:short:min-h-11 lg:min-h-11 lg:px-8 lg:py-3.5 lg:text-base lg:short:py-2"
            >
              {t("tickets")}
            </Link>
            <Link
              href="/evenements"
              className="hover-glow flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-warm-ivory/40 px-6 py-3 font-label text-base uppercase tracking-wider max-md:short:px-3 max-md:short:text-sm text-warm-ivory short:min-h-10 short:py-2 md:min-h-12 md:text-lg md:short:min-h-11 lg:min-h-11 lg:px-8 lg:py-3.5 lg:text-base lg:short:py-2"
            >
              {t("agenda")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
