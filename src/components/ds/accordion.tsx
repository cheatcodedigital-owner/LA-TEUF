"use client";

import { useId, useState } from "react";
import { PlusIcon } from "./icons";

/** Dépliement en douceur : grille 0fr → 1fr (hauteur automatique animée), courbe « slush » */
export const unfold = "grid transition-[grid-template-rows] duration-[650ms] ease-[cubic-bezier(0.65,0.05,0,1)] motion-reduce:transition-none";

/**
 * Question dépliable (FAQ, DESIGN.md §7.3) : pilule cerclée, question en ATP Dizzy, bouton « + » qui devient « − ».
 * La réponse reste dans le DOM (référencement), masquée par la hauteur 0.
 */
export function AccordionItem({ question, children }: { question: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="rounded-[24px] border border-cosmic-black">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={id}
          className="flex w-full items-center justify-between gap-4 rounded-[24px] py-4 pl-5 pr-3 text-left md:py-5 md:pl-7 md:pr-6"
        >
          <span className="font-title text-[18px] leading-[115%] md:text-[24px]">{question}</span>
          <span
            className={`flex size-11 shrink-0 items-center justify-center rounded-full border border-cosmic-black transition-colors duration-300 ${
              open ? "bg-cosmic-black text-warm-ivory" : ""
            }`}
          >
            <PlusIcon open={open} />
          </span>
        </button>
      </h3>
      <div id={id} role="region" className={`${unfold} ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="min-h-0 overflow-hidden">
          <div
            className={`px-5 pb-5 font-body text-[16px] leading-[150%] transition-[opacity,translate] duration-700 ease-[cubic-bezier(0.65,0.05,0,1)] md:px-7 md:pb-7 md:text-[17px] ${
              open ? "translate-y-0 opacity-100 delay-100" : "-translate-y-3 opacity-0"
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
