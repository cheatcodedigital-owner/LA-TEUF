"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Flip } from "@/components/ds/flip";
import { getPathname, Link } from "@/i18n/navigation";
import { COUNTRIES, HOLD_MINUTES, MAX_PER_ORDER, TURNSTILE_TEST_SITE_KEY } from "@/lib/ticketing/config";
import { formatXof } from "@/lib/ticketing/format";
import type { CheckoutResponse, ConfirmResponse, OrderSummary, PaymentConfig, PaymentFailure, ReserveResponse, Tier } from "@/lib/ticketing/types";
import { openKkiapay } from "./kkiapay-widget";
import { Turnstile } from "./turnstile";

/*
 * Panneau d'achat v2 (maquettes « Événement KARMA » et « Après « Réserver » ») : fond Ivoire, tarifs en cartes radio
 * (sélection Cuivre ; le standard, vendu à la porte, reste affiché en pointillés), compteur − / +, champs en pilule,
 * total, CTA Cuivre. Codes promo : early bird uniquement ; pas de remise de groupe. Après « Réserver » : en-tête Cuivre
 * avec le compte à rebours, récapitulatif, « Payer ». La logique (réservation, anti-robot, Kkiapay, confirmation
 * serveur) est inchangée.
 */

const label = "font-label text-[14px] uppercase leading-[18px] tracking-[0.06em] text-cosmic-black";
const fieldLabel = "mb-1.5 block px-[22px] font-label text-[12px] uppercase leading-4 tracking-[0.06em] text-deep-indigo";
const input =
  "h-[52px] w-full rounded-full border border-cosmic-black bg-transparent px-[22px] font-body text-[16px] text-deep-indigo outline-none transition-colors placeholder:text-deep-indigo/55 focus:bg-violet-pale focus:ring-1 focus:ring-inset focus:ring-cosmic-black aria-[invalid=true]:border-copper-deep aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-inset aria-[invalid=true]:ring-copper-deep disabled:cursor-not-allowed disabled:border-dashed disabled:bg-transparent";
const alert = "rounded-[24px] border border-copper-deep bg-copper-pale px-5 py-4 font-body text-[15px] leading-[145%] text-deep-indigo";
const tierBadge =
  "rounded-full border border-cosmic-black bg-violet-pale px-2 py-0.5 font-label text-[11px] uppercase leading-[14px] text-cosmic-black";
const cta = "h-[60px] w-full px-6 text-[18px] [&_.flip-front]:border [&_.flip-front]:border-cosmic-black";

const SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || (process.env.NODE_ENV !== "production" ? TURNSTILE_TEST_SITE_KEY : undefined);

function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 1000);
  return () => window.clearInterval(id);
}
const getSeconds = () => Math.floor(Date.now() / 1000);
const getServerSeconds = () => null;

type Saved = Record<string, string>;
type PayStep = "idle" | "verifying" | "checking" | "ready" | "confirming" | "failed" | "paid" | "refund" | "error";

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className={`${alert} flex gap-3`}>
      <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-copper-deep font-label text-[16px] text-warm-ivory">
        !
      </span>
      <div>{children}</div>
    </div>
  );
}

