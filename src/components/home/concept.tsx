import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/reveal";
import { Section } from "@/components/section";
import { Keyhole } from "@/components/ui";

export async function Concept() {
  const t = await getTranslations("Concept");
  const missions = t.raw("missions") as string[];

  return (
    <Section id="concept" light className="scroll-mt-24">
      <div className="grid gap-10 md:grid-cols-[5fr_7fr] md:gap-16">
        <Reveal>
          <h2 className="font-title text-4xl md:text-6xl">{t("title")}</h2>
          <p className="mt-6 max-w-xl text-lg">{t("text")}</p>
        </Reveal>

        {/* Missions en liste, puces en trou de serrure (signature, DESIGN.md §4) */}
        <ol className="border-b border-deep-indigo/15 md:mt-2">
          {missions.map((m, i) => (
            <Reveal
              as="li"
              key={m}
              delay={i * 60}
              className="flex items-start gap-4 border-t border-deep-indigo/15 py-5 md:py-6"
            >
              <Keyhole className="mt-1 h-6 w-auto shrink-0 text-copper-deep" />
              <span className="text-lg md:text-xl">{m}</span>
            </Reveal>
          ))}
        </ol>
      </div>
    </Section>
  );
}
