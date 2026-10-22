import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { socials } from "@/components/layout/nav-items";
import { PageMain, Section } from "@/components/section";
import { AddToCalendar } from "@/components/ticketing/add-to-calendar";
import { ButtonLink } from "@/components/ui";
import { events } from "@/data/events";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => events.map((e) => ({ locale, slug: e.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/billetterie/[slug]/merci">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Thanks" });
  return { title: t("metaTitle"), robots: { index: false } };
}

async function Thanks({ params }: { params: PageProps<"/[locale]/billetterie/[slug]/merci">["params"] }) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const event = events.find((e) => e.slug === slug);
  if (!event) notFound();

  const t = await getTranslations("Thanks");
  const format = await getFormatter();
  const date = format.dateTime(new Date(event.startsAt), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const place = `${event.venue ? `${event.venue}, ` : ""}${event.city}, ${event.country}`;

  return (
    <>
      <Section>
        <p className="font-label text-sm uppercase tracking-widest text-solar-copper">{t("eyebrow")}</p>
        <h1 className="mt-4 max-w-3xl font-title text-[clamp(2.25rem,8vw,4.5rem)] leading-[1.05]">{t("title")}</h1>
        <p className="mt-5 max-w-2xl text-lg text-warm-ivory/90">{t("intro")}</p>
        <p className="mt-6 font-label text-3xl uppercase tracking-wide text-solar-copper">{date}</p>
        <p className="mt-1 text-lg text-warm-ivory/90">
          {event.name} · {place}
        </p>
      </Section>

      <Section>
        <h2 className="font-title text-3xl md:text-4xl">{t("calendarTitle")}</h2>
        <p className="mt-3 max-w-xl text-warm-ivory/80">{t("calendarText")}</p>
        <AddToCalendar slug={event.slug} name={event.name} startsAt={event.startsAt} location={place} description={t("calendarDescription")} />
      </Section>

      <Section>
        <h2 className="font-title text-3xl md:text-4xl">{t("followTitle")}</h2>
        <p className="mt-3 max-w-xl text-warm-ivory/80">{t("followText")}</p>
        <ul className="mt-6 flex flex-wrap gap-3">
          {socials.map((s) => (
            <li key={s.label}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover-glow inline-flex min-h-11 items-center rounded-full border border-warm-ivory/40 px-6 py-3 font-label text-base uppercase tracking-wider text-warm-ivory"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <ButtonLink href="/evenements" variant="ghost" className="mt-8 w-full sm:w-64">
          {t("allEvents")}
        </ButtonLink>
      </Section>
    </>
  );
}

export default function ThanksPage({ params }: PageProps<"/[locale]/billetterie/[slug]/merci">) {
  return (
    <PageMain>
      <Suspense fallback={<Section><div className="h-64" aria-hidden /></Section>}>
        <Thanks params={params} />
      </Suspense>
    </PageMain>
  );
}
