import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PageMain, Section } from "@/components/section";
import { routing } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/cgv">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Cgv" });
  // ❓ Texte à faire valider (remboursement, droit applicable) avant de l'ouvrir à l'indexation
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function CgvPage({ params }: PageProps<"/[locale]/cgv">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Cgv");
  const sections = t.raw("sections") as { title: string; body: string[] }[];

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
