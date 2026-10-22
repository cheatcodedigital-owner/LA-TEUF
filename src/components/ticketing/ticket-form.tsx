"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { COUNTRIES, groupDiscountPercent, MAX_PER_ORDER, TURNSTILE_TEST_SITE_KEY } from "@/lib/ticketing/config";
import { formatXof } from "@/lib/ticketing/format";
import type { CheckoutResponse, ConfirmResponse, OrderSummary, PaymentConfig, ReserveResponse, Tier } from "@/lib/ticketing/types";
import { openKkiapay } from "./kkiapay-widget";
import { Turnstile } from "./turnstile";

// Champs clairs sur fond Indigo : le formulaire est une carte Deep Indigo, les champs sont en Cosmic Black
const input =
  "w-full rounded-full bg-cosmic-black px-6 py-3.5 text-warm-ivory outline-none ring-1 ring-warm-ivory/25 transition placeholder:text-warm-ivory/40 hover:ring-warm-ivory/50 focus:ring-2 focus:ring-ultraviolet aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-solar-copper disabled:cursor-not-allowed disabled:opacity-50";
const label = "mb-2 block px-2 font-label text-sm uppercase tracking-widest text-warm-ivory/80";
const primary =
  "hover-glow inline-flex min-h-11 items-center justify-center rounded-full bg-solar-copper py-3.5 font-label text-base uppercase tracking-wider text-cosmic-black disabled:cursor-not-allowed disabled:opacity-60";
const secondary =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-warm-ivory/40 py-3.5 font-label text-base uppercase tracking-wider text-warm-ivory transition hover:border-solar-copper hover:text-solar-copper disabled:cursor-not-allowed disabled:opacity-60";

const SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? (process.env.NODE_ENV !== "production" ? TURNSTILE_TEST_SITE_KEY : undefined);

function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 1000);
  return () => window.clearInterval(id);
}
const getSeconds = () => Math.floor(Date.now() / 1000);
const getServerSeconds = () => null;

type Saved = Record<string, string>;
type PayStep = "idle" | "verifying" | "checking" | "ready" | "confirming" | "paid" | "refund" | "error";

