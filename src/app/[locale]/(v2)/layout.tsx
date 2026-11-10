import { setRequestLocale } from "next-intl/server";
import { SiteChrome } from "@/components/ds/site-chrome";

// Charte v2 (DESIGN.md) : bandeau d'annonce, navigation Slush, bandes, bande géante et footer
export default async function V2Layout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <SiteChrome>{children}</SiteChrome>;
}