// Fenêtre bloquante pendant la vérification du paiement auprès de Kkiapay (portail : un parent transformé casserait `fixed`)
function ValidatingDialog({ failure, onRetry }: { failure?: PaymentFailure; onRetry?: () => void }) {
  const t = useTranslations("Ticketing");
  const card = "w-full max-w-[476px] rounded-band px-6 py-10 text-center md:rounded-band-lg md:px-10 md:py-14";
  if (failure) {
    return createPortal(
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-cosmic-black/80 p-4">
        <div role="alertdialog" aria-modal="true" aria-labelledby="failed-title" aria-describedby="failed-text" className={`${card} border-2 border-solar-copper bg-warm-ivory text-deep-indigo`}>
          <span aria-hidden className="mx-auto flex size-12 items-center justify-center rounded-full bg-copper-deep font-label text-[24px] text-warm-ivory">
            !
          </span>
          <h2 id="failed-title" className="mt-6 font-title text-[32px] leading-[100%]">
            {t("failure.title")}
          </h2>
          <p id="failed-text" className="mt-4 font-body text-[16px] leading-[150%]">
            {t(`failure.${failure}`)}
          </p>
          <p className="mt-3 font-body text-[14px] leading-[150%] opacity-80">{t("failure.hint")}</p>
          <div className="mt-7">
            <Flip tone="copper" size={cta} className="w-full" onClick={onRetry}>
              {t("retry")}
            </Flip>
          </div>
        </div>
      </div>,
      document.body,
    );
  }
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-cosmic-black/80 p-4">
      <div role="alertdialog" aria-modal="true" aria-labelledby="validating-title" aria-describedby="validating-text" className={`${card} bg-violet-pale text-deep-indigo`}>
        <div aria-hidden className="mx-auto size-20 animate-spin rounded-full border-[6px] border-warm-ivory border-t-violet-deep motion-reduce:animate-pulse" />
        <h2 id="validating-title" className="mt-7 font-title text-[32px] leading-[100%] md:text-[38px]">
          {t("confirmingTitle")}
        </h2>
        <p id="validating-text" aria-live="polite" className="mt-4 font-body text-[16px] leading-[150%]">
          {t("confirmingText")}
        </p>
        <Image src="/stickers/fusee.png" alt="" width={200} height={200} unoptimized className="mx-auto mt-6 size-24 -rotate-6" />
      </div>
    </div>,
    document.body,
  );
}

