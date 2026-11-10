import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/contact/contact-form";
import { CONTACT_EMAIL, CONTACT_PHONE, socials } from "@/components/layout/nav-items";
import { Reveal } from "@/components/reveal";
import { PageMain, Section } from "@/components/section";
import { routing } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const pill = "hover-glow inline-flex min-h-11 items-center justify-center rounded-full font-label text-base uppercase tracking-wider";

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Contact");

  return (
    <PageMain>
      <Section>
        <Reveal>
          <p className="font-label text-sm uppercase tracking-wider text-solar-copper">{t("eyebrow")}</p>
          <h1 className="mt-4 font-title text-5xl md:text-7xl">{t("title")}</h1>
          <p className="mt-6 max-w-xl text-lg text-warm-ivory/80">{t("intro")}</p>
        </Reveal>
      </Section>

      <div className="grid gap-6 md:gap-8 lg:grid-cols-[1.5fr_1fr]">
        <Section>
          <Reveal>
            <h2 className="font-title text-3xl md:text-4xl">{t("writeTitle")}</h2>
            <p className="mb-8 mt-3 text-warm-ivory/80">
              {t("writeText")}{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-solar-copper underline underline-offset-4">
                {CONTACT_EMAIL}
              </a>
            </p>
            <ContactForm />
          </Reveal>
        </Section>

        <div className="space-y-6 md:space-y-8">
          <Section light>
            <Reveal>
              <h2 className="font-title text-3xl md:text-4xl">{t("callTitle")}</h2>
              <p className="mt-3">{t("callText")}</p>
              <p className="mt-6 font-label text-3xl tracking-wider text-copper-deep">{CONTACT_PHONE.display}</p>
              <a href={`tel:${CONTACT_PHONE.tel}`} className={`${pill} mt-6 w-44 bg-deep-indigo text-warm-ivory`}>
                {t("call")}
              </a>
            </Reveal>
          </Section>

          <Section>
            <Reveal>
              <h2 className="font-title text-3xl md:text-4xl">{t("followTitle")}</h2>
              <p className="mt-3 text-warm-ivory/80">{t("followText")}</p>
              <ul className="mt-6 grid grid-cols-2 gap-3">
                {socials.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className={`${pill} w-full bg-cosmic-black py-3.5 text-warm-ivory`}>
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </Reveal>
          </Section>
        </div>
      </div>
    </PageMain>
  );
}
