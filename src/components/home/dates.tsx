import { getTranslations } from "next-intl/server";
import { Band } from "@/components/ds/band";
import { Sticker } from "@/components/ds/sticker";
import { DateCard } from "@/components/events/date-card";
import { upcomingEvents } from "@/data/events";

/** P9 Prochains rendez-vous (Lilas) : titre + calendrier, cartes dates en quinconce */
export async function Dates() {
  const t = await getTranslations("Home.dates");
  return (
    <Band duo="lilas" className="px-3 pb-3 pt-8 md:px-8 md:pb-8 md:pt-12">
      {/* Calendrier collé au titre ; au-dessus du titre sur mobile, faute de place */}
      <div className="flex flex-col items-center gap-2 pb-8 md:flex-row md:justify-center md:gap-5 md:pb-10">
        <h2 data-heading-reveal className="text-center font-title text-[36px] leading-none tracking-[-0.02em] md:text-[48px]">
          {t("title")}
        </h2>
        <Sticker
          src="/stickers/calendrier.png"
          rotate={8}
          width={360}
          height={360}
          inFlow
          className="order-first block size-20 shrink-0 md:order-none md:size-[110px]"
        />
      </div>
      <div className="flex flex-col gap-3">
        {upcomingEvents.map((e, i) => (
          <DateCard key={e.slug} event={e} reverse={i % 2 === 1} />
        ))}
      </div>
    </Band>
  );
}
