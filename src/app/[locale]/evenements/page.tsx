import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Band } from "@/components/ds/band";
import { copperWord, mobileLine, PageHeader } from "@/components/ds/page-header";
import { GiantBand } from "@/components/ds/site-footer";
import { Reveals } from "@/components/ds/slush-motion";
import { DateCard } from "@/components/events/date-card";
import { pastEvents, upcomingEvents } from "@/data/events";
import { routing } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/evenements">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Events" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

// Tous les évènements : en-tête « Les rendez-vous », cartes dates (Lilas), éditions passées s'il y en a
export default async function EventsPage({ params }: PageProps<"/[locale]/evenements">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Events");

  const jsonLd = upcomingEvents.map((e) => ({
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.name,
    startDate: e.startsAt,
    ...(e.endsAt ? { endDate: e.endsAt } : {}),
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
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHeader
        title={t.rich("heading", { line: mobileLine, accent: copperWord })}
        sticker={{ src: "/stickers/calendrier.png", rotate: 8, width: 360, height: 360 }}
      />

      <Band duo="lilas" aria-label={t("upcoming")} className="flex flex-col gap-3 px-3 py-3 md:px-8 md:py-8">
        {upcomingEvents.map((e, i) => (
          <DateCard key={e.slug} event={e} reverse={i % 2 === 1} />
        ))}
      </Band>

      {pastEvents.length > 0 && (
        <Band duo="ivoire" className="flex flex-col gap-3 px-3 pb-3 pt-8 md:px-8 md:pb-8 md:pt-12">
          <h2 data-heading-reveal className="pb-5 text-center font-title text-[36px] leading-none tracking-[-0.02em] md:text-[48px]">
            {t("archivesTitle")}
          </h2>
          {pastEvents.map((e, i) => (
            <DateCard key={e.slug} event={e} reverse={i % 2 === 1} />
          ))}
        </Band>
      )}

      <GiantBand />
      <Reveals />
    </>
  );
}
