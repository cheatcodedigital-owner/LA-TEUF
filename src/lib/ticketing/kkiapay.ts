import "server-only";
import { timingSafeEqual } from "node:crypto";
import { kkiapay } from "@kkiapay-org/nodejs-sdk";

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
  amountXof: number;
  /** Identifiant que nous avons transmis au widget (= id de la commande), si Kkiapay le renvoie */
  partnerId: string | null;
};

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
    const res = (await api.verify(transactionId)) as { status?: string; amount?: number | string; partnerId?: string | null };
    return {
      success: res?.status === "SUCCESS",
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
