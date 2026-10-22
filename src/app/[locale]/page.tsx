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
import { Reveal } from "@/components/reveal";
import { routing } from "@/i18n/routing";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <>
      <PortalIntro />
      <IntroScope>
        <main className="mx-auto max-w-6xl space-y-6 px-4 pb-6 pt-2 md:space-y-8 md:pb-10">
          <Hero />
          <Reveal>
            <Concept />
          </Reveal>
          <Reveal>
            <Upcoming />
          </Reveal>
          <Reveal>
            <Gallery />
          </Reveal>
          <Reveal>
            <Community />
          </Reveal>
        </main>
      </IntroScope>
    </>
  );
}
