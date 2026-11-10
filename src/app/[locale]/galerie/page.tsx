import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Band } from "@/components/ds/band";
import { Flip } from "@/components/ds/flip";
import { eventOnSale, ticketsHref } from "@/components/ds/links";
import { copperWord, mobileLine, PageHeader } from "@/components/ds/page-header";
import { GiantBand } from "@/components/ds/site-footer";
import { Reveals } from "@/components/ds/slush-motion";
import { PhotoGrid } from "@/components/gallery/photo-grid";
import { galleryPhotos } from "@/data/gallery";
import { routing } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/galerie">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Gallery" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

// Galerie (maquette « Galerie ») : en-tête, mosaïque (Lilas) avec visionneuse, carte « La prochaine » en fin de grille
export default async function GalleryPage({ params }: PageProps<"/[locale]/galerie">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Gallery");
  const format = await getFormatter();
  const alts = t.raw("alt") as string[];
  const viewer = t.raw("viewer") as { open: string; close: string; previous: string; next: string };
  const next = eventOnSale
    ? t("next", { date: format.dateTime(new Date(eventOnSale.startsAt), { day: "numeric", month: "long", timeZone: eventOnSale.timeZone }) })
    : null;

  return (
    <>
      <PageHeader title={t.rich("heading", { line: mobileLine, accent: copperWord })} sticker={{ src: "/stickers/danseurs.png", rotate: -4, width: 600, height: 600 }} />

      <Band duo="lilas" className="flex flex-col gap-6 px-3 pb-3 pt-8 md:gap-8 md:px-10 md:pb-10 md:pt-16">
        <div className="flex flex-col gap-2 px-2 md:flex-row md:items-end md:justify-between md:px-0">
          <h2 data-heading-reveal className="font-title text-[36px] leading-[95%] md:text-[64px]">
            {t("allTitle")}
          </h2>
          <p className="font-body text-[14px] leading-[150%]">{t("clickHint")}</p>
        </div>
        <PhotoGrid photos={galleryPhotos} alts={alts} labels={viewer}>
          {next && (
            <div className="flex h-full flex-col justify-between gap-5 rounded-[16px] border border-cosmic-black bg-solar-copper p-5 text-cosmic-black">
              <p className="font-title text-[22px] leading-[105%] md:text-[26px]">{next}</p>
              <Flip href={ticketsHref} tone="blackIvory" size="h-12 px-6 text-[14px]" className="w-full">
                {t("nextCta")}
              </Flip>
            </div>
          )}
        </PhotoGrid>
      </Band>

      <GiantBand />
      <Reveals />
    </>
  );
}
