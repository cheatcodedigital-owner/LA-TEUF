import "server-only";
import { events as sampleEvents } from "@/data/events";
import { groupDiscountPercent, HOLD_MINUTES, MAX_PER_ORDER } from "./config";
import { getKkiapayConfig, verifyTransaction } from "./kkiapay";
import { getAdminClient, isSupabaseConfigured } from "./supabase";
import { sendTicketsEmail } from "./ticket-email";
import type { ReservationInput } from "./schema";
import type { ConfirmResponse, EventSales, PaymentConfig, ReserveErrorCode, ReserveResult, SalesResult, Tier } from "./types";

const KNOWN_ERRORS: ReserveErrorCode[] = [
  "event_not_found",
  "sales_closed",
  "invalid_quantity",
  "type_unavailable",
  "sold_out",
  "not_enough",
  "invalid_promo",
  "promo_exhausted",
  "promo_not_allowed",
];

// En développement, sans Supabase configuré, on simule une billetterie d'exemple pour pouvoir
// travailler l'interface. En production, l'absence de configuration rend la billetterie indisponible.
const sampleMode = () => !isSupabaseConfigured() && process.env.NODE_ENV !== "production";

const DAY = 86_400_000;

// Horloge de la démo : TICKETING_SAMPLE_NOW (ISO) permet de simuler une date, pour tester les phases de vente
const sampleNow = () => (process.env.TICKETING_SAMPLE_NOW ? new Date(process.env.TICKETING_SAMPLE_NOW).getTime() : Date.now());

function sampleSales(slug: string): EventSales | null {
  const e = sampleEvents.find((x) => x.slug === slug);
  if (!e) return null;

  // Mêmes fenêtres que le seed : early bird de J-21 à J-7, standard de J-7 à l'événement (minuit UTC du jour J)
  const start = new Date(e.startsAt);
  const dayJ = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const now = sampleNow();
  const make = (id: string, kind: Tier["kind"], priceXof: number, quota: number, from: number, to: number): Tier => {
    const state: Tier["state"] = now < from ? "upcoming" : now >= to ? "closed" : "on_sale";
    return {
      id,
      kind,
      priceXof,
      remaining: state === "on_sale" ? quota : 0,
      state,
      onSale: state === "on_sale",
      salesStart: new Date(from).toISOString(),
      salesEnd: new Date(to).toISOString(),
    };
  };

  return {
    event: {
      id: `sample-${e.slug}`,
      slug: e.slug,
      name: e.name,
      venue: e.venue,
      city: e.city,
      country: e.country,
      startsAt: e.startsAt,
      status: e.status === "en-vente" ? "on_sale" : e.status === "termine" ? "ended" : "soon",
      capacity: e.capacity,
    },
    remaining: e.capacity,
    soldOut: false,
    tiers: [
      // ⚠️ Prix d'exemple, visibles uniquement en développement sans Supabase (early bird 3000, standard 5000, quota standard 100)
      make("00000000-0000-4000-8000-000000000001", "early_bird", 3000, 60, dayJ - 21 * DAY, dayJ - 7 * DAY),
      make("00000000-0000-4000-8000-000000000002", "standard", 5000, 100, dayJ - 7 * DAY, start.getTime()),
    ],
  };
}

export async function getEventSales(slug: string): Promise<SalesResult> {
  if (sampleMode()) {
    const sales = sampleSales(slug);
    return sales ? { kind: "ok", sales, sample: true } : { kind: "not_found" };
  }
  if (!isSupabaseConfigured()) return { kind: "unavailable" };

  const { data, error } = await getAdminClient().rpc("event_sales", { p_slug: slug });
  if (error) {
    console.error("[ticketing] event_sales", error.message);
    return { kind: "unavailable" };
  }
  return data ? { kind: "ok", sales: data as EventSales, sample: false } : { kind: "not_found" };
}

