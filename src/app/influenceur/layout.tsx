import type { Metadata, Viewport } from "next";
import { fontVariables } from "../fonts";
import "../globals.css";

// Espace privé de l'influenceur (lien secret) : français, jamais indexé, aucun referrer sortant
export const metadata: Metadata = {
  title: "LA TEUF · Espace influenceur",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const viewport: Viewport = { themeColor: "#090a10" };

export default function InfluencerLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fontVariables} antialiased`}>
      <body className="min-h-screen bg-cosmic-black">{children}</body>
    </html>
  );
}
