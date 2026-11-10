"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { AccordionItem, unfold } from "@/components/ds/accordion";
import { Band } from "@/components/ds/band";
import { PlusIcon } from "@/components/ds/icons";
import { Link } from "@/i18n/navigation";

/** P8 FAQ billets (Pêche) : bande repliée « Avant de réserver · 5 questions », qui se déplie au clic */
export function EventFaq({ items }: { items: { q: string; a: string }[] }) {
  const t = useTranslations("Ticketing");
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <Band duo="peche" className="flex flex-col p-5 md:px-12 md:py-10">
      <div className="flex items-center justify-between gap-6">
        <h2 data-heading-reveal className="font-title text-[32px] leading-[96%] md:text-[48px]">
          {t("faqTitle")}
        </h2>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={id}
          className="flex shrink-0 items-center gap-4 font-label text-[15px] uppercase tracking-[0.04em] text-cosmic-black"
        >
          <span className="hidden sm:inline">{open ? t("faqClose") : t("faqCount", { count: items.length })}</span>
          <span className="sr-only sm:hidden">{open ? t("faqClose") : t("faqOpen")}</span>
          <span className="flex size-12 items-center justify-center rounded-full bg-cosmic-black text-warm-ivory md:size-14">
            <PlusIcon open={open} />
          </span>
        </button>
      </div>
      <div id={id} className={`${unfold} ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="min-h-0 overflow-hidden" inert={!open}>
          <p className="pt-3 font-body text-[14px] leading-[150%] md:text-[15px]">
            {t.rich("faqMore", { link: (c) => <Link href="/faq" className="underline underline-offset-4">{c}</Link> })}
          </p>
          <div className="flex flex-col gap-2.5 pt-6">
            {items.map((i) => (
              <AccordionItem key={i.q} question={i.q}>
                {i.a}
              </AccordionItem>
            ))}
          </div>
        </div>
      </div>
    </Band>
  );
}
