import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { GiantBand } from "@/components/ds/site-footer";
import { Reveals } from "@/components/ds/slush-motion";
import { Ambiance } from "@/components/home/ambiance";
import { Community } from "@/components/home/community";
import { Concept } from "@/components/home/concept";
import { Dates } from "@/components/home/dates";
import { Hero } from "@/components/home/hero";
import { TicketsBand } from "@/components/home/tickets-band";
import { PortalIntro } from "@/components/intro/portal-intro";
import { routing } from "@/i18n/routing";

// Accueil (T1) : P1 hero, P3 ambiance, P2 concept, P9 dates, P5 CTA billets, P10 communauté, P11 bande géante.
// L'intro du portail (WebGL) se joue par-dessus au premier affichage ; le hero apparaît quand le tunnel s'ouvre.
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <>
      <PortalIntro />
      <Hero />
      <Ambiance />
      <Concept />
      <Dates />
      <TicketsBand />
      <Community />
      <GiantBand />
      <Reveals />
    </>
  );
}
