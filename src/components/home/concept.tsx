import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/reveal";
import { Section } from "@/components/section";

export async function Concept() {
  const t = await getTranslations("Concept");
  const missions = t.raw("missions") as string[];

  return (
    <Section id="concept" light className="scroll-mt-24">
      <Reveal>
        <h2 className="font-title text-4xl md:text-6xl">{t("title")}</h2>
        <p className="mt-6 max-w-2xl text-lg">{t("text")}</p>
      </Reveal>

      <ol className="mt-10 grid gap-4 md:grid-cols-2">
        {missions.map((m, i) => (
          <Reveal
            as="li"
            key={m}
            delay={(i % 2) * 120}
            className="flex gap-5 rounded-card bg-deep-indigo p-6 text-warm-ivory md:p-8"
          >
            <span className="font-label text-5xl leading-none text-solar-copper">{String(i + 1).padStart(2, "0")}</span>
            <span className="pt-1 text-lg">{m}</span>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}
