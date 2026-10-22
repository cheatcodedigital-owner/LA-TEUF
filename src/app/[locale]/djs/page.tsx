import type { Metadata } from "next";
import Image from "next/image";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PortraitWall } from "@/components/djs/portrait-wall";
import { Reveal } from "@/components/reveal";
import { PageMain, Section } from "@/components/section";
import { ButtonLink } from "@/components/ui";
import { djs } from "@/data/djs";
import { routing } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/djs">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Djs" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const linkStyle =
  "hover-glow inline-flex min-h-11 items-center rounded-full border border-warm-ivory/40 px-5 font-label text-sm uppercase tracking-wider";

export default async function DjsPage({ params }: PageProps<"/[locale]/djs">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Djs");

  const portraits = djs.map((dj) => ({ name: dj.name, caption: t(`kind.${dj.kind}`), src: dj.photo }));

  return (
    <PageMain>
      <PortraitWall
        title={t("title")}
        subtitle={t("subtitle", { count: djs.length })}
        hint={t("hint")}
        portraits={portraits}
      />

      <Section id="line-up">
        <Reveal>
          <p className="font-label text-sm uppercase tracking-widest text-solar-copper">{t("eyebrow")}</p>
          <h2 className="mt-4 font-title text-4xl md:text-5xl">{t("lineup")}</h2>
          <p className="mt-6 max-w-xl text-lg text-warm-ivory/80">{t("intro")}</p>
        </Reveal>

        <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
          {djs.map((dj, i) => (
            <Reveal as="li" key={dj.slug} delay={(i % 3) * 110}>
              <article className="h-full rounded-card bg-cosmic-black p-2 pb-5 md:p-3 md:pb-6">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-deep-indigo">
                  <Image
                    src={dj.photo}
                    alt={t("photoAlt", { name: dj.name })}
                    fill
                    sizes="(min-width: 1152px) 340px, (min-width: 768px) 30vw, 45vw"
                    className="object-cover"
                  />
                </div>
                <div className="px-2 pt-4 md:px-3">
                  <h3 className="font-title text-xl md:text-2xl">{dj.name}</h3>
                  <p className="mt-1 font-label text-xs uppercase tracking-widest text-solar-copper md:text-sm">
                    {t(`kind.${dj.kind}`)}
                  </p>
                  {(dj.soundcloud || dj.instagram) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {dj.soundcloud && (
                        <a href={dj.soundcloud} target="_blank" rel="noopener noreferrer" className={linkStyle}>
                          SoundCloud
                        </a>
                      )}
                      {dj.instagram && (
                        <a href={dj.instagram} target="_blank" rel="noopener noreferrer" className={linkStyle}>
                          Instagram
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </ul>
      </Section>

      <Section light>
        <Reveal className="flex flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-title text-4xl md:text-5xl">
              {t.rich("ctaTitle", { accent: (chunks) => <span className="accent-word">{chunks}</span> })}
            </h2>
            <p className="mt-4 text-lg">{t("ctaText")}</p>
          </div>
          <ButtonLink href="/evenements" className="shrink-0">
            {t("ctaButton")}
          </ButtonLink>
        </Reveal>
      </Section>
    </PageMain>
  );
}
