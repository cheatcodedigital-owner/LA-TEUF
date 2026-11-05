import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/reveal";
import { PageMain, Section } from "@/components/section";
import { nextEvent } from "@/data/events";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/faq">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Faq" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

type Group = { title: string; items: { q: string; a: string }[] };

const pill = "hover-glow inline-flex min-h-11 items-center justify-center rounded-full px-8 py-3.5 font-label text-base uppercase tracking-wider";

export default async function FaqPage({ params }: PageProps<"/[locale]/faq">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Faq");
  const groups = t.raw("groups") as Group[];

  // Données structurées FAQPage (rich results) : mêmes questions/réponses que la page
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: groups.flatMap((g) =>
      g.items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
    ),
  };

  return (
    <PageMain>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <Section>
        <Reveal>
          <p className="font-label text-sm uppercase tracking-widest text-solar-copper">{t("eyebrow")}</p>
          <h1 className="mt-4 font-title text-5xl md:text-7xl">{t("title")}</h1>
          <p className="mt-6 max-w-xl text-lg text-warm-ivory/80">{t("intro")}</p>
        </Reveal>
      </Section>

      {groups.map((g) => (
        <Section key={g.title}>
          <h2 className="font-title text-3xl md:text-4xl">{g.title}</h2>
          <div className="mt-6 space-y-3">
            {g.items.map((i) => (
              <details key={i.q} className="group rounded-2xl bg-cosmic-black ring-1 ring-warm-ivory/15 transition open:ring-solar-copper/60">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 text-lg outline-none marker:content-none focus-visible:ring-2 focus-visible:ring-ultraviolet [&::-webkit-details-marker]:hidden">
                  <span>{i.q}</span>
                  <span aria-hidden className="font-label text-2xl leading-none text-solar-copper transition-transform group-open:rotate-45 motion-reduce:transition-none">
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 text-warm-ivory/80">{i.a}</p>
              </details>
            ))}
          </div>
        </Section>
      ))}

      <Section light>
        <Reveal>
          <h2 className="font-title text-3xl md:text-4xl">{t("ctaTitle")}</h2>
          <p className="mt-4 max-w-xl text-lg">{t("ctaText")}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/contact" className={`${pill} bg-cosmic-black text-warm-ivory`}>
              {t("ctaButton")}
            </Link>
            {nextEvent && (
              <Link href={`/billetterie/${nextEvent.slug}`} className={`${pill} bg-solar-copper text-cosmic-black`}>
                {t("ticketsButton")}
              </Link>
            )}
          </div>
        </Reveal>
      </Section>
    </PageMain>
  );
}
