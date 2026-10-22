import { getTranslations } from "next-intl/server";
import { PageMain, Section } from "@/components/section";

type Sections = { title: string; body: string[] }[];

// Page de texte juridique (mentions légales, confidentialité) : titre en encadré sombre, corps en encadré clair
export async function LegalPage({ namespace }: { namespace: "LegalNotice" | "Privacy" }) {
  const t = await getTranslations(namespace);
  const sections = t.raw("sections") as Sections;

  return (
    <PageMain>
      <Section>
        <h1 className="font-title text-[clamp(2.25rem,8vw,4.5rem)] leading-[1.05]">{t("title")}</h1>
        <p className="mt-5 text-warm-ivory/70">{t("updated")}</p>
      </Section>

      <Section light>
        <div className="max-w-3xl space-y-12">
          {sections.map((s) => (
            <article key={s.title}>
              <h2 className="font-title text-2xl md:text-3xl">{s.title}</h2>
              <div className="mt-4 space-y-3 text-lg">
                {s.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </Section>
    </PageMain>
  );
}
