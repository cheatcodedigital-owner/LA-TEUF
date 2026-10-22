import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Starfield } from "@/components/starfield";
import { routing } from "@/i18n/routing";
import "../globals.css";

const tropic = localFont({
  src: "../../fonts/TropicGround-Regular.otf",
  variable: "--font-tropic",
  display: "swap",
});
const dizzy = localFont({
  src: "../../fonts/ATP-Dizzy.otf",
  variable: "--font-dizzy",
  display: "swap",
});
const anton = localFont({
  src: "../../fonts/Anton.otf",
  variable: "--font-anton",
  display: "swap",
});
const pain = localFont({
  src: "../../fonts/Pain de Mie.otf",
  variable: "--font-pain",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      languages: { fr: "/", en: "/en" },
    },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${tropic.variable} ${dizzy.variable} ${anton.variable} ${pain.variable} antialiased`}
    >
      <body className="min-h-screen">
        <Starfield />
        <noscript>
          <style>{".reveal{opacity:1!important;transform:none!important}"}</style>
        </noscript>
        <NextIntlClientProvider>
          <Header />
          <div className="pt-18">{children}</div>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
