import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "../globals.css";

const dizzy = localFont({ src: "../../fonts/ATP-Dizzy.otf", variable: "--font-dizzy", display: "swap" });
const anton = localFont({ src: "../../fonts/Anton.otf", variable: "--font-anton", display: "swap" });
const pain = localFont({ src: "../../fonts/Pain de Mie.otf", variable: "--font-pain", display: "swap" });

// Espace privé de l'influenceur (lien secret) : français, jamais indexé, aucun referrer sortant
export const metadata: Metadata = {
  title: "LA TEUF · Espace influenceur",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const viewport: Viewport = { themeColor: "#090a10" };

export default function InfluencerLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${dizzy.variable} ${anton.variable} ${pain.variable} antialiased`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
