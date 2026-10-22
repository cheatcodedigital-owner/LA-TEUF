import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Community } from "@/components/home/community";
import { Concept } from "@/components/home/concept";
import { Gallery } from "@/components/home/gallery";
import { Hero } from "@/components/home/hero";
import { Upcoming } from "@/components/home/upcoming";
import { IntroScope } from "@/components/intro/intro-scope";
import { PortalIntro } from "@/components/intro/portal-intro";
import { routing } from "@/i18n/routing";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <>
      <PortalIntro />
      {/* Le hero remonte sous le header fixe : on annule le pt-18 du layout */}
      <IntroScope>
        <main className="mx-auto -mt-18 max-w-6xl space-y-6 px-4 pb-6 pt-6 md:space-y-8 md:pb-10">
          <Hero />
          <Concept />
          <Upcoming />
          <Gallery />
          <Community />
        </main>
      </IntroScope>
    </>
  );
}
