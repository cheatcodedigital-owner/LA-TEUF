import { setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Starfield } from "@/components/starfield";

// Ancienne charte : à retirer quand toutes les pages seront passées dans (v2)
export default async function LegacyLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Starfield />
      <noscript>
        <style>{".reveal{opacity:1!important;transform:none!important}"}</style>
      </noscript>
      <Header />
      <div className="pt-18">{children}</div>
      <Footer />
    </>
  );
}
