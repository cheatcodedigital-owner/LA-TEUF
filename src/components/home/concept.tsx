"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Band } from "@/components/ds/band";
import { PlusIcon } from "@/components/ds/icons";
import { Sticker } from "@/components/ds/sticker";

// Illustrations des 3 cartes (textes dans Home.concept.cards)
const cards = [
  { img: "/stickers/danseurs.png", bg: "bg-violet-pale", rotate: -4 },
  { img: "/stickers/percussion.png", bg: "bg-copper-pale", rotate: 3 },
  { img: "/stickers/enlaces.png", bg: "bg-violet-pale", rotate: -3 },
];

// Dépliement : grille 0fr → 1fr (hauteur automatique animée), courbe « slush » de la page
const unfold = "grid transition-[grid-template-rows] duration-[650ms] ease-[cubic-bezier(0.65,0.05,0,1)] motion-reduce:transition-none";

export function Concept() {
  // Toutes les cartes sont fermées au chargement (web et mobile)
  const [open, setOpen] = useState(-1);
  const t = useTranslations("Home.concept");

  return (
    <Band duo="ivoire" className="px-3 pb-3 pt-14 md:px-14 md:pb-16 md:pt-24">
      <div className="px-2 md:px-0">
        <h2 data-heading-reveal className="font-title text-[48px] leading-[92%] tracking-[-0.02em] md:text-[88px] xl:text-[124px]">
          {/* Retour à la ligne sur mobile sans <br> (SplitText garderait la coupure sur grand écran) */}
          {t.rich("title", {
            line: (c) => <span className="block md:inline">{c}</span>,
            accent: (c) => <span className="text-copper-deep">{c}</span>,
          })}
        </h2>
        <p data-reveal-up className="mt-5 max-w-[900px] font-body text-[15px] leading-[150%] md:mt-7 md:text-[22px]">
          {t("intro")}
        </p>
      </div>
      <Sticker
        src="/stickers/etoiles.png"
        rotate={8}
        width={400}
        height={400}
        className="right-8 top-[96px] z-10 size-16 md:right-10 md:top-10 md:size-24 xl:right-[150px] xl:top-[240px] xl:size-[130px]"
      />

      <div data-card-reveal="wrap" className="mt-8 flex flex-col gap-3 md:mt-16 lg:flex-row lg:items-start lg:gap-6">
        {cards.map((c, i) => {
          const isOpen = open === i;
          return (
            <div key={c.img} data-card-reveal="card" className={`overflow-hidden rounded-[24px] border border-cosmic-black ${c.bg} lg:min-w-0 lg:flex-1`}>
              {/* Illustration : toujours visible sur grand écran, se déplie avec la carte sur mobile */}
              <div className={`${unfold} ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"} lg:grid-rows-[1fr]`}>
                <div className="min-h-0 overflow-hidden">
                  <div className="flex h-[200px] items-center justify-center border-b border-cosmic-black lg:h-[260px]">
                    <Image
                      src={c.img}
                      alt=""
                      width={600}
                      height={600}
                      unoptimized
                      className={`size-[180px] object-contain transition-[scale,opacity] duration-700 ease-[cubic-bezier(0.65,0.05,0,1)] lg:size-[230px] lg:scale-100 lg:opacity-100 ${
                        isOpen ? "scale-100 opacity-100" : "scale-75 opacity-0"
                      }`}
                      style={{ rotate: `${c.rotate}deg` }}
                    />
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                aria-controls={`concept-${i}`}
                className="flex w-full items-center p-4 text-left lg:p-7"
              >
                {/* Vignette de la carte fermée (mobile) : se replie quand la grande illustration arrive */}
                <span
                  aria-hidden
                  className={`shrink-0 overflow-hidden transition-[width,margin,opacity] duration-[600ms] ease-[cubic-bezier(0.65,0.05,0,1)] lg:hidden ${
                    isOpen ? "mr-0 w-0 opacity-0" : "mr-4 w-14 opacity-100"
                  }`}
                >
                  <Image src={c.img} alt="" width={600} height={600} unoptimized className="size-14 max-w-none object-contain" />
                </span>
                <span className="flex-1 font-title text-[20px] leading-[105%] lg:text-[24px]">{t(`cards.${i}.title`)}</span>
                <span
                  className={`ml-4 flex size-11 shrink-0 items-center justify-center rounded-full border border-cosmic-black transition-colors duration-300 lg:size-12 ${
                    isOpen ? "bg-cosmic-black text-warm-ivory" : "text-cosmic-black"
                  }`}
                >
                  <PlusIcon open={isOpen} />
                </span>
              </button>
              {/* Texte : se déplie vers le bas (hauteur 0 → auto), puis monte légèrement en apparaissant */}
              <div id={`concept-${i}`} className={`${unfold} ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="min-h-0 overflow-hidden">
                  <p
                    className={`px-4 pb-6 font-body text-[15px] leading-[150%] transition-[opacity,translate] duration-700 ease-[cubic-bezier(0.65,0.05,0,1)] lg:px-7 lg:pb-8 lg:text-[18px] ${
                      isOpen ? "translate-y-0 opacity-100 delay-100" : "-translate-y-3 opacity-0"
                    }`}
                  >
                    {t(`cards.${i}.text`)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Band>
  );
}
