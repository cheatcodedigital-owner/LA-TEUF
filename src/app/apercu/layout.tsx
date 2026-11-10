import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { SiteChrome } from "@/components/ds/site-chrome";
import { fontVariables } from "../fonts";
import "../globals.css";

// Aperçu de l'accueil v2 : hors [locale] et exclu du proxy, toujours en français, jamais indexé.
// Il utilise le même habillage que les pages (v2) (navigation, bande géante, footer, mouvement).
export const metadata: Metadata = {
  title: "LA TEUF · Aperçu de l'accueil",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#090a10" };

export default function ApercuLayout({ children }: { children: React.ReactNode }) {
  setRequestLocale("fr");
  return (
    <html lang="fr" className={`${fontVariables} antialiased`}>
      <body className="min-h-screen bg-cosmic-black">
        <NextIntlClientProvider>
          <SiteChrome>{children}</SiteChrome>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
