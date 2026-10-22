import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageMain, Section } from "@/components/section";
import { TicketForm } from "@/components/ticketing/ticket-form";
import { events } from "@/data/events";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getEventSales } from "@/lib/ticketing/sales";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => events.map((e) => ({ locale, slug: e.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/billetterie/[slug]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Ticketing" });
  return { title: t("metaTitle"), robots: { index: false } };
}

async function Sales({ params }: { params: PageProps<"/[locale]/billetterie/[slug]">["params"] }) {
  // `params` et les places restantes sont lus ici, dans <Suspense> : la coque statique reste instantanée
  // et l'état change à chaque achat (jamais de cache).
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  await connection();
  const result = await getEventSales(slug);
  if (result.kind === "not_found") notFound();

  const t = await getTranslations("Ticketing");
  const format = await getFormatter();

  if (result.kind === "unavailable") {
    return (
      <Section>
        <h1 className="font-title text-4xl md:text-5xl">{t("unavailableTitle")}</h1>
        <p className="mt-4 text-warm-ivory/80">{t("unavailableText")}</p>
      </Section>
    );
  }

  const { sales, sample } = result;
  const { event } = sales;
  const date = format.dateTime(new Date(event.startsAt), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  let state: { title: string; text: string } | null = null;
  if (event.status === "soon") state = { title: t("soonTitle"), text: t("soonText") };
  else if (event.status === "ended") state = { title: t("endedTitle"), text: t("endedText") };
  else if (sales.soldOut) state = { title: t("soldOutTitle"), text: t("soldOutText") };

  return (
    <>
      <Section>
        <Link href="/evenements" className="font-label text-sm uppercase tracking-widest text-warm-ivory/70 hover:text-solar-copper">
          ← {t("back")}
        </Link>
        <h1 className="mt-6 max-w-3xl font-title text-[clamp(2.25rem,8vw,4.5rem)] leading-[1.05]">{event.name}</h1>
        <p className="mt-5 font-label text-3xl uppercase tracking-wide text-solar-copper">{date}</p>
        <p className="mt-1 text-lg text-warm-ivory/90">
          {event.venue ? `${event.venue} · ` : ""}
          {event.city}, {event.country}
        </p>
        {!state && sales.remaining <= 30 && (
          <p className="mt-4 font-label text-sm uppercase tracking-widest text-solar-copper">
            {t("remaining", { count: sales.remaining })}
          </p>
        )}
      </Section>

      {state ? (
        <Section>
          <h2 className="font-title text-3xl md:text-4xl">{state.title}</h2>
          <p className="mt-4 max-w-xl text-warm-ivory/80">{state.text}</p>
        </Section>
      ) : (
        <TicketForm slug={event.slug} tiers={sales.tiers} sample={sample} />
      )}
    </>
  );
}

export default function TicketingPage({ params }: PageProps<"/[locale]/billetterie/[slug]">) {
  return (
    <PageMain>
      <Suspense fallback={<Section><div className="h-64" aria-hidden /></Section>}>
        <Sales params={params} />
      </Suspense>
    </PageMain>
  );
}
