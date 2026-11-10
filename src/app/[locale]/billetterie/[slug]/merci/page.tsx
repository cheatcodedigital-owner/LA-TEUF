import type { Metadata } from "next";
import Image from "next/image";
import { hasLocale } from "next-intl";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Band } from "@/components/ds/band";
import { Reveals } from "@/components/ds/slush-motion";
import { Sticker } from "@/components/ds/sticker";
import { AddToCalendar } from "@/components/ticketing/add-to-calendar";
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

// Billet confirmé (maquette « Billet confirmé — merci ») : bande Violet, rappel calendrier et billet façon Wallet.
// La page ne connaît pas la commande : le vrai QR code est dans l'e-mail (et sur WhatsApp).
async function Thanks({ params }: { params: PageProps<"/[locale]/billetterie/[slug]/merci">["params"] }) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const event = events.find((e) => e.slug === slug);
  if (!event) notFound();

  const t = await getTranslations("Thanks");
  const format = await getFormatter();
  const start = new Date(event.startsAt);
  const date = format.dateTime(start, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: event.timeZone });
  // « 03 h » → « 3 h »
  const hour = (d: Date) => format.dateTime(d, { hour: "numeric", timeZone: event.timeZone }).replace(/^0(?=\d)/, "");
  const time = event.endsAt ? `${hour(start)} – ${hour(new Date(event.endsAt))}` : hour(start);
  const place = `${event.venue ? `${event.venue}, ` : ""}${event.city}, ${event.country}`;
  const [first, ...rest] = event.name.split(" au ");

  return (
    <>
      <Band duo="violet" className="flex flex-col gap-10 overflow-hidden px-5 pb-10 pt-8 md:px-16 md:py-20 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex max-w-[700px] flex-col gap-6">
          <p data-load-stagger className="flex h-8 items-center gap-2 self-start rounded-full bg-warm-ivory px-4 font-label text-[14px] uppercase tracking-[0.04em] text-violet-deep">
            <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
              <path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("badge")}
          </p>
          <h1 data-anim-slant className="font-title text-[56px] leading-[92%] tracking-[-0.02em] md:text-[96px]">
            {t.rich("heading", { accent: (c) => <span className="text-violet-pale">{c}</span> })}
          </h1>
          <p data-load-stagger className="max-w-[560px] font-body text-[16px] leading-[160%] md:text-[18px]">
            {t("text", { venue: event.venue ?? event.city })}
          </p>
          <div data-load-stagger className="flex flex-col gap-3">
            <p className="font-label text-[14px] uppercase tracking-[0.06em] text-violet-pale">{t("calendarTitle")}</p>
            <AddToCalendar slug={event.slug} name={event.name} startsAt={event.startsAt} endsAt={event.endsAt} location={place} description={t("calendarDescription")} />
          </div>
        </div>

        {/* Billet façon Wallet (illustratif) */}
        <div data-load-stagger className="relative mx-auto w-full max-w-[400px] shrink-0 lg:mx-0" style={{ rotate: "-3deg" }}>
          <div className="overflow-hidden rounded-[28px] border border-cosmic-black text-cosmic-black">
            <div className="flex flex-col gap-5 bg-solar-copper p-6 pb-7">
              <Image src="/brand/logo-badge.svg" alt="" width={48} height={48} unoptimized className="size-12" />
              <p className="font-title text-[44px] leading-[90%] md:text-[52px]">
                {first}
                {rest.length > 0 && (
                  <>
                    <br />
                    au {rest.join(" au ")}
                  </>
                )}
              </p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                {[
                  [t("ticketDate"), date],
                  [t("ticketTime"), time],
                  [t("ticketVenue"), event.venue ?? event.city],
                  [t("ticketCity"), event.city],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-label text-[11px] uppercase tracking-[0.08em]">{k}</dt>
                    <dd className="font-label text-[19px] uppercase leading-6">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="border-t-2 border-dashed border-cosmic-black bg-warm-ivory p-6 text-center text-deep-indigo">
              <div className="mx-auto flex size-40 items-center justify-center rounded-[20px] border border-cosmic-black bg-deep-indigo">
                <Image src="/brand/keyhole.png" alt="" width={120} height={120} className="h-20 w-auto opacity-90" />
              </div>
              <p className="mt-4 font-label text-[18px] uppercase leading-6">{t("ticketQr")}</p>
              <p className="mt-1 font-body text-[13px] leading-[18px]">{t("ticketHint")}</p>
            </div>
          </div>
          <Sticker src="/stickers/etoiles.png" rotate={-6} className="-bottom-6 -left-8 size-24" />
        </div>
      </Band>
      <Reveals />
    </>
  );
}

export default function ThanksPage({ params }: PageProps<"/[locale]/billetterie/[slug]/merci">) {
  return (
    <Suspense fallback={<div aria-hidden className="h-[640px] rounded-band bg-violet-deep md:rounded-band-lg" />}>
      <Thanks params={params} />
    </Suspense>
  );
}
