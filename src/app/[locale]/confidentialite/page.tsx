import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/legal-page";
import { routing } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/confidentialite">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Privacy" });
  // ❓ Texte provisoire à faire valider (informations légales de l'organisateur, droit applicable) avant indexation
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function Page({ params }: PageProps<"/[locale]/confidentialite">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <LegalPage namespace="Privacy" />;
}
