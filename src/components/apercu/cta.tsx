import { Band } from "@/components/ds/band";
import { Flip } from "@/components/ds/flip";
import { ticketsHref } from "@/components/ds/links";
import { Sticker } from "@/components/ds/sticker";

export function TicketsBand() {
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
        Early bird à<br />5&nbsp;000&nbsp;FCFA
      </h2>
      <div data-reveal-up className="md:mt-7">
        <Flip href={ticketsHref} tone="black" size="h-[52px] px-8 text-[15px] md:h-14 md:text-[16px]" className="w-full md:w-auto">
          Prendre mes billets
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
