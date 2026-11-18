import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Band } from "@/components/ds/band";
import { Reveals } from "@/components/ds/slush-motion";
import { PaymentReturn } from "@/components/ticketing/payment-return";
import { events } from "@/data/events";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => events.map((e) => ({ locale, slug: e.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/billetterie/[slug]/retour">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PaymentReturn" });
  return { title: t("metaTitle"), robots: { index: false } };
}

// Retour de la page de paiement SasPay (`return_url`) : affiche seulement un statut, n'émet jamais de billet.
async function Return({ params }: { params: PageProps<"/[locale]/billetterie/[slug]/retour">["params"] }) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  if (!events.some((e) => e.slug === slug)) notFound();

  return (
    <>
      <Band duo="violet" className="flex min-h-[520px] flex-col justify-center px-5 py-12 md:px-16 md:py-20">
        <Suspense fallback={null}>
          <PaymentReturn slug={slug} locale={locale} />
        </Suspense>
      </Band>
      <Reveals />
    </>
  );
}

export default function ReturnPage({ params }: PageProps<"/[locale]/billetterie/[slug]/retour">) {
  return (
    <Suspense fallback={<div aria-hidden className="h-[520px] rounded-band bg-violet-deep md:rounded-band-lg" />}>
      <Return params={params} />
    </Suspense>
  );
}
