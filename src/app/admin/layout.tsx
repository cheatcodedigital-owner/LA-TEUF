import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "../globals.css";

const dizzy = localFont({ src: "../../fonts/ATP-Dizzy.otf", variable: "--font-dizzy", display: "swap" });
const anton = localFont({ src: "../../fonts/Anton.otf", variable: "--font-anton", display: "swap" });
const pain = localFont({ src: "../../fonts/Pain de Mie.otf", variable: "--font-pain", display: "swap" });

// Espace interne : en français uniquement (hors next-intl, comme /design), jamais indexé
export const metadata: Metadata = {
  title: "LA TEUF · Admin",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#090a10" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${dizzy.variable} ${anton.variable} ${pain.variable} antialiased`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
