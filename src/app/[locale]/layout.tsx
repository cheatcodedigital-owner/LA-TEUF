import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/ds/site-chrome";
import { routing } from "@/i18n/routing";
import { fontVariables } from "../fonts";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    // Adresse absolue des images de partage (WhatsApp, réseaux) : SITE_URL, sinon le domaine de production
    metadataBase: new URL(siteUrl()),
    title: t("title"),
    description: t("description"),
    alternates: {
      languages: { fr: "/", en: "/en" },
    },
    // Aperçu d'un lien collé (WhatsApp, Instagram…) : logo LA TEUF, 1200 × 630 (public/brand/apercu-partage.png)
    openGraph: {
      type: "website",
      images: [{ url: "/brand/apercu-partage.png", width: 1200, height: 630, alt: "LA TEUF ÉLECTRONIQUE" }],
      siteName: "LA TEUF ÉLECTRONIQUE",
      title: t("title"),
      description: t("description"),
      locale: locale === "en" ? "en_US" : "fr_FR",
    },
    twitter: { card: "summary_large_image" },
  };
}

function siteUrl() {
  const raw = process.env.SITE_URL?.trim() || "https://lateufelectronic.com";
  return /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
}

export const viewport: Viewport = { themeColor: "#090a10" };

// Site public (charte v2, DESIGN.md) : bandeau d'annonce, navigation, pile de bandes, footer, défilement Lenis
export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${fontVariables} antialiased`}>
      <body className="min-h-screen bg-cosmic-black">
        <NextIntlClientProvider>
          <SiteChrome>{children}</SiteChrome>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
