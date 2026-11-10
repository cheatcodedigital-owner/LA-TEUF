import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Band } from "@/components/ds/band";
import { Flip } from "@/components/ds/flip";
import { copperWord, PageHeader } from "@/components/ds/page-header";
import { GiantBand } from "@/components/ds/site-footer";
import { Reveals } from "@/components/ds/slush-motion";
import { Sticker } from "@/components/ds/sticker";
import { DjCard } from "@/components/djs/dj-card";
import { djs } from "@/data/djs";
import { routing } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/djs">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Djs" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

// DJs (maquette « DJs ») : en-tête, mur des portraits (Indigo, en quinconce), bande CTA Cuivre
export default async function DjsPage({ params }: PageProps<"/[locale]/djs">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Djs");

  return (
    <>
      <PageHeader title={t.rich("heading", { accent: copperWord })} sticker={{ src: "/stickers/dj.png", rotate: 4, width: 480, height: 480 }} />

      <Band duo="indigo" className="flex flex-col gap-8 px-3 pb-6 pt-8 md:gap-10 md:px-12 md:pb-14 md:pt-20">
        <h2 data-heading-reveal className="px-2 font-title text-[36px] leading-[95%] tracking-[-0.02em] md:px-0 md:text-[56px]">
          {t.rich("wallTitle", { accent: copperWord })}
        </h2>
        <div data-card-reveal="wrap" className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-4 md:gap-y-10 lg:grid-cols-5">
          {djs.map((dj, i) => (
            <DjCard
              key={dj.slug}
              name={dj.name}
              photo={dj.portrait}
              tint={dj.tint}
              live={dj.kind === "live"}
              role={t(`kind.${dj.kind}`)}
              offset={i % 2 === 1}
            />
          ))}
        </div>
      </Band>

      <Band duo="cuivre" className="flex flex-col gap-6 overflow-hidden px-5 pb-6 pt-8 md:gap-8 md:px-12 md:pb-10 md:pt-14">
        <h2 data-heading-reveal className="max-w-[1000px] font-title text-[64px] leading-[88%] tracking-[-0.03em] md:text-[clamp(96px,10.4vw,150px)]">
          {t.rich("ctaTitle", { accent: (c) => c })}
        </h2>
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <p data-reveal-up className="max-w-[460px] font-body text-[16px] leading-[150%] md:text-[18px]">
            {t("ctaText")}
          </p>
          <div data-reveal-up>
            <Flip href="/evenements" tone="blackIvory" size="h-14 px-8 text-[16px]" className="w-full md:w-auto">
              {t("ctaButton")}
            </Flip>
          </div>
        </div>
        <Sticker src="/stickers/percussion.png" rotate={-6} width={600} height={600} className="bottom-2 right-6 size-28 md:bottom-0 md:left-[46%] md:right-auto md:size-[200px] lg:size-[250px]" />
      </Band>

      <GiantBand />
      <Reveals />
    </>
  );
}
