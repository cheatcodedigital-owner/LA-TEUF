import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/contact/contact-form";
import { Band } from "@/components/ds/band";
import { copperWord, PageHeader } from "@/components/ds/page-header";
import { Reveals } from "@/components/ds/slush-motion";
import { CONTACT_EMAIL } from "@/components/layout/nav-items";
import { routing } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

// Contact (maquette « Contact ») : en-tête, formulaire seul sur bande Ivoire (le téléphone et les réseaux sont dans le footer)
export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Contact");

  return (
    <>
      <PageHeader title={t.rich("heading", { accent: copperWord })} sticker={{ src: "/stickers/enlaces.png", rotate: -7, width: 600, height: 600 }}>
        <p data-load-stagger className="max-w-[600px] font-body text-[16px] leading-[150%] md:text-[18px]">
          {t("intro")}
        </p>
      </PageHeader>

      <Band duo="ivoire" className="flex flex-col gap-6 px-4 pb-5 pt-7 md:gap-8 md:px-12 md:pb-12 md:pt-12">
        <div className="flex flex-col gap-2">
          <h2 data-heading-reveal className="font-title text-[36px] leading-[100%] md:text-[56px]">
            {t("writeTitle")}
          </h2>
          <p className="font-body text-[15px] leading-[150%] md:text-[16px]">
            {t("writeText")}{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-copper-deep underline underline-offset-4">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
        <ContactForm />
      </Band>
      <Reveals />
    </>
  );
}