function Hold({
  slug,
  order,
  email,
  onModify,
  onRestart,
}: {
  slug: string;
  order: OrderSummary;
  email: string;
  onModify: () => Promise<void>;
  onRestart: () => void;
}) {
  const t = useTranslations("Ticketing");
  const locale = useLocale();
  const now = useSyncExternalStore(subscribe, getSeconds, getServerSeconds);
  const [step, setStep] = useState<PayStep>("idle");
  const [payError, setPayError] = useState<keyof CheckoutErrors | null>(null);
  const [payment, setPayment] = useState<PaymentConfig | null>(null);
  const [modifying, setModifying] = useState(false);
  const [failure, setFailure] = useState<PaymentFailure | null>(null);
  const left = now === null ? null : Math.max(0, Math.floor(new Date(order.expiresAt).getTime() / 1000) - now);

  async function checkout(token: string) {
    setStep("checking");
    try {
      const res = await fetch("/api/billetterie/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId, token }),
      });
      const data = (await res.json()) as CheckoutResponse;
      if (data.status === "ready") {
        setPayment(data.payment);
        await pay(data.payment);
      } else {
        setPayError(data.code);
        setStep("error");
      }
    } catch {
      setPayError("unavailable");
      setStep("error");
    }
  }

  // Ouvre le paiement. L'anti-bot n'est demandé qu'une fois : tant que `payment` est connu, « Payer » rouvre le widget.
  async function pay(config: PaymentConfig) {
    setPayError(null);
    if (config.mode === "sample") return confirm("sample");
    setStep("ready");
    try {
      await openKkiapay(
        { publicKey: config.publicKey, sandbox: config.sandbox, amount: order.totalXof, orderId: order.orderId, email },
        {
          onSuccess: (transactionId) => (transactionId ? confirm(transactionId) : fail("not_confirmed")),
          onFailed: (transactionId) => (transactionId ? confirm(transactionId) : declined("unknown")),
        },
      );
    } catch {
      fail("unavailable");
    }
  }

  // Paiement refusé : la fenêtre explique la raison, « Réessayer » ramène au bouton « Payer » (sans repasser par les informations)
  function declined(reason: PaymentFailure) {
    setFailure(reason);
    setStep("failed");
  }

  function fail(code: keyof CheckoutErrors) {
    setPayError(code);
    setStep("error");
  }

  // Le serveur revérifie la transaction auprès de Kkiapay avant d'émettre les billets
  async function confirm(transactionId: string) {
    setStep("confirming");
    try {
      const res = await fetch("/api/billetterie/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId, transactionId }),
      });
      const data = (await res.json()) as ConfirmResponse;
      if (data.status === "paid") {
        setStep("paid");
        // Navigation complète (et non client-side) : le routeur garde en mémoire la page précédente avec son état,
        // et un retour sur la billetterie rouvrirait la fenêtre de validation.
        window.location.assign(getPathname({ href: `/billetterie/${slug}/merci`, locale }));
      }
      else if (data.status === "refund_needed") setStep("refund");
      else if (data.status === "failed") declined(data.reason);
      else fail(data.code);
    } catch {
      fail("unavailable");
    }
  }

  async function modify() {
    setModifying(true);
    await onModify();
  }

  if (step === "paid" || step === "refund") {
    const paid = step === "paid";
    return (
      <div className="flex flex-col gap-4 p-6 text-deep-indigo md:p-8">
        {paid && <ValidatingDialog />}
        <h2 className="font-title text-[32px] leading-[100%]">{t(paid ? "paidTitle" : "refundTitle")}</h2>
        <p className="font-body text-[16px] leading-[150%]">
          {paid ? t("paidText", { count: order.quantity * (order.seats || 1), email }) : t("refundText")}
        </p>
        <p className="font-body text-[14px]">
          {t("reference")} <span className="font-label tracking-[0.06em]">{order.orderId.slice(0, 8).toUpperCase()}</span>
        </p>
      </div>
    );
  }

  if (left === 0) {
    return (
      <div className="flex flex-col gap-4 p-6 text-deep-indigo md:p-8">
        <h2 className="font-title text-[32px] leading-[100%]">{t("expiredTitle")}</h2>
        <p className="font-body text-[16px] leading-[150%]">{t("expiredText")}</p>
        <div className="mt-2">
          <Flip tone="copper" size={cta} className="w-full" onClick={onRestart}>
            {t("restart")}
          </Flip>
        </div>
      </div>
    );
  }

  const clock = left === null ? "--:--" : `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  const busy = step === "verifying" || step === "checking" || step === "confirming" || modifying;

  return (
    <div className="text-deep-indigo">
      <div className="flex items-center justify-between gap-4 border-b border-cosmic-black bg-solar-copper px-6 py-5 text-cosmic-black md:px-8 md:py-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-label text-[16px] uppercase leading-5 tracking-[0.04em]">{t("held")}</h2>
          <p className="font-body text-[13px] leading-[18px]">{t("heldFor")}</p>
        </div>
        <p role="timer" aria-live="off" className="font-label text-[44px] leading-none tabular-nums md:text-[52px]">
          {clock}
        </p>
      </div>

      <div className="flex flex-col gap-6 p-6 md:p-8">
        <div className="flex flex-col gap-3">
          <p className={label}>{t("summary")}</p>
          <dl className="flex flex-col gap-2 font-body text-[15px] leading-5">
            <div className="flex justify-between gap-4">
              <dt>
                {order.quantity} × {formatXof(order.unitPriceXof, locale)}
              </dt>
              <dd className="font-label text-[17px]">{formatXof(order.subtotalXof, locale)}</dd>
            </div>
            {order.discountXof > 0 && (
              <div className="flex justify-between gap-4 text-copper-deep">
                <dt>{t("discount")}</dt>
                <dd className="font-label text-[17px]">− {formatXof(order.discountXof, locale)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="sr-only">{t("email")}</dt>
              <dd className="break-all">{email}</dd>
            </div>
          </dl>
          <div className="flex items-baseline justify-between gap-4 border-t border-cosmic-black pt-4">
            <p className="font-label text-[16px] uppercase tracking-[0.06em] text-cosmic-black">{t("total")}</p>
            <p className="font-label text-[36px] leading-none text-cosmic-black md:text-[44px]">{formatXof(order.totalXof, locale)}</p>
          </div>
        </div>

        {step === "verifying" && (
          <div className="flex flex-col gap-2">
            <p className={label}>{t("verifyTitle")}</p>
            <p className="font-body text-[14px] leading-[150%]">{t("verifyText")}</p>
            {SITE_KEY ? (
              <Turnstile
                siteKey={SITE_KEY}
                locale={locale}
                onToken={checkout}
                onError={() => {
                  setPayError("antibot");
                  setStep("error");
                }}
              />
            ) : (
              <Alert>{t("payErrors.unavailable")}</Alert>
            )}
          </div>
        )}
        {step === "checking" && <p className="font-body text-[15px]">{t("checking")}</p>}
        {step === "confirming" && <ValidatingDialog />}
        {step === "failed" && failure && (
          <ValidatingDialog
            failure={failure}
            onRetry={() => {
              setFailure(null);
              setStep("idle");
            }}
          />
        )}
        {step === "ready" && <p className="rounded-[24px] bg-violet-pale px-5 py-4 font-body text-[15px] leading-[145%]">{t("payWaiting")}</p>}
        {step === "error" && payError && <Alert>{t(`payErrors.${payError}`)}</Alert>}

        <div className="flex flex-col gap-4">
          <Flip
            tone="copper"
            size={cta}
            className="w-full"
            disabled={busy}
            onClick={() => {
              setPayError(null);
              if (payment) void pay(payment);
              else setStep("verifying");
            }}
          >
            {t("pay", { amount: formatXof(order.totalXof, locale) })}
          </Flip>
          <p className="font-body text-[13px] leading-[19px]">{t("payHint")}</p>
          <button
            type="button"
            disabled={step === "checking" || step === "confirming" || modifying}
            onClick={modify}
            className="self-center font-label text-[15px] uppercase tracking-[0.04em] text-copper-deep underline underline-offset-4 disabled:opacity-50"
          >
            {modifying ? t("modifying") : t("modify")}
          </button>
          <p className="text-center font-body text-[13px] leading-[19px]">{t("modifyHint")}</p>
        </div>
      </div>
    </div>
  );
}

type CheckoutErrors = { antibot: true; not_payable: true; unavailable: true; failed: true; not_confirmed: true };

export function TicketForm({ slug, tiers, sample, initialPromo }: { slug: string; tiers: Tier[]; sample: boolean; initialPromo?: string }) {
  const t = useTranslations("Ticketing");
  const locale = useLocale();
  const [response, setResponse] = useState<ReserveResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [restarted, setRestarted] = useState(0);
  const [saved, setSaved] = useState<Saved>(initialPromo ? { promo: initialPromo } : {});
  // Le standard est vendu uniquement à la porte : jamais sélectionnable en ligne, quel que soit l'état renvoyé par la base
  const online = (x: Tier) => x.onSale && x.kind !== "standard" && x.state !== "door";
  const [tierId, setTierId] = useState(tiers.find(online)?.id ?? "");
  const [quantity, setQuantity] = useState(1);

  const tier = tiers.find((x) => x.id === tierId && online(x));
  const anyOnSale = tiers.some(online);
  const max = Math.max(1, Math.min(MAX_PER_ORDER, tier?.remaining ?? 1));
  const qty = Math.min(quantity, max);
  const error = response?.status === "error" ? response : null;
  const errors = error?.fieldErrors;
  const countryNames = new Intl.DisplayNames([locale], { type: "region" });
  const dateFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" });

  const subtotal = (tier?.priceXof ?? 0) * qty;
  const tableSelected = tier?.kind === "table";
  // Codes promo : early bird uniquement
  const noPromo = tier?.kind !== "early_bird";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !tier) return;
    const form = new FormData(event.currentTarget);
    setSaved(
      Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")) as Saved,
    );
    setPending(true);
    try {
      const res = await fetch("/api/billetterie/reserve", { method: "POST", body: form });
      setResponse((await res.json()) as ReserveResponse);
    } catch {
      setResponse({ status: "error", code: "unavailable" });
    } finally {
      setPending(false);
    }
  }

  // Retour au formulaire : on libère les places puis on réaffiche les informations saisies
  async function modifyReservation(order: OrderSummary) {
    try {
      await fetch("/api/billetterie/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId, email: saved.email ?? "" }),
      });
    } catch {
      // La réservation expirera d'elle-même : on revient quand même au formulaire
    }
    setResponse(null);
    setRestarted((n) => n + 1);
  }

  if (response?.status === "success") {
    return (
      <Hold
        slug={slug}
        order={response.order}
        email={saved.email ?? ""}
        onModify={() => modifyReservation(response.order)}
        onRestart={() => {
          setResponse(null);
          setRestarted((n) => n + 1);
        }}
      />
    );
  }

  return (
    <form key={restarted} onSubmit={onSubmit} className="flex flex-col gap-6 p-6 text-deep-indigo md:p-8" noValidate>
      <h2 className="font-title text-[36px] leading-[96%] md:text-[44px]">{t("panelTitle")}</h2>
      {sample && <p className="rounded-[24px] bg-copper-pale px-5 py-3 font-body text-[14px] leading-[145%]">{t("sampleNotice")}</p>}

      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="ticketTypeId" value={tier?.id ?? ""} />
      <input type="hidden" name="quantity" value={qty} />

      <fieldset className="flex flex-col gap-2">
        <legend className={`${label} mb-2`}>{t("tier")}</legend>
        {tiers.map((x) => {
          const isTable = x.kind === "table";
          const atDoor = x.kind === "standard" || x.state === "door";
          const available = online(x);
          const selected = x.id === tier?.id;
          const note = atDoor
            ? null
            : x.state === "upcoming" && x.salesStart
                ? t("availableFrom", { date: dateFmt.format(new Date(x.salesStart)) })
                : x.state === "sold_out"
                  ? t("soldOutTier")
                  : x.state === "closed"
                    ? t("closedTier")
                    : t(isTable ? "tableRemaining" : "tierRemaining", { count: x.remaining });
          const badge = atDoor
            ? t("doorBadge")
              : x.state === "upcoming"
                ? t("soonBadge")
                : x.state === "sold_out"
                  ? t("soldOutTier")
                  : x.state === "closed"
                    ? t("closedTier")
                    : null;
          // Standard (à la porte) : pastille sur la ligne du nom, puis « Consommation incluse » et le prix grisé
          if (atDoor) {
            return (
              <label key={x.id} aria-disabled className="flex cursor-not-allowed flex-col gap-1.5 rounded-[24px] border border-dashed border-cosmic-black px-[18px] py-4">
                <input type="radio" name="tierChoice" value={x.id} checked={false} disabled readOnly className="sr-only" />
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-label text-[15px] uppercase leading-[18px] tracking-[0.04em]">{t(`tierKinds.${x.kind}`)}</span>
                  <span className={`${tierBadge} whitespace-nowrap`}>{badge}</span>
                </span>
                {/* pr-10 : le prix s'aligne sur ceux des autres tarifs (pastille radio de 24 px + écart) */}
                <span className="flex items-baseline justify-between gap-4 pr-10">
                  <span className="font-body text-[13px] leading-[18px]">{t("drinkIncluded")}</span>
                  <span className="shrink-0 font-label text-[22px] leading-[30px] text-deep-indigo/55 md:text-[26px]">{formatXof(x.priceXof, locale)}</span>
                </span>
              </label>
            );
          }
          return (
            <label
              key={x.id}
              aria-disabled={!available}
              className={`flex items-center gap-4 rounded-[24px] px-[18px] py-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-solar-copper ${
                available
                  ? selected
                    ? "cursor-pointer border border-cosmic-black bg-solar-copper text-cosmic-black"
                    : "cursor-pointer border border-cosmic-black hover:bg-copper-pale"
                  : "cursor-not-allowed border border-dashed border-cosmic-black"
              }`}
            >
              <input
                type="radio"
                name="tierChoice"
                value={x.id}
                checked={selected}
                disabled={!available}
                onChange={() => setTierId(x.id)}
                className="sr-only"
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-label text-[15px] uppercase leading-[18px] tracking-[0.04em]">
                    {t(`tierKinds.${x.kind}`)}
                    {isTable ? ` · ${t("tableSeats", { seats: x.seats })}` : ""}
                  </span>
                  {badge && (
                    <span className={tierBadge}>{badge}</span>
                  )}
                </span>
                {!isTable && <span className="font-body text-[13px] leading-[18px]">{t("drinkIncluded")}</span>}
                {note && <span className="font-body text-[13px] leading-[18px]">{note}</span>}
                {isTable && available && x.nextPriceXof && x.nextPriceAt && (
                  <span className="font-body text-[13px] leading-[18px]">
                    {t("priceRises", { price: formatXof(x.nextPriceXof, locale), date: dateFmt.format(new Date(x.nextPriceAt)) })}
                  </span>
                )}
              </span>
              <span className={`shrink-0 font-label text-[22px] leading-[30px] md:text-[26px] ${available ? "" : "text-deep-indigo/55"}`}>
                {formatXof(x.priceXof, locale)}
              </span>
              <span
                aria-hidden
                className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                  !available ? "" : selected ? "bg-cosmic-black" : "border border-cosmic-black"
                }`}
              >
                {selected && <span className="size-[9px] rounded-full bg-warm-ivory" />}
              </span>
            </label>
          );
        })}
        {tableSelected && <p className="px-[18px] font-body text-[13px] leading-[18px] text-copper-deep">{t("tableNoPromo")}</p>}
      </fieldset>

      {!anyOnSale ? (
        <p className="rounded-[24px] bg-violet-pale px-5 py-4 font-body text-[15px] leading-[145%]">{t("noneOnSale")}</p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <span className={label}>{tableSelected ? t("quantityTables") : t("quantityMax", { max: MAX_PER_ORDER })}</span>
            <div className="flex h-14 items-center justify-between rounded-full border border-cosmic-black px-1.5">
              <button
                type="button"
                aria-label={t("decrease")}
                onClick={() => setQuantity((q) => Math.max(1, Math.min(q, max) - 1))}
                disabled={qty <= 1}
                className="flex size-11 items-center justify-center rounded-full border border-cosmic-black text-cosmic-black disabled:opacity-35"
              >
                <svg viewBox="0 0 18 18" className="size-4" aria-hidden>
                  <path d="M3 9h12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
              <span className="font-label text-[26px] leading-[30px] tabular-nums text-cosmic-black" aria-live="polite">
                {qty}
              </span>
              <button
                type="button"
                aria-label={t("increase")}
                onClick={() => setQuantity((q) => Math.min(max, Math.min(q, max) + 1))}
                disabled={qty >= max}
                className="flex size-11 items-center justify-center rounded-full bg-cosmic-black text-warm-ivory disabled:opacity-35"
              >
                <svg viewBox="0 0 18 18" className="size-4" aria-hidden>
                  <path d="M9 3v12M3 9h12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {tableSelected && <p className="px-[22px] font-body text-[13px] leading-[18px]">{t("tableHint", { seats: tier?.seats ?? 1 })}</p>}
          </div>

          <div className="flex flex-col gap-3.5">
            <p className={label}>{t("you")}</p>
            <div>
              <label htmlFor="name" className={fieldLabel}>{t("name")}</label>
              <input id="name" name="name" autoComplete="name" defaultValue={saved.name} className={input} aria-invalid={errors?.name} required />
            </div>
            <div>
              <label htmlFor="email" className={fieldLabel}>{t("email")}</label>
              <input id="email" name="email" type="email" autoComplete="email" defaultValue={saved.email} className={input} aria-invalid={errors?.email} required />
            </div>
            <div>
              <label htmlFor="whatsapp" className={fieldLabel}>{t("whatsapp")}</label>
              <input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                autoComplete="tel"
                placeholder="+228 90 00 00 00"
                defaultValue={saved.whatsapp}
                className={input}
                aria-invalid={errors?.whatsapp}
                aria-describedby="whatsapp-hint"
                required
              />
              <p id="whatsapp-hint" className="mt-1.5 px-[22px] font-body text-[13px] leading-[18px]">{t("whatsappHint")}</p>
            </div>
            <div className="relative">
              <label htmlFor="country" className={fieldLabel}>{t("country")}</label>
              <select id="country" name="country" defaultValue={saved.country ?? "TG"} className={`${input} appearance-none pr-12`} aria-invalid={errors?.country}>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c === "OTHER" ? t("countryOther") : countryNames.of(c)}
                  </option>
                ))}
              </select>
              <svg viewBox="0 0 14 14" className="pointer-events-none absolute bottom-[19px] right-[22px] size-3.5" aria-hidden>
                <path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <label htmlFor="promo" className={fieldLabel}>{t("promo")}</label>
              <input
                id="promo"
                name="promo"
                autoCapitalize="characters"
                defaultValue={saved.promo}
                disabled={noPromo}
                placeholder={noPromo ? t("promoEarly") : t("promoPlaceholder")}
                className={`${input} uppercase placeholder:normal-case`}
                aria-invalid={errors?.promo}
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" name="terms" defaultChecked={saved.terms === "on"} className="peer sr-only" aria-invalid={errors?.terms} />
            <span
              aria-hidden
              className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full border border-cosmic-black text-transparent peer-checked:bg-cosmic-black peer-checked:text-warm-ivory peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-solar-copper"
            >
              <svg viewBox="0 0 12 12" className="size-3">
                <path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className={`font-body text-[15px] leading-[20px] ${errors?.terms ? "text-copper-deep" : ""}`}>
              {t.rich("terms", {
                link: (chunks) => (
                  <Link href="/cgv" target="_blank" className="underline underline-offset-4">
                    {chunks}
                  </Link>
                ),
              })}
            </span>
          </label>

          {error && <Alert>{error.code ? t(`errors.${error.code}`, { count: error.remaining ?? 0 }) : t("errors.form")}</Alert>}

          <dl className="flex flex-col gap-2.5 border-t border-cosmic-black pt-[18px]">
            {tier && (
              <div className="flex justify-between gap-4 font-body text-[15px] leading-5">
                <dt>{t("summaryLine", { count: qty, tier: t(`tierKinds.${tier.kind}`) })}</dt>
                <dd className="font-label text-[17px]">{formatXof(subtotal, locale)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-4">
              <dt className="font-label text-[16px] uppercase tracking-[0.06em] text-cosmic-black">{t("total")}</dt>
              <dd className="font-label text-[36px] leading-[44px] text-cosmic-black md:text-[40px]">{formatXof(subtotal, locale)}</dd>
            </div>
          </dl>

          <div className="flex flex-col gap-4">
            <Flip type="submit" tone="copper" size={cta} className="w-full" disabled={pending || !tier}>
              {pending ? t("submitting") : t("submit")}
            </Flip>
            <p className="text-center font-body text-[13px] leading-[19px]">{t("panelHint", { minutes: HOLD_MINUTES })}</p>
          </div>
        </>
      )}
    </form>
  );
}
