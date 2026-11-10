import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Band } from "@/components/ds/band";
import { GiantBand } from "@/components/ds/site-footer";
import { Reveals } from "@/components/ds/slush-motion";
import { EventAbout, EventHeader, EventLineup } from "@/components/events/event-bands";
import { EventFaq } from "@/components/events/event-faq";
import { PurchaseShell } from "@/components/ticketing/purchase-shell";
import { TicketForm } from "@/components/ticketing/ticket-form";
import { events } from "@/data/events";
import { routing } from "@/i18n/routing";
import { getEventSales } from "@/lib/ticketing/sales";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => events.map((e) => ({ locale, slug: e.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/billetterie/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "Ticketing" });
  const event = events.find((e) => e.slug === slug);
  return { title: event ? `${event.name} · ${t("metaTitle")}` : t("metaTitle"), robots: { index: false } };
}

// Questions de la FAQ reprises dans « Avant de réserver » : [rubrique, question] dans Faq.groups
const FAQ_PICKS: [number, number][] = [
  [1, 1], // Quels sont les tarifs ?
  [3, 1], // Combien de temps mes places sont-elles gardées ?
  [3, 0], // Comment payer ?
  [4, 0], // Comment je reçois mes billets ?
  [4, 4], // Puis-je me faire rembourser ou échanger mon billet ?
];

/** Colonne de droite : panneau d'achat, ou l'état de la vente (bientôt, complet, terminé, indisponible) */
async function Sales({
  params,
  searchParams,
}: {
  params: PageProps<"/[locale]/billetterie/[slug]">["params"];
  searchParams: PageProps<"/[locale]/billetterie/[slug]">["searchParams"];
}) {
  // `params` et les places restantes sont lus ici, dans <Suspense> : la coque statique reste instantanée
  // et l'état change à chaque achat (jamais de cache).
  const { locale, slug } = await params;
  // Lien partagé par un influenceur ou sur un visuel : ?code=XXXX préremplit le champ code promo
  const rawCode = (await searchParams).code;
  const code = (Array.isArray(rawCode) ? rawCode[0] : rawCode)?.trim().toUpperCase();
  const initialPromo = code && /^[A-Z0-9_-]{1,32}$/.test(code) ? code : undefined;
  setRequestLocale(locale);
  await connection();
  const result = await getEventSales(slug);
  const t = await getTranslations("Ticketing");
  const format = await getFormatter();

  let state: { title: string; text: string } | null = null;
  if (result.kind === "not_found") notFound();
  if (result.kind === "unavailable") state = { title: t("unavailableTitle"), text: t("unavailableText") };
  else if (result.sales.event.status === "soon") state = { title: t("soonTitle"), text: t("soonText") };
  else if (result.sales.event.status === "ended") state = { title: t("endedTitle"), text: t("endedText") };
  else if (result.sales.soldOut) state = { title: t("soldOutTitle"), text: t("soldOutText") };

  if (state || result.kind !== "ok") {
    return (
      <Band duo="violet" as="aside" className="flex flex-col gap-4 p-6 md:p-8 lg:sticky lg:top-24">
        <h2 className="font-title text-[32px] leading-[100%] md:text-[40px]">{state?.title}</h2>
        <p className="font-body text-[16px] leading-[150%]">{state?.text}</p>
      </Band>
    );
  }

  const { sales, sample } = result;
  const onSale = sales.tiers.filter((x) => x.onSale);
  const early = sales.tiers.find((x) => x.kind === "early_bird");
  const from = onSale.length ? format.number(Math.min(...onSale.map((x) => x.priceXof))) + " FCFA" : null;
  return (
    <PurchaseShell from={from}>
      {/* Places en ligne restantes (early bird) : la capacité inclut aussi les billets vendus à la porte */}
      {early?.onSale && early.remaining <= 30 && (
        <p className="px-6 pt-6 font-label text-[14px] uppercase tracking-[0.06em] text-copper-deep md:px-8 md:pt-8">
          {t("remainingOnline", { count: early.remaining })}
        </p>
      )}
      <TicketForm slug={sales.event.slug} tiers={sales.tiers} sample={sample} initialPromo={initialPromo} />
    </PurchaseShell>
  );
}

// Page d'un événement (maquette « Événement KARMA ») : en-tête Cuivre, puis la soirée, le line-up et la FAQ billets
// à gauche, le panneau d'achat collant à droite (volet en bas d'écran sur mobile).
async function EventContent({
  params,
  searchParams,
}: {
  params: PageProps<"/[locale]/billetterie/[slug]">["params"];
  searchParams: PageProps<"/[locale]/billetterie/[slug]">["searchParams"];
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const event = events.find((e) => e.slug === slug);
  if (!event) notFound();
  const tf = await getTranslations("Faq");
  const groups = tf.raw("groups") as { items: { q: string; a: string }[] }[];
  const faq = FAQ_PICKS.map(([g, i]) => groups[g]?.items[i]).filter(Boolean);

  return (
    <>
      <EventHeader event={event} />
      <div className="flex flex-col gap-2 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(400px,468px)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-2">
          <EventAbout event={event} />
          <EventLineup event={event} />
          <EventFaq items={faq} />
        </div>
        <Suspense fallback={<div className="hidden h-[600px] rounded-band-lg border-2 border-solar-copper bg-warm-ivory lg:block" aria-hidden />}>
          <Sales params={params} searchParams={searchParams} />
        </Suspense>
      </div>
      <GiantBand />
      {/* Place pour la barre d'achat fixe (mobile) */}
      <div aria-hidden className="h-20 lg:hidden" />
      <Reveals />
    </>
  );
}

export default function EventPage({ params, searchParams }: PageProps<"/[locale]/billetterie/[slug]">) {
  return (
    <Suspense fallback={<div aria-hidden className="h-[520px] rounded-band bg-solar-copper md:rounded-band-lg" />}>
      <EventContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
