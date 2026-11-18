import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * Client SasPay (checkout hébergé), côté serveur uniquement. Référence : https://docs.saspay.me/llms.txt ;
 * l'OpenAPI (https://docs.saspay.me/api-reference/openapi.json) fait foi. Règles du projet : AGENTS.md.
 * La clé secrète (SASPAY_SECRET_KEY) ne quitte jamais le serveur : ni réponse au navigateur, ni journal.
 */

const LIVE_BASE = "https://api.saspay.me/api/v1";
const SANDBOX_BASE = "https://sandbox-api.saspay.me/api/v1";
/** Écart maximal toléré entre l'horodatage d'un webhook et notre horloge (doc SasPay : 5 minutes) */
export const WEBHOOK_TOLERANCE_SECONDS = 300;

/** Clé secrète et URL de base : une clé sk_test_ va avec la sandbox, une clé sk_live_ avec la production */
export function getSaspayConfig() {
  const secretKey = process.env.SASPAY_SECRET_KEY;
  if (!secretKey) return null;
  return { secretKey, baseUrl: secretKey.startsWith("sk_live_") ? LIVE_BASE : SANDBOX_BASE };
}

type CallResult<T> = { ok: true; data: T } | { ok: false; status: number; code: string | null };

async function call<T>(path: string, init: { method?: "GET" | "POST"; body?: unknown } = {}): Promise<CallResult<T>> {
  const config = getSaspayConfig();
  if (!config) return { ok: false, status: 0, code: "not_configured" };
  try {
    const res = await fetch(`${config.baseUrl}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        Accept: "application/json",
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    // Enveloppe documentée { success, data, code } ; les exemples de l'OpenAPI montrent aussi l'objet nu
    const payload = json && json.success === true && json.data && typeof json.data === "object" ? json.data : json;
    if (!res.ok || !payload || json?.success === false) {
      const error = (json?.error ?? json) as { code?: unknown } | null;
      const code = typeof error?.code === "string" ? error.code : null;
      // 401 clé invalide, 403 scope ou compte, 409 état, 410 expiré, 422 impossible, 429 trop d'appels : jamais de boucle
      console.error("[ticketing] saspay", init.method ?? "GET", path.replace(/[0-9a-f-]{36}/g, ":id"), res.status, code);
      return { ok: false, status: res.status, code };
    }
    return { ok: true, data: payload as T };
  } catch (e) {
    console.error("[ticketing] saspay", path.replace(/[0-9a-f-]{36}/g, ":id"), e instanceof Error ? e.name : "error");
    return { ok: false, status: 0, code: "network" };
  }
}

/** Montant XOF entier → chaîne décimale exigée par SasPay ("5000.00"), jamais un flottant */
export const toDecimal = (xof: number) => `${Math.trunc(xof)}.00`;

/** "5000.00" → 5000 ; NaN si le montant n'est pas un nombre entier de FCFA */
export function fromDecimal(value: unknown): number {
  if (typeof value !== "string" && typeof value !== "number") return Number.NaN;
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value).trim());
  if (!m || (m[2] && Number(m[2]) !== 0)) return Number.NaN;
  return Number(m[1]);
}

export type CheckoutSessionInput = {
  amountXof: number;
  country: "TG" | "BJ";
  description: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  returnUrl: string;
  expiresAt: string;
  metadata: Record<string, string | number>;
};

/** POST /checkout-sessions/ : page de paiement hébergée. `fee_charge_mode: DEDUCTED` : l'acheteur paie le prix affiché. */
export async function createCheckoutSession(input: CheckoutSessionInput) {
  const res = await call<{ id?: unknown; checkout_url?: unknown }>("/checkout-sessions/", {
    method: "POST",
    body: {
      amount: toDecimal(input.amountXof),
      currency: "XOF",
      country: input.country,
      description: input.description,
      customer_email: input.customerEmail,
      customer_name: input.customerName,
      ...(input.customerPhone ? { customer_phone: input.customerPhone } : {}),
      return_url: input.returnUrl,
      expires_at: input.expiresAt,
      metadata: input.metadata,
      fee_charge_mode: "DEDUCTED",
    },
  });
  if (!res.ok) return null;
  const { id, checkout_url } = res.data;
  if (typeof id !== "string" || typeof checkout_url !== "string" || !/^https:\/\//.test(checkout_url)) return null;
  return { id, checkoutUrl: checkout_url };
}

/** POST /checkout-sessions/{id}/cancel/ : `not_pending` si la session est déjà payée (ou terminée) */
export async function cancelCheckoutSession(sessionId: string): Promise<"cancelled" | "not_pending" | "error"> {
  const res = await call(`/checkout-sessions/${encodeURIComponent(sessionId)}/cancel/`, { method: "POST", body: {} });
  if (res.ok) return "cancelled";
  return res.status === 409 ? "not_pending" : "error";
}

/** GET /checkout-sessions/{id}/status/ : relie une session (donc une commande) à sa transaction */
export async function getCheckoutSessionStatus(sessionId: string) {
  const res = await call<{ status?: unknown; transaction_id?: unknown; transaction_status?: unknown }>(
    `/checkout-sessions/${encodeURIComponent(sessionId)}/status/`,
  );
  if (!res.ok) return res.status === 404 ? { found: false as const } : null;
  const d = res.data;
  return {
    found: true as const,
    status: typeof d.status === "string" ? d.status : null,
    transactionId: typeof d.transaction_id === "string" && d.transaction_id ? d.transaction_id : null,
    transactionStatus: typeof d.transaction_status === "string" ? d.transaction_status : null,
  };
}

export type VerifiedPayment = { status: "SUCCESS" | "PENDING" | "FAILED" | "CANCELLED" | "UNKNOWN"; amountXof: number; currency: string | null };

/**
 * GET /payments/{id}/verify/ : seule source de vérité avant d'émettre un billet (SasPay revérifie auprès de l'opérateur).
 * `amountXof` = `requested_amount` (le montant de la commande ; en DEDUCTED, c'est aussi ce que l'acheteur débourse).
 * `null` : vérification impossible (réseau, 5xx, 429) ; `UNKNOWN` : paiement introuvable ou réponse inattendue.
 */
export async function verifyPayment(paymentId: string): Promise<VerifiedPayment | null> {
  const res = await call<{ status?: unknown; requested_amount?: unknown; currency?: unknown }>(
    `/payments/${encodeURIComponent(paymentId)}/verify/`,
  );
  if (!res.ok) {
    if (res.status === 404 || res.status === 403 || res.status === 400) return { status: "UNKNOWN", amountXof: Number.NaN, currency: null };
    return null;
  }
  const s = res.data.status;
  const status = s === "SUCCESS" || s === "PENDING" || s === "FAILED" || s === "CANCELLED" ? s : "UNKNOWN";
  return {
    status,
    amountXof: fromDecimal(res.data.requested_amount),
    currency: typeof res.data.currency === "string" ? res.data.currency : null,
  };
}

/**
 * Signature d'un webhook : HMAC SHA-256 (hex minuscule) de `${timestamp}.${corps brut}` avec SASPAY_WEBHOOK_SECRET,
 * horodatage à ±5 minutes, comparaison en temps constant. Le corps doit être le texte reçu, jamais re-sérialisé.
 */
export function isValidWebhookSignature(rawBody: string, signature: string | null, timestamp: string | null, nowMs = Date.now()) {
  const secret = process.env.SASPAY_WEBHOOK_SECRET;
  if (!secret || !signature || !timestamp || !/^\d{1,12}$/.test(timestamp)) return false;
  if (Math.abs(Math.floor(nowMs / 1000) - Number(timestamp)) > WEBHOOK_TOLERANCE_SECONDS) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(signature.trim().toLowerCase());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
