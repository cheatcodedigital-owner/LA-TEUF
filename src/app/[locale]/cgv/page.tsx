import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/legal-page";
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
  return <LegalPage namespace="Cgv" />;
}
