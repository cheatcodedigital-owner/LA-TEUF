import "server-only";
import { timingSafeEqual } from "node:crypto";
import { kkiapay } from "@kkiapay-org/nodejs-sdk";
import type { PaymentFailure } from "./types";

/** Clés Kkiapay (tableau de bord → Clés API). Seule la clé publique part vers le navigateur. */
export function getKkiapayConfig() {
  const publicKey = process.env.KKIAPAY_PUBLIC_KEY;
  const privateKey = process.env.KKIAPAY_PRIVATE_KEY;
  const secretKey = process.env.KKIAPAY_SECRET_KEY;
  if (!publicKey || !privateKey || !secretKey) return null;
  return { publicKey, privateKey, secretKey, sandbox: process.env.KKIAPAY_SANDBOX !== "false" };
}

export type VerifiedTransaction = {
  success: boolean;
  /** Statut brut Kkiapay (SUCCESS, PENDING, FAILED…) */
  status: string | undefined;
  /** Raison de l'échec quand la transaction est refusée */
  failure: PaymentFailure | null;
  amountXof: number;
  /** Identifiant que nous avons transmis au widget (= id de la commande), si Kkiapay le renvoie */
  partnerId: string | null;
};

/** Déduit la raison d'un échec à partir des champs libres renvoyés par Kkiapay */
function classifyFailure(res: { failureCode?: unknown; failureMessage?: unknown; reason?: unknown }): PaymentFailure {
  const text = [res.failureCode, res.failureMessage, res.reason].filter((v) => typeof v === "string").join(" ").toLowerCase();
  // Valeurs observées dans `reason` en sandbox : processing_error, insufficent_fund (sic), payment_declined
  if (/insuffic|fund|solde|balance/.test(text)) return "insufficient_funds";
  if (/declin|reject|refus|denied|fraud|cancel/.test(text)) return "declined";
  if (/process|error|erreur|timeout|technical/.test(text)) return "processing_error";
  return "unknown";
}

/**
 * Vérification serveur d'une transaction auprès de Kkiapay : on ne fait jamais confiance au navigateur
 * ni au contenu du webhook, seulement à cette réponse. `null` si la vérification est impossible.
 */
export async function verifyTransaction(transactionId: string): Promise<VerifiedTransaction | null> {
  const config = getKkiapayConfig();
  if (!config) return null;
  try {
    const api = kkiapay({
      privatekey: config.privateKey,
      publickey: config.publicKey,
      secretkey: config.secretKey,
      sandbox: config.sandbox,
    });
    type Res = {
      status?: string;
      amount?: number | string;
      partnerId?: string | null;
      failureCode?: unknown;
      failureMessage?: unknown;
      reason?: unknown;
    };
    // Le widget annonce le succès avant que la transaction soit finale : Kkiapay répond d'abord PENDING.
    // On réinterroge quelques secondes ; le webhook reste le filet de sécurité si cela dure plus longtemps.
    let res = (await api.verify(transactionId)) as Res;
    for (let i = 0; i < 6 && res?.status === "PENDING"; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      res = (await api.verify(transactionId)) as Res;
    }
    const failed = Boolean(res?.status) && res.status !== "SUCCESS" && res.status !== "PENDING";
    if (failed) {
      console.info("[ticketing] kkiapay failure", { status: res.status, code: res.failureCode, message: res.failureMessage, reason: res.reason });
    }
    return {
      success: res?.status === "SUCCESS",
      status: res?.status,
      failure: failed ? classifyFailure(res) : null,
      amountXof: Number(res?.amount),
      partnerId: res?.partnerId ? String(res.partnerId) : null,
    };
  } catch (e) {
    console.error("[ticketing] kkiapay verify", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Compare le secret du webhook (en-tête x-kkiapay-secret) avec celui configuré, en temps constant */
export function isValidWebhookSecret(received: string | null) {
  const expected = process.env.KKIAPAY_WEBHOOK_SECRET;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
