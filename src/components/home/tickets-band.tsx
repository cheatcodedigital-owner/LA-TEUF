import { getFormatter, getTranslations } from "next-intl/server";
import { Band } from "@/components/ds/band";
import { Flip } from "@/components/ds/flip";
import { eventOnSale, ticketsHref } from "@/components/ds/links";
import { Sticker } from "@/components/ds/sticker";

/** P5 CTA billets (Cuivre) : prix d'appel de la soirée en vente ; rien si aucune billetterie n'est ouverte */
export async function TicketsBand() {
  if (!eventOnSale || eventOnSale.priceFrom === null) return null;
  const t = await getTranslations("Home.ticketsBand");
  const format = await getFormatter();
  return (
    <Band duo="cuivre" className="flex flex-col gap-[18px] overflow-hidden px-4 pb-5 pt-9 md:block md:px-12 md:pb-12 md:pt-[72px]">
      {/* Mobile : le billet est centré au-dessus du titre, dans le flux (maquette) */}
      <Sticker
        src="/stickers/billet.png"
        rotate={-10}
        width={840}
        height={560}
        inFlow
        className="block h-[84px] w-[126px] self-center md:hidden"
      />
      <h2 data-heading-reveal className="font-title text-[60px] leading-[88%] tracking-[-0.03em] md:text-[110px] xl:text-[150px]">
        {t.rich("title", { br: () => <br />, price: format.number(eventOnSale.priceFrom) })}
      </h2>
      <p data-reveal-up className="max-w-[560px] font-body text-[16px] leading-[150%] md:mt-5 md:text-[18px]">
        {t("note")}
      </p>
      <div data-reveal-up className="md:mt-7">
        <Flip href={ticketsHref} tone="black" size="h-[52px] px-8 text-[15px] md:h-14 md:text-[16px]" className="w-full md:w-auto">
          {t("cta")}
        </Flip>
      </div>
      <Sticker
        src="/stickers/billet.png"
        rotate={-8}
        width={840}
        height={560}
        className="hidden md:block md:bottom-10 md:right-10 md:top-auto md:h-[147px] md:w-[220px] xl:bottom-auto xl:right-[110px] xl:top-20 xl:h-[220px] xl:w-[330px]"
      />
    </Band>
  );
}
