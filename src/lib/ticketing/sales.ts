import "server-only";
import { after } from "next/server";
import { events as sampleEvents } from "@/data/events";
import { HOLD_MINUTES, MAX_ACTIVE_HOLDS, MAX_PER_ORDER, TABLE_SEATS } from "./config";
import { getKkiapayConfig, verifyTransaction } from "./kkiapay";
import { cancelCheckoutSession, createCheckoutSession, getCheckoutSessionStatus, getSaspayConfig, verifyPayment } from "./saspay";
import { getAdminClient, isSupabaseConfigured } from "./supabase";
import { sendTicketsEmail } from "./ticket-email";
import type { ReservationInput } from "./schema";
import type {
  ConfirmResponse,
  EventSales,
  OrderStatusResponse,
  PaymentConfig,
  PaymentProvider,
  ReserveErrorCode,
  ReserveResult,
  SalesResult,
  Tier,
} from "./types";

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

// Fermeture côté site : une soirée « bientot » dans src/data/events.ts reste fermée même si la base la dit en vente
// (garde-fou tant que la migration de fermeture n'est pas appliquée). La base reste seule juge pour ouvrir.
const closedOnSite = (slug: string) => sampleEvents.find((x) => x.slug === slug)?.status === "bientot";

const DAY = 86_400_000;

// Horloge de la démo : TICKETING_SAMPLE_NOW (ISO) permet de simuler une date, pour tester les phases de vente
const sampleNow = () => (process.env.TICKETING_SAMPLE_NOW ? new Date(process.env.TICKETING_SAMPLE_NOW).getTime() : Date.now());

function sampleSales(slug: string): EventSales | null {
  const e = sampleEvents.find((x) => x.slug === slug);
  if (!e) return null;

  // Mêmes règles que le seed : ventes dès le 9 novembre (J-11) ; early bird jusqu'à épuisement ou la veille à minuit ;
  // standard à la porte uniquement (jamais en ligne) ; tables jusqu'à l'événement (100 000 dès le 18 novembre, J-2).
  const start = new Date(e.startsAt);
  const dayJ = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const now = sampleNow();
  const make = (id: string, kind: Tier["kind"], priceXof: number, quota: number, from: number, to: number, extra: Partial<Tier> = {}): Tier => {
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
      seats: 1,
      ...extra,
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
      // ⚠️ Prix d'exemple, visibles uniquement en développement sans Supabase (early bird 5000 ×70, standard 8000 ×30, 4 tables à 80000)
      make("00000000-0000-4000-8000-000000000001", "early_bird", 5000, 70, dayJ - 11 * DAY, dayJ),
      {
        ...make("00000000-0000-4000-8000-000000000002", "standard", 8000, 30, dayJ, dayJ),
        state: "door",
        remaining: 0,
        onSale: false,
        salesStart: null,
        salesEnd: null,
      },
      make(
        "00000000-0000-4000-8000-000000000003",
        "table",
        now >= dayJ - 2 * DAY ? 100000 : 80000,
        4,
        dayJ - 11 * DAY,
        start.getTime(),
        {
          seats: TABLE_SEATS,
          nextPriceXof: now < dayJ - 2 * DAY ? 100000 : null,
          nextPriceAt: now < dayJ - 2 * DAY ? new Date(dayJ - 2 * DAY).toISOString() : null,
        },
      ),
    ],
  };
}

/** Vrai si le tarif est un salon (table), vendu hors ligne */
async function isTableType(ticketTypeId: string): Promise<boolean> {
  if (sampleMode()) return ticketTypeId === "00000000-0000-4000-8000-000000000003";
  if (!isSupabaseConfigured()) return false;
  const { data } = await getAdminClient().from("ticket_types").select("kind").eq("id", ticketTypeId).maybeSingle();
  return data?.kind === "table";
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
  if (!data) return { kind: "not_found" };
  const sales = data as EventSales;
  if (closedOnSite(slug) && sales.event.status === "on_sale") sales.event.status = "soon";
  return { kind: "ok", sales, sample: false };
}

