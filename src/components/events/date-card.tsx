import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";
import { Flip } from "@/components/ds/flip";
import { Sticker } from "@/components/ds/sticker";
import { socials } from "@/components/layout/nav-items";
import type { TeufEvent } from "@/data/events";

/*
 * Carte date (DESIGN.md §7.3, maquettes « Cartes dates — survol d'un visuel ») : visuel + bloc infos,
 * en quinconce d'une carte à l'autre. Au survol du visuel (web) : voile Cosmic Black 82 %, accroche,
 * puis line-up en portraits détourés, contour en lueur Ultraviolet. Utilisée sur l'accueil et /evenements.
 */

const tintBg = { ivoire: "bg-warm-ivory", peche: "bg-copper-pale" } as const;
const djBg = {
  "copper-pale": "bg-copper-pale",
  "violet-pale": "bg-violet-pale",
  "solar-copper": "bg-solar-copper",
  "warm-ivory": "bg-warm-ivory",
} as const;
const whatsapp = socials.find((s) => s.label === "WhatsApp")!.href;

export async function DateCard({ event: e, reverse = false }: { event: TeufEvent; reverse?: boolean }) {
  const t = await getTranslations("Events");
  const format = await getFormatter();
  const start = new Date(e.startsAt);
  const date = format.dateTime(start, { weekday: "short", day: "numeric", month: "short", timeZone: e.timeZone });
  const onSale = e.status === "en-vente";
  const item = (key: string) => t(`items.${e.slug}.${key}`);

  return (
    <article data-card-reveal="wrap" className={`flex flex-col gap-3 lg:h-[440px] ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"}`}>
      <div
        data-card-reveal="card"
        className="group relative aspect-[4/3] overflow-hidden rounded-[24px] border border-cosmic-black transition-[box-shadow,border-color] duration-300 hover:border-ultraviolet hover:shadow-glow lg:aspect-auto lg:min-w-0 lg:grow-[1.15] lg:basis-0"
      >
        <Image src={e.image} alt={item("imageAlt")} fill sizes="(min-width: 1024px) 720px, 100vw" className="object-cover" />
        <div className="absolute inset-0 hidden flex-col justify-between bg-cosmic-black/82 px-7 pb-6 pt-[72px] text-warm-ivory opacity-0 transition-[opacity,translate] duration-300 [translate:0_12px] group-hover:opacity-100 group-hover:[translate:0_0] motion-reduce:translate-none motion-reduce:transition-opacity lg:flex">
          <div className="flex max-w-[560px] flex-col gap-3">
            <p className="font-title text-[24px] leading-[105%]">{item("hoverTitle")}</p>
            <p className="font-body text-[16px] leading-[150%]">{item("hoverText")}</p>
          </div>
          {e.lineup.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              <p className="font-label text-[13px] uppercase leading-4 tracking-[0.12em] text-solar-copper">
                {t("card.lineup")}
                {e.genres ? ` · ${e.genres}` : ""}
              </p>
              <ul className="flex gap-2.5">
                {e.lineup.map((dj) => (
                  <li key={dj.name} className={`relative h-[150px] min-w-0 flex-1 overflow-hidden rounded-2xl border border-warm-ivory ${djBg[dj.tint]}`}>
                    <Image src={dj.photo} alt={dj.name} fill sizes="160px" className="object-cover object-top" />
                    <span className="absolute bottom-2 left-2 flex h-6 items-center rounded-full bg-cosmic-black px-2.5 font-label text-[12px] uppercase leading-4 tracking-[0.04em]">
                      {dj.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="font-label text-[15px] uppercase tracking-[0.04em] text-violet-pale">{t("card.lineupSoon")}</p>
          )}
        </div>
        <p
          className={`absolute top-5 flex h-[30px] items-center gap-1.5 rounded-full border border-cosmic-black px-3 font-label text-[13px] uppercase leading-4 tracking-[0.04em] ${
            onSale ? "left-5 bg-solar-copper text-cosmic-black" : "right-5 bg-violet-pale text-deep-indigo"
          }`}
        >
          {onSale && <span className="size-[7px] rounded-full bg-cosmic-black" />}
          {t(`status.${e.status}`)}
        </p>
      </div>

      <div
        data-card-reveal="card"
        className={`relative flex flex-col justify-between gap-3.5 rounded-[24px] border border-cosmic-black p-5 text-deep-indigo md:gap-6 md:p-8 lg:grow lg:basis-0 ${tintBg[e.tint]}`}
      >
        {/* Mobile : lieu à droite de la date ; grand écran : lieu sous la date */}
        <div className="flex items-baseline justify-between gap-3 md:flex-col md:items-start md:justify-start md:gap-1.5">
          <p className="font-label text-[32px] uppercase leading-none text-copper-deep md:text-[48px]">{date}</p>
          <p className="font-label text-[14px] uppercase leading-5 tracking-[0.04em] md:text-[16px]">
            {e.city} · {e.country}
          </p>
        </div>
        <div className="flex flex-col gap-3.5">
          <h3 className="font-label text-[48px] leading-[95%] tracking-[-0.02em] md:text-[56px] lg:text-[72px]">{item("card")}</h3>
          <p className="hidden max-w-[560px] font-label text-[17px] uppercase leading-[150%] md:block">{item("teaser")}</p>
        </div>
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="font-label text-[17px] uppercase leading-6 tracking-[-0.02em] text-cosmic-black sm:text-[20px]">
            {e.priceFrom === null ? t("card.priceTbd") : t("card.from", { price: format.number(e.priceFrom) })}
          </p>
          {onSale ? (
            <Flip
              href={`/billetterie/${e.slug}`}
              tone="copper"
              size="h-[52px] px-6 text-[15px] sm:h-12"
              className="w-full sm:w-auto [&_.flip-front]:border [&_.flip-front]:border-cosmic-black"
            >
              <span className="sm:hidden">{t("card.ticketsMobile")}</span>
              <span className="hidden sm:inline">{t("card.tickets")}</span>
            </Flip>
          ) : (
            <Flip href={whatsapp} external tone="outlineLight" size="h-[52px] px-6 text-[15px] sm:h-12" className="w-full sm:w-auto">
              {t("card.notify")}
            </Flip>
          )}
        </div>
        <Sticker
          src={e.sticker.src}
          rotate={e.sticker.rotate}
          width={480}
          height={480}
          className={`hidden lg:block ${onSale ? "right-6 top-3 size-[190px]" : "right-4 top-7 size-[140px]"}`}
        />
      </div>
    </article>
  );
}