export async function reserve(input: ReservationInput): Promise<ReserveResult> {
  if (sampleMode()) {
    const sales = sampleSales(input.slug);
    const tier = sales?.tiers.find((t) => t.id === input.ticketTypeId && t.onSale);
    if (!sales || !tier) return { ok: false, code: "type_unavailable" };
    if (input.promo) return { ok: false, code: tier.kind === "early_bird" ? "promo_not_allowed" : "invalid_promo" };
    const subtotal = tier.priceXof * input.quantity;
    const pct = groupDiscountPercent(tier.kind, input.quantity);
    const discount = Math.floor((subtotal * pct) / 100);
    return {
      ok: true,
      sample: true,
      order: {
        orderId: `sample-${Date.now()}`,
        expiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString(),
        quantity: input.quantity,
        unitPriceXof: tier.priceXof,
        subtotalXof: subtotal,
        discountXof: discount,
        totalXof: subtotal - discount,
        autoDiscountPct: pct,
        promoApplied: false,
      },
    };
  }
  if (!isSupabaseConfigured()) return { ok: false, code: "unavailable" };

  const { data, error } = await getAdminClient().rpc("create_order", {
    p_event_slug: input.slug,
    p_ticket_type_id: input.ticketTypeId,
    p_quantity: input.quantity,
    p_name: input.name,
    p_email: input.email,
    p_whatsapp: input.whatsapp,
    p_country: input.country,
    p_promo: input.promo ?? null,
    p_affiliate: null,
    p_hold_minutes: HOLD_MINUTES,
    p_max_per_order: MAX_PER_ORDER,
  });

  if (error) {
    const code = KNOWN_ERRORS.find((c) => c === error.message);
    if (!code) {
      console.error("[ticketing] create_order", error.message);
      return { ok: false, code: "unknown" };
    }
    const remaining = code === "not_enough" ? Number(error.details) : undefined;
    return { ok: false, code, remaining: Number.isFinite(remaining) ? remaining : undefined };
  }
  return { ok: true, order: data, sample: false };
}

/** Libère les places d'une réservation à la demande de l'acheteur */
export async function cancelOrder(orderId: string, email: string): Promise<boolean> {
  if (sampleMode()) return true;
  if (!isSupabaseConfigured()) return false;
  const { data, error } = await getAdminClient().rpc("cancel_order", { p_order_id: orderId, p_email: email });
  if (error) {
    console.error("[ticketing] cancel_order", error.message);
    return false;
  }
  return data === true;
}

/** La commande est-elle encore payable (réservation active) ? */
export async function getOrderPayable(orderId: string): Promise<{ payable: boolean; totalXof?: number }> {
  if (sampleMode()) return { payable: true };
  if (!isSupabaseConfigured()) return { payable: false };
  const { data, error } = await getAdminClient().rpc("order_payable", { p_order_id: orderId });
  if (error || !data) {
    console.error("[ticketing] order_payable", error?.message);
    return { payable: false };
  }
  return { payable: data.payable === true, totalXof: data.totalXof };
}

/** Mode de paiement : démo sans Supabase en développement, sinon widget Kkiapay (clés requises) */
export function getPaymentConfig(): PaymentConfig | null {
  if (sampleMode()) return { mode: "sample" };
  const config = getKkiapayConfig();
  return config ? { mode: "kkiapay", publicKey: config.publicKey, sandbox: config.sandbox } : null;
}

/**
 * Confirme un paiement : vérifie la transaction auprès de Kkiapay (statut, montant, commande visée),
 * puis émet les billets de façon atomique et idempotente (`mark_order_paid`). Appelée par le navigateur
 * après le widget ET par le webhook : la première qui passe émet, l'autre retombe sur le même résultat.
 */
export async function confirmPayment(orderId: string, transactionId: string): Promise<ConfirmResponse> {
  if (sampleMode()) return { status: "paid", tickets: 0 };
  if (!isSupabaseConfigured()) return { status: "error", code: "unavailable" };

  const tx = await verifyTransaction(transactionId);
  if (!tx) return { status: "error", code: "unavailable" };
  if (tx.failure) return { status: "failed", reason: tx.failure };
  // Une transaction réussie qui vise une autre commande ne peut pas en payer une autre
  if (!tx.success || !Number.isFinite(tx.amountXof) || (tx.partnerId && tx.partnerId !== orderId)) {
    return { status: "error", code: "not_confirmed" };
  }

  const { data, error } = await getAdminClient().rpc("mark_order_paid", {
    p_order_id: orderId,
    p_transaction_id: transactionId,
    p_amount_xof: tx.amountXof,
  });
  if (error) {
    // order_not_found, amount_mismatch, transaction déjà utilisée pour une autre commande…
    console.error("[ticketing] mark_order_paid", error.message);
    return { status: "error", code: "not_confirmed" };
  }
  if (data.status === "paid") {
    // Idempotent : confirmation navigateur et webhook passent ici, un seul e-mail part (voir sendTicketsEmail)
    await sendTicketsEmail(orderId);
    return { status: "paid", tickets: data.ticketIds.length };
  }
  if (data.status === "refund_needed") return { status: "refund_needed" };
  return { status: "error", code: "not_confirmed" };
}