/** `affiliateRef` : valeur du cookie d'attribution (`slug` ou `slug:campagne`), déjà posé par /r/<slug>. */
export async function reserve(input: ReservationInput, affiliateRef?: string | null): Promise<ReserveResult> {
  if (closedOnSite(input.slug)) return { ok: false, code: "sales_closed" };
  // Salons : réservation sur WhatsApp uniquement, jamais en ligne (le formulaire n'envoie plus de table)
  if (await isTableType(input.ticketTypeId)) return { ok: false, code: "type_unavailable" };
  if (sampleMode()) {
    const sales = sampleSales(input.slug);
    const tier = sales?.tiers.find((t) => t.id === input.ticketTypeId && t.onSale);
    if (!sales || !tier) return { ok: false, code: "type_unavailable" };
    // Démo : aucun code promo n'existe ; ils ne s'appliquent de toute façon qu'à l'early bird
    if (input.promo) return { ok: false, code: tier.kind === "early_bird" ? "invalid_promo" : "promo_not_allowed" };
    const subtotal = tier.priceXof * input.quantity;
    return {
      ok: true,
      sample: true,
      order: {
        orderId: `sample-${Date.now()}`,
        expiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString(),
        quantity: input.quantity,
        unitPriceXof: tier.priceXof,
        subtotalXof: subtotal,
        discountXof: 0,
        totalXof: subtotal,
        autoDiscountPct: 0,
        promoApplied: false,
        seats: tier.seats,
      },
    };
  }
  if (!isSupabaseConfigured()) return { ok: false, code: "unavailable" };

  // Réservations actives plafonnées par e-mail ou numéro WhatsApp (2 : une page rechargée ne bloque pas l'acheteur) :
  // on ne bloque pas des places en série sans payer.
  // (« Modifier » annule la réservation en cours avant d'en refaire une.) Sans la migration 0017, le contrôle est sauté.
  const { data: holds, error: holdsError } = await getAdminClient().rpc("active_holds", {
    p_email: input.email,
    p_whatsapp: input.whatsapp,
  });
  if (holdsError) console.error("[ticketing] active_holds", holdsError.message);
  else if (typeof holds === "number" && holds >= MAX_ACTIVE_HOLDS) return { ok: false, code: "pending_exists" };

  const { data, error } = await getAdminClient().rpc("create_order", {
    p_event_slug: input.slug,
    p_ticket_type_id: input.ticketTypeId,
    p_quantity: input.quantity,
    p_name: input.name,
    p_email: input.email,
    p_whatsapp: input.whatsapp,
    p_country: input.country,
    p_promo: input.promo ?? null,
    p_affiliate: affiliateRef ?? null,
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
  // Session SasPay ouverte : on la ferme pour que l'acheteur ne paie pas une commande abandonnée. Au mieux : si le
  // paiement passe quand même, `mark_order_paid` émet les billets s'il reste de la place, sinon `refund_needed`.
  const { data: open } = await getAdminClient()
    .from("orders")
    .select("saspay_session_id")
    .eq("id", orderId)
    .is("saspay_transaction_id", null)
    .maybeSingle();
  if (open?.saspay_session_id) await cancelCheckoutSession(open.saspay_session_id);
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

/**
 * Prestataire actif : PAYMENT_PROVIDER=saspay, sinon Kkiapay (valeur par défaut, comportement historique).
 * Changer la variable sur Vercel demande un « Redeploy » (sans changement de code). Les deux webhooks restent actifs :
 * un paiement commencé avant la bascule est toujours rapproché.
 */
export function getPaymentProvider(): PaymentProvider {
  return process.env.PAYMENT_PROVIDER?.trim().toLowerCase() === "saspay" ? "saspay" : "kkiapay";
}

/** Mode de paiement : démo sans Supabase en développement, sinon widget Kkiapay (clés requises) */
export function getPaymentConfig(): PaymentConfig | null {
  if (sampleMode()) return { mode: "sample" };
  const config = getKkiapayConfig();
  return config ? { mode: "kkiapay", publicKey: config.publicKey, sandbox: config.sandbox } : null;
}

type SaspayOrderRow = {
  id: string;
  status: string;
  expires_at: string | null;
  total_xof: number;
  quantity: number;
  buyer_name: string;
  buyer_email: string;
  saspay_session_id: string | null;
  saspay_checkout_url: string | null;
  events: { slug: string; name: string } | null;
  ticket_types: { seats: number } | null;
};

/**
 * Ouvre (ou rouvre) la page de paiement SasPay d'une commande. Une seule session par commande : un double clic, un
 * second onglet ou un retour arrière réutilisent la session déjà rattachée (`attach_saspay_session`, atomique).
 * `returnUrl(slug)` : page de retour, qui n'affiche qu'un statut (les billets sont émis par le webhook).
 */
export async function startSaspayCheckout(
  orderId: string,
  returnUrl: (slug: string) => string,
): Promise<{ ok: true; payment: PaymentConfig; totalXof: number } | { ok: false; code: "not_payable" | "unavailable" }> {
  if (!isSupabaseConfigured() || !getSaspayConfig()) return { ok: false, code: "unavailable" };
  const db = getAdminClient();
  const { data, error } = await db
    .from("orders")
    .select("id, status, expires_at, total_xof, quantity, buyer_name, buyer_email, saspay_session_id, saspay_checkout_url, events(slug, name), ticket_types(seats)")
    .eq("id", orderId)
    .maybeSingle();
  if (error) {
    console.error("[ticketing] saspay order", error.message);
    return { ok: false, code: "unavailable" };
  }
  const o = data as SaspayOrderRow | null;
  if (!o || o.status !== "pending" || !o.expires_at || new Date(o.expires_at).getTime() <= Date.now()) return { ok: false, code: "not_payable" };
  if (o.saspay_session_id && o.saspay_checkout_url) {
    return { ok: true, totalXof: o.total_xof, payment: { mode: "saspay", checkoutUrl: o.saspay_checkout_url } };
  }

  const event = sampleEvents.find((e) => e.slug === o.events?.slug);
  if (!event || !o.events) return { ok: false, code: "unavailable" };
  const tickets = o.quantity * (o.ticket_types?.seats ?? 1);

  const session = await createCheckoutSession({
    amountXof: o.total_xof,
    country: event.countryCode,
    description: `${o.events.name} · ${tickets} ${tickets > 1 ? "billets" : "billet"}`,
    customerEmail: o.buyer_email,
    customerName: o.buyer_name,
    returnUrl: returnUrl(event.slug),
    expiresAt: o.expires_at,
    metadata: { order_id: o.id, edition: event.slug, tickets },
  });
  if (!session) return { ok: false, code: "unavailable" };

  const { data: attached, error: attachError } = await db.rpc("attach_saspay_session", {
    p_order_id: o.id,
    p_session_id: session.id,
    p_checkout_url: session.checkoutUrl,
  });
  if (attachError || !attached) {
    console.error("[ticketing] attach_saspay_session", attachError?.message);
    await cancelCheckoutSession(session.id);
    return { ok: false, code: "unavailable" };
  }
  if (attached.result === "attached") return { ok: true, totalXof: o.total_xof, payment: { mode: "saspay", checkoutUrl: session.checkoutUrl } };
  // Un appel concurrent a rattaché sa session avant nous : on ferme la nôtre et on renvoie la sienne
  await cancelCheckoutSession(session.id);
  if (attached.result === "existing" && typeof attached.checkoutUrl === "string") {
    return { ok: true, totalXof: o.total_xof, payment: { mode: "saspay", checkoutUrl: attached.checkoutUrl } };
  }
  return { ok: false, code: "not_payable" };
}

export type SaspaySettleResult = "paid" | "refund_needed" | "not_paid" | "not_found" | "rejected" | "unavailable";

/** Émet les billets d'une commande payée par une transaction SasPay déjà vérifiée (SUCCESS). Idempotent. */
async function settleSaspayOrder(orderId: string, transactionId: string, amountXof: number): Promise<SaspaySettleResult> {
  const { data, error } = await getAdminClient().rpc("mark_order_paid", {
    p_order_id: orderId,
    p_transaction_id: transactionId,
    p_amount_xof: amountXof,
    p_provider: "saspay",
  });
  if (error) {
    // amount_mismatch, provider_mismatch, transaction déjà utilisée pour une autre commande… : jamais de billet
    console.error("[ticketing] mark_order_paid (saspay)", error.message);
    return /amount_mismatch|provider_mismatch|order_not_found|duplicate key/.test(error.message) ? "rejected" : "unavailable";
  }
  if (data.status === "paid") {
    // Après la réponse : le webhook répond vite à SasPay (délai de 15 s). Un seul e-mail part (verrou dans sendTicketsEmail),
    // et un webhook rejoué relance l'envoi s'il avait échoué.
    after(() => sendTicketsEmail(orderId).then(() => undefined));
    return "paid";
  }
  if (data.status === "refund_needed") return "refund_needed";
  return "rejected";
}

/**
 * Webhook `transaction.success` : le contenu reçu n'est qu'un signal. La transaction est revérifiée
 * (GET /payments/{id}/verify/ → SUCCESS, XOF), puis rattachée à sa commande par la session de checkout enregistrée sur
 * la commande (le webhook ne transporte ni metadata ni id de session). `unavailable` → 5xx pour que SasPay relance.
 */
export async function confirmSaspayTransaction(transactionId: string): Promise<SaspaySettleResult> {
  if (!isSupabaseConfigured()) return "unavailable";
  const payment = await verifyPayment(transactionId);
  if (!payment) return "unavailable";
  if (payment.status !== "SUCCESS") return "not_paid";
  if (payment.currency !== "XOF" || !Number.isFinite(payment.amountXof)) {
    console.error("[ticketing] saspay : transaction inattendue", { currency: payment.currency });
    return "rejected";
  }

  const db = getAdminClient();
  // Webhook rejoué : la transaction est déjà rattachée à sa commande (aucun nouveau billet, l'e-mail est relancé si besoin)
  const { data: done, error: doneError } = await db.from("orders").select("id").eq("saspay_transaction_id", transactionId).maybeSingle();
  if (doneError) return "unavailable";
  if (done) return settleSaspayOrder(done.id, transactionId, payment.amountXof);

  // Commandes SasPay récentes, du même montant, pas encore rapprochées : laquelle a ouvert la session de cette transaction ?
  const since = new Date(Date.now() - 3 * DAY).toISOString();
  const { data: candidates, error } = await db
    .from("orders")
    .select("id, saspay_session_id")
    .not("saspay_session_id", "is", null)
    .is("saspay_transaction_id", null)
    .eq("total_xof", payment.amountXof)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) return "unavailable";

  let transient = false;
  for (const c of candidates ?? []) {
    const session = await getCheckoutSessionStatus(c.saspay_session_id as string);
    if (!session) {
      transient = true;
      continue;
    }
    if (session.found && session.transactionId === transactionId) return settleSaspayOrder(c.id, transactionId, payment.amountXof);
  }
  if (transient) return "unavailable";
  console.warn("[ticketing] saspay : aucune commande pour cette transaction");
  return "not_found";
}

/** Admin : rapproche une commande SasPay à la main (webhook jamais reçu), par sa session puis la vérification du paiement */
export async function reconcileSaspayOrder(orderId: string): Promise<SaspaySettleResult | "no_session"> {
  if (!isSupabaseConfigured()) return "unavailable";
  const { data, error } = await getAdminClient().from("orders").select("saspay_session_id").eq("id", orderId).maybeSingle();
  if (error) return "unavailable";
  if (!data?.saspay_session_id) return "no_session";
  const session = await getCheckoutSessionStatus(data.saspay_session_id);
  if (!session) return "unavailable";
  if (!session.found || !session.transactionId) return "not_paid";
  const payment = await verifyPayment(session.transactionId);
  if (!payment) return "unavailable";
  if (payment.status !== "SUCCESS") return "not_paid";
  if (payment.currency !== "XOF" || !Number.isFinite(payment.amountXof)) return "rejected";
  return settleSaspayOrder(orderId, session.transactionId, payment.amountXof);
}

/** Page de retour : statut de la commande lu en base. N'émet jamais de billet. */
export async function getOrderStatus(orderId: string): Promise<OrderStatusResponse> {
  if (sampleMode()) return { status: "paid" };
  if (!isSupabaseConfigured()) return { status: "unknown" };
  const { data, error } = await getAdminClient().rpc("order_payable", { p_order_id: orderId });
  if (error || !data) return { status: "unknown" };
  if (data.status === "paid") return { status: "paid" };
  if (data.status === "refund_needed" || data.status === "refunded") return { status: "refund" };
  if (data.status === "not_found") return { status: "unknown" };
  // pending, expired, cancelled : le paiement peut encore être rapproché par le webhook
  return { status: "processing" };
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
