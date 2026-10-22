import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getEventViews, getShowcaseLabels } from "@/components/events/event-views";
import { EventsShowcase } from "@/components/events/events-showcase";
import { PageMain, Section } from "@/components/section";
import { pastEvents, upcomingEvents } from "@/data/events";
import { routing } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/evenements">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Events" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function EventsPage({ params }: PageProps<"/[locale]/evenements">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Events");
  const [upcomingViews, pastViews, labels] = await Promise.all([
    getEventViews(upcomingEvents),
    getEventViews(pastEvents),
    getShowcaseLabels(),
  ]);

  const jsonLd = upcomingEvents.map((e) => ({
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.name,
    startDate: e.startsAt,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    maximumAttendeeCapacity: e.capacity,
    location: {
      "@type": "Place",
      name: e.venue ?? e.city,
      address: { "@type": "PostalAddress", addressLocality: e.city, addressCountry: e.country },
    },
    organizer: { "@type": "Organization", name: "LA TEUF ÉLECTRONIQUE", url: "https://lateufelectronic.com" },
  }));

  return (
    <PageMain>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Section>
        <p className="font-label text-sm uppercase tracking-widest text-solar-copper">{t("eyebrow")}</p>
        <h1 className="mt-4 font-title text-[clamp(2.75rem,10vw,5.5rem)] leading-[1.05]">{t("title")}</h1>
        <p className="mt-6 max-w-xl text-lg text-warm-ivory/80">{t("intro")}</p>
      </Section>

      <Section id="a-venir">
        <h2 className="mb-10 font-title text-4xl md:text-5xl">{t("upcoming")}</h2>
        <EventsShowcase events={upcomingViews} labels={labels} />
      </Section>

      <Section id="archives" light>
        <h2 className="mb-10 font-title text-4xl md:text-5xl">{t("archives")}</h2>
        {pastViews.length === 0 ? (
          <p className="max-w-xl text-lg">{t("archivesEmpty")}</p>
        ) : (
          <EventsShowcase events={pastViews} labels={labels} />
        )}
      </Section>
    </PageMain>
  );
}
