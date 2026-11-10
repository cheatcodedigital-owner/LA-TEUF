import Image from "next/image";
import { events } from "@/data/events";
import { Countdown } from "./countdown";
import { Ribbon } from "./ribbon";
import { Band } from "@/components/ds/band";
import { Flip } from "@/components/ds/flip";
import { ticketsHref } from "@/components/ds/links";

const karma = events[0];

export function Hero() {
  return (
    <Band duo="nuit" line={false} className="isolate flex flex-col gap-5 overflow-hidden px-2 pb-4 pt-2 md:px-12 md:pb-12 md:pt-14 lg:h-[770px] lg:flex-row lg:gap-10">
      {/* Ruban : sous le titre sur mobile, en travers du bas du hero sur grand écran */}
      <Ribbon className="relative order-3 -mx-8 flex h-12 items-center px-6 lg:absolute lg:left-[-60px] lg:top-[585px] lg:m-0 lg:h-[72px] lg:w-[1560px] lg:origin-top-left lg:px-8" />

      {/* Colonne texte : ses enfants se rangent avec la photo sur mobile (contents) */}
      <div className="contents lg:relative lg:z-10 lg:flex lg:grow-[1.35] lg:basis-0 lg:flex-col lg:justify-between lg:gap-8">
        <div data-load-stagger className="order-1 flex items-center gap-4 md:gap-6">
          <Image src="/apercu/karma-logo.png" alt="KARMA rooftop" width={600} height={200} priority unoptimized className="h-11 w-auto md:h-16" />
          <div className="h-11 w-px shrink-0 bg-warm-ivory/40 md:h-14" />
          <div className="flex flex-col gap-0.5">
            <p className="font-label text-[30px] uppercase leading-none tracking-[-0.02em] text-solar-copper md:text-[40px]">
              Ven. 20 nov.
            </p>
            <p className="font-label text-[11px] uppercase leading-[16px] tracking-[0.12em] md:text-[14px]">
              Lomé · Togo · À partir de 21 h
            </p>
          </div>
        </div>

        <h1 data-anim-slant className="order-2 font-title text-[clamp(4.25rem,19vw,7rem)] leading-[86%] tracking-[-0.03em] md:text-[clamp(7rem,13.2vw,190px)]">
          Passe le <span className="text-solar-copper">portail</span>
        </h1>

        <div className="order-5 flex flex-col-reverse gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
          <div data-load-stagger className="flex flex-col gap-3 sm:flex-row">
            <Flip href={ticketsHref} tone="copper" size="h-14 px-8 text-[16px]">
              Prendre ton billet
            </Flip>
            <Flip href="/evenements" tone="outlineDark" size="h-14 px-7 text-[16px]">
              Voir plus
            </Flip>
          </div>
          <div data-load-stagger>
            <Countdown target={karma.startsAt} />
          </div>
        </div>
      </div>

      <div data-load-stagger className="relative order-4 lg:z-10 lg:min-w-0 lg:grow lg:basis-0">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] border border-warm-ivory lg:aspect-auto lg:h-full lg:rounded-[32px]">
          <Image
            src="/apercu/hero.jpg"
            alt="Un DJ aux platines devant le public d'une soirée LA TEUF"
            fill
            priority
            unoptimized
            className="object-cover"
          />
        </div>
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
            Dès
            <br />5 000
            <br />
            FCFA
          </p>
        </div>
      </div>
    </Band>
  );
}
