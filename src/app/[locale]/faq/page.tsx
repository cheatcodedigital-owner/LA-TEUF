import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AccordionItem } from "@/components/ds/accordion";
import { Band } from "@/components/ds/band";
import { Flip } from "@/components/ds/flip";
import { ticketsHref } from "@/components/ds/links";
import { copperWord, mobileLine, PageHeader } from "@/components/ds/page-header";
import { Reveals } from "@/components/ds/slush-motion";
import { routing } from "@/i18n/routing";

type Group = { title: string; items: { q: string; a: string }[] };

export async function generateMetadata({ params }: PageProps<"/[locale]/faq">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Faq" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const anchor = (i: number) => `rubrique-${i + 1}`;

// FAQ (maquette « FAQ ») : en-tête avec raccourcis vers les rubriques, une bande par rubrique (Pêche et Ivoire
// en alternance), questions dépliables, bande Violet « Une autre question ? »
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
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHeader title={t.rich("heading", { line: mobileLine, accent: copperWord })} sticker={{ src: "/stickers/portail.png", rotate: 6, width: 360, height: 360 }}>
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-10">
          <p data-load-stagger className="max-w-[440px] font-body text-[15px] leading-[150%] md:text-[16px]">
            {t("intro")}
          </p>
          <nav aria-label={t("jump")} data-load-stagger>
            <ul className="flex flex-wrap gap-2 md:justify-end">
              {groups.map((g, i) => (
                <li key={g.title}>
                  <a
                    href={`#${anchor(i)}`}
                    className="press flex h-9 items-center rounded-full border border-warm-ivory px-4 font-label text-[13px] uppercase tracking-[0.04em] transition-colors hover:bg-warm-ivory hover:text-cosmic-black"
                  >
                    {g.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </PageHeader>

      {groups.map((g, i) => (
        <Band
          key={g.title}
          duo={i % 2 === 0 ? "peche" : "ivoire"}
          id={anchor(i)}
          className="flex scroll-mt-24 flex-col gap-6 px-4 py-6 md:flex-row md:gap-10 md:px-12 md:py-12"
        >
          <div className="flex flex-col gap-2 md:w-[300px] md:shrink-0">
            <p className="font-label text-[13px] uppercase tracking-[0.08em] text-copper-deep">
              {t("count", { n: String(i + 1).padStart(2, "0"), count: g.items.length })}
            </p>
            <h2 data-heading-reveal className="font-title text-[32px] leading-[100%] md:text-[44px]">
              {g.title}
            </h2>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            {g.items.map((item) => (
              <AccordionItem key={item.q} question={item.q}>
                {item.a}
              </AccordionItem>
            ))}
          </div>
        </Band>
      ))}

      <Band duo="violet" className="flex flex-col gap-6 px-5 py-8 md:flex-row md:items-end md:justify-between md:px-12 md:py-12">
        <div className="flex flex-col gap-3">
          <h2 data-heading-reveal className="font-title text-[40px] leading-[100%] md:text-[64px]">
            {t("ctaTitle")}
          </h2>
          <p className="max-w-[560px] font-body text-[15px] leading-[150%]">{t("ctaText")}</p>
        </div>
        <div data-reveal-up className="flex flex-col gap-3 sm:flex-row">
          <Flip href="/contact" tone="outlineDark" size="h-[52px] px-7 text-[15px]">
            {t("ctaButton")}
          </Flip>
          <Flip href={ticketsHref} tone="ivory" size="h-[52px] px-7 text-[15px]">
            {t("ticketsButton")}
          </Flip>
        </div>
      </Band>
      <Reveals />
    </>
  );
}