function Hold({
  order,
  email,
  onModify,
  onRestart,
}: {
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
          onFailed: () => fail("failed"),
        },
      );
    } catch {
      fail("unavailable");
    }
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
      if (data.status === "paid") setStep("paid");
      else if (data.status === "refund_needed") setStep("refund");
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
      <div className="rounded-card bg-deep-indigo p-6 md:p-8">
        <h2 className="font-title text-3xl">{t(paid ? "paidTitle" : "refundTitle")}</h2>
        <p className="mt-3 text-warm-ivory/80">
          {paid ? t("paidText", { count: order.quantity, email }) : t("refundText")}
        </p>
        <p className="mt-6 text-sm text-warm-ivory/60">
          {t("reference")} <span className="font-label tracking-widest text-warm-ivory">{order.orderId.slice(0, 8).toUpperCase()}</span>
        </p>
      </div>
    );
  }

  if (left === 0) {
    return (
      <div className="rounded-card bg-deep-indigo p-6 md:p-8">
        <h2 className="font-title text-3xl">{t("expiredTitle")}</h2>
        <p className="mt-3 text-warm-ivory/80">{t("expiredText")}</p>
        <button type="button" onClick={onRestart} className={`${primary} mt-6 w-full sm:w-48`}>
          {t("restart")}
        </button>
      </div>
    );
  }

  const clock = left === null ? "--:--" : `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  const busy = step === "verifying" || step === "checking" || step === "confirming" || modifying;

  return (
    <div className="rounded-card bg-deep-indigo p-6 md:p-8">
      <h2 className="font-title text-3xl">{t("held")}</h2>
      <p className="mt-3 text-warm-ivory/80">
        {t("heldFor")} <span className="font-label text-xl tabular-nums text-solar-copper">{clock}</span>
      </p>
      <p className="mt-1 text-sm text-warm-ivory/60">{email}</p>

      <dl className="mt-6 space-y-2 rounded-2xl bg-cosmic-black p-5">
        <div className="flex justify-between gap-4">
          <dt className="text-warm-ivory/70">
            {order.quantity} × {formatXof(order.unitPriceXof, locale)}
          </dt>
          <dd>{formatXof(order.subtotalXof, locale)}</dd>
        </div>
        {order.discountXof > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-warm-ivory/70">
              {order.autoDiscountPct > 0 ? t("groupDiscountLine", { pct: order.autoDiscountPct }) : t("discount")}
            </dt>
            <dd>− {formatXof(order.discountXof, locale)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4 border-t border-warm-ivory/15 pt-3">
          <dt className="font-label text-sm uppercase tracking-widest">{t("total")}</dt>
          <dd className="font-label text-2xl text-solar-copper">{formatXof(order.totalXof, locale)}</dd>
        </div>
      </dl>

      {step === "verifying" && (
        <div className="mt-6">
          <p className="font-label text-sm uppercase tracking-widest text-warm-ivory/80">{t("verifyTitle")}</p>
          <p className="mb-3 mt-1 text-sm text-warm-ivory/70">{t("verifyText")}</p>
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
            <p className="text-solar-copper">{t("payErrors.unavailable")}</p>
          )}
        </div>
      )}
      {step === "checking" && <p className="mt-6 text-warm-ivory/80">{t("checking")}</p>}
      {step === "confirming" && <p className="mt-6 text-warm-ivory/80">{t("confirming")}</p>}
      {step === "ready" && <p className="mt-6 rounded-2xl bg-cosmic-black px-4 py-3 text-warm-ivory/90">{t("payWaiting")}</p>}
      {step === "error" && payError && (
        <p role="alert" className="mt-6 rounded-2xl bg-solar-copper/15 px-4 py-3 text-solar-copper">
          {t(`payErrors.${payError}`)}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setPayError(null);
            if (payment) void pay(payment);
            else setStep("verifying");
          }}
          className={`${primary} w-full sm:w-72`}
        >
          {t("pay", { amount: formatXof(order.totalXof, locale) })}
        </button>
        <button type="button" disabled={step === "checking" || step === "confirming" || modifying} onClick={modify} className={`${secondary} w-full sm:w-64`}>
          {modifying ? t("modifying") : t("modify")}
        </button>
      </div>
      <p className="mt-4 max-w-md text-sm text-warm-ivory/60">{t("modifyHint")}</p>
      <p className="mt-1 max-w-md text-sm text-warm-ivory/60">{t("payHint")}</p>
    </div>
  );
}

type CheckoutErrors = { antibot: true; not_payable: true; unavailable: true; failed: true; not_confirmed: true };

export function TicketForm({ slug, tiers, sample }: { slug: string; tiers: Tier[]; sample: boolean }) {
  const t = useTranslations("Ticketing");
  const locale = useLocale();
  const [response, setResponse] = useState<ReserveResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [restarted, setRestarted] = useState(0);
  const [saved, setSaved] = useState<Saved>({});
  const [tierId, setTierId] = useState(tiers.find((x) => x.onSale)?.id ?? "");
  const [quantity, setQuantity] = useState(1);

  const tier = tiers.find((x) => x.id === tierId && x.onSale);
  const anyOnSale = tiers.some((x) => x.onSale);
  const max = Math.max(1, Math.min(MAX_PER_ORDER, tier?.remaining ?? 1));
  const qty = Math.min(quantity, max);
  const error = response?.status === "error" ? response : null;
  const errors = error?.fieldErrors;
  const countryNames = new Intl.DisplayNames([locale], { type: "region" });
  const dateFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" });

  const subtotal = (tier?.priceXof ?? 0) * qty;
  const pct = tier ? groupDiscountPercent(tier.kind, qty) : 0;
  const discount = Math.floor((subtotal * pct) / 100);
  const earlySelected = tier?.kind === "early_bird";

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
    <form key={restarted} onSubmit={onSubmit} className="rounded-card bg-deep-indigo p-6 md:p-8" noValidate>
      {sample && <p className="mb-6 rounded-2xl bg-solar-copper/15 px-4 py-3 text-sm text-solar-copper">{t("sampleNotice")}</p>}

      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="ticketTypeId" value={tier?.id ?? ""} />
      <input type="hidden" name="quantity" value={qty} />

      <fieldset>
        <legend className={label}>{t("tier")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {tiers.map((x) => {
            const selected = x.id === tier?.id;
            const note =
              x.state === "upcoming" && x.salesStart
                ? t("availableFrom", { date: dateFmt.format(new Date(x.salesStart)) })
                : x.state === "sold_out"
                  ? t("soldOutTier")
                  : x.state === "closed"
                    ? t("closedTier")
                    : t("tierRemaining", { count: x.remaining });
            return (
              <label
                key={x.id}
                aria-disabled={!x.onSale}
                className={`flex items-center justify-between gap-4 rounded-2xl px-5 py-4 ring-1 transition ${
                  x.onSale
                    ? selected
                      ? "cursor-pointer bg-cosmic-black ring-2 ring-solar-copper"
                      : "cursor-pointer bg-cosmic-black ring-warm-ivory/25 hover:ring-ultraviolet"
                    : "cursor-not-allowed bg-cosmic-black/40 opacity-50 ring-transparent grayscale"
                }`}
              >
                <span>
                  <input
                    type="radio"
                    name="tierChoice"
                    value={x.id}
                    checked={selected}
                    disabled={!x.onSale}
                    onChange={() => setTierId(x.id)}
                    className="sr-only"
                  />
                  <span className="block font-title text-xl">{t(`tierKinds.${x.kind}`)}</span>
                  <span className="block text-sm text-warm-ivory/70">{note}</span>
                </span>
                <span className="font-label text-2xl text-solar-copper">{formatXof(x.priceXof, locale)}</span>
              </label>
            );
          })}
        </div>
        {earlySelected && <p className="mt-3 px-2 text-sm text-warm-ivory/70">{t("earlyNoPromo")}</p>}
      </fieldset>

      {!anyOnSale ? (
        <p className="mt-8 rounded-2xl bg-cosmic-black px-5 py-4 text-warm-ivory/80">{t("noneOnSale")}</p>
      ) : (
        <>
          <div className="mt-8">
            <span className={label}>{t("quantity")}</span>
            <div className="inline-flex items-center gap-4 rounded-full bg-cosmic-black p-1.5 ring-1 ring-warm-ivory/25">
              <button
                type="button"
                aria-label={t("decrease")}
                onClick={() => setQuantity((q) => Math.max(1, Math.min(q, max) - 1))}
                disabled={qty <= 1}
                className="grid size-11 place-items-center rounded-full bg-deep-indigo text-2xl disabled:opacity-40"
              >
                −
              </button>
              <span className="w-8 text-center font-label text-2xl tabular-nums" aria-live="polite">
                {qty}
              </span>
              <button
                type="button"
                aria-label={t("increase")}
                onClick={() => setQuantity((q) => Math.min(max, Math.min(q, max) + 1))}
                disabled={qty >= max}
                className="grid size-11 place-items-center rounded-full bg-deep-indigo text-2xl disabled:opacity-40"
              >
                +
              </button>
            </div>
            <p className="mt-3 max-w-lg px-2 text-sm text-warm-ivory/70">{t("groupHint")}</p>
          </div>

          <h2 className="mt-10 font-title text-2xl">{t("you")}</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="name" className={label}>{t("name")}</label>
              <input id="name" name="name" autoComplete="name" defaultValue={saved.name} className={input} aria-invalid={errors?.name} required />
            </div>
            <div>
              <label htmlFor="email" className={label}>{t("email")}</label>
              <input id="email" name="email" type="email" autoComplete="email" defaultValue={saved.email} className={input} aria-invalid={errors?.email} required />
            </div>
            <div>
              <label htmlFor="whatsapp" className={label}>{t("whatsapp")}</label>
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
              <p id="whatsapp-hint" className="mt-2 px-2 text-xs text-warm-ivory/60">{t("whatsappHint")}</p>
            </div>
            <div>
              <label htmlFor="country" className={label}>{t("country")}</label>
              <select id="country" name="country" defaultValue={saved.country ?? "TG"} className={`${input} appearance-none`} aria-invalid={errors?.country}>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c === "OTHER" ? t("countryOther") : countryNames.of(c)}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="promo" className={label}>{t("promo")}</label>
              <input
                id="promo"
                name="promo"
                autoCapitalize="characters"
                defaultValue={saved.promo}
                disabled={earlySelected}
                placeholder={earlySelected ? t("promoEarly") : undefined}
                className={`${input} uppercase md:max-w-xs`}
                aria-invalid={errors?.promo}
              />
            </div>
          </div>

          <label className="mt-8 flex items-start gap-3">
            <input type="checkbox" name="terms" defaultChecked={saved.terms === "on"} className="mt-1 size-5 accent-solar-copper" aria-invalid={errors?.terms} />
            <span className={errors?.terms ? "text-solar-copper" : "text-warm-ivory/80"}>
              {t.rich("terms", {
                link: (chunks) => (
                  <Link href="/cgv" target="_blank" className="underline underline-offset-4 hover:text-solar-copper">
                    {chunks}
                  </Link>
                ),
              })}
            </span>
          </label>

          {error && (
            <p role="alert" className="mt-6 rounded-2xl bg-solar-copper/15 px-4 py-3 text-solar-copper">
              {error.code ? t(`errors.${error.code}`, { count: error.remaining ?? 0 }) : t("errors.form")}
            </p>
          )}

          <div className="mt-8 flex flex-col gap-4 border-t border-warm-ivory/15 pt-6 md:flex-row md:items-end md:justify-between">
            <dl className="space-y-1">
              {discount > 0 && (
                <>
                  <div className="flex gap-3 text-warm-ivory/70">
                    <dt>{t("subtotal")}</dt>
                    <dd>{formatXof(subtotal, locale)}</dd>
                  </div>
                  <div className="flex gap-3 text-solar-copper">
                    <dt>{t("groupDiscountLine", { pct })}</dt>
                    <dd>− {formatXof(discount, locale)}</dd>
                  </div>
                </>
              )}
              <div className="flex items-baseline gap-3">
                <dt className="font-label text-sm uppercase tracking-widest text-warm-ivory/80">{t("total")}</dt>
                <dd className="font-label text-3xl text-solar-copper">{formatXof(subtotal - discount, locale)}</dd>
              </div>
            </dl>
            <button type="submit" disabled={pending || !tier} className={`${primary} w-full md:w-64`}>
              {pending ? t("submitting") : t("submit")}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
