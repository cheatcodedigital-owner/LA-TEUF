import type { Metadata } from "next";
import Image from "next/image";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { GalleryShowcase } from "@/components/gallery/gallery-showcase";
import { PhotoGrid } from "@/components/gallery/photo-grid";
import { Reveal } from "@/components/reveal";
import { PageMain, Section } from "@/components/section";
import { galleryPhotos } from "@/data/gallery";
import { routing } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/galerie">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Gallery" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function GalleryPage({ params }: PageProps<"/[locale]/galerie">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Gallery");
  const alts = t.raw("alt") as string[];
  const viewer = t.raw("viewer") as { open: string; close: string; previous: string; next: string };

  return (
    <PageMain>
      <Section light>
        <Reveal>
          <p className="font-label text-sm uppercase tracking-wider">{t("eyebrow")}</p>
          <h1 className="mt-4 font-title text-5xl md:text-7xl">{t("title")}</h1>
          <p className="mb-10 mt-6 max-w-xl text-lg">{t("intro")}</p>
        </Reveal>
        <GalleryShowcase items={galleryPhotos.map((p) => ({ image: p.src }))} hint={t("hint")}>
          {/* Repli sans WebGL : la mosaïque complète est juste en dessous, on n'en montre qu'un aperçu */}
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
            {galleryPhotos.slice(0, 6).map((p, i) => (
              <li key={p.src} className="relative aspect-[4/5] overflow-hidden rounded-card bg-deep-indigo">
                <Image src={p.src} alt={alts[i] ?? ""} fill sizes="(min-width: 768px) 33vw, 50vw" className="object-cover" />
              </li>
            ))}
          </ul>
        </GalleryShowcase>
      </Section>

      <Section>
        <Reveal>
          <h2 className="mb-8 font-title text-4xl md:text-5xl">{t("allTitle")}</h2>
        </Reveal>
        <PhotoGrid photos={galleryPhotos} alts={alts} labels={viewer} />
      </Section>
    </PageMain>
  );
}
