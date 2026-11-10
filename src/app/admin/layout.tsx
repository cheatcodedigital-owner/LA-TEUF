import type { Metadata, Viewport } from "next";
import { fontVariables } from "../fonts";
import "../globals.css";

// Espace interne : en français uniquement (hors next-intl), jamais indexé
export const metadata: Metadata = {
  title: "LA TEUF · Admin",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#090a10" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fontVariables} antialiased`}>
      <body className="min-h-screen bg-cosmic-black">{children}</body>
    </html>
  );
}
