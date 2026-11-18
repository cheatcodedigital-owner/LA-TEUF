import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { getAdminClient, isSupabaseConfigured } from "@/lib/ticketing/supabase";

/*
 * Limites de débit partagées entre toutes les instances (Vercel) : les compteurs vivent en base (migration 0017,
 * `rate_limit_hit` / `rate_limit_count` / `rate_limit_clear`). Les clés ne contiennent jamais d'IP ni d'e-mail en clair :
 * seulement `scope:empreinte HMAC`.
 * Repli en mémoire (par instance) si Supabase n'est pas configuré ou si la migration n'est pas encore appliquée :
 * la protection baisse, le site continue de fonctionner.
 */

export type Limit = { scope: string; max: number; windowSeconds: number };

export const LIMITS = {
  /** Connexion /admin : échecs par IP */
  adminLogin: { scope: "admin-login", max: 8, windowSeconds: 600 },
  /** Connexion /influenceur : échecs par IP */
  affiliateLogin: { scope: "aff-login", max: 8, windowSeconds: 600 },
  /** Réservations par IP (large : plusieurs acheteurs partagent souvent l'IP d'un opérateur mobile) */
  reserve: { scope: "reserve", max: 20, windowSeconds: 600 },
  /** Messages du formulaire de contact par IP */
  contact: { scope: "contact", max: 5, windowSeconds: 3600 },
} satisfies Record<string, Limit>;

const memory = new Map<string, { hits: number; resetAt: number }>();

function fingerprint(limit: Limit, id: string) {
  const salt = process.env.ADMIN_SESSION_SECRET || process.env.TICKET_SIGNING_SECRET || "la-teuf-rate-limit";
  return `${limit.scope}:${createHmac("sha256", salt).update(id).digest("base64url").slice(0, 32)}`;
}

function memoryCount(key: string, limit: Limit, add: boolean) {
  const now = Date.now();
  let entry = memory.get(key);
  if (!entry || entry.resetAt < now) entry = { hits: 0, resetAt: now + limit.windowSeconds * 1000 };
  if (add) entry.hits++;
  memory.set(key, entry);
  return entry.hits;
}

async function rpcCount(fn: "rate_limit_hit" | "rate_limit_count", key: string, limit: Limit): Promise<number | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await getAdminClient().rpc(fn, { p_key: key, p_window_seconds: limit.windowSeconds });
  if (error || typeof data !== "number") {
    console.error("[rate-limit]", fn, error?.message ?? "réponse inattendue");
    return null;
  }
  return data;
}

/** Compte une tentative ; vrai si la limite est dépassée (la tentative en cours comprise). */
export async function hitLimit(limit: Limit, id: string): Promise<boolean> {
  const key = fingerprint(limit, id);
  const hits = (await rpcCount("rate_limit_hit", key, limit)) ?? memoryCount(key, limit, true);
  return hits > limit.max;
}

/** Vrai si la limite est déjà atteinte, sans compter de tentative (connexions : on ne compte que les échecs). */
export async function isLimited(limit: Limit, id: string): Promise<boolean> {
  const key = fingerprint(limit, id);
  const hits = (await rpcCount("rate_limit_count", key, limit)) ?? memoryCount(key, limit, false);
  return hits >= limit.max;
}

/** Remet le compteur à zéro (connexion réussie). */
export async function clearLimit(limit: Limit, id: string): Promise<void> {
  const key = fingerprint(limit, id);
  memory.delete(key);
  if (!isSupabaseConfigured()) return;
  const { error } = await getAdminClient().rpc("rate_limit_clear", { p_key: key });
  if (error) console.error("[rate-limit] rate_limit_clear", error.message);
}

/** IP du visiteur. Sur Vercel, `x-forwarded-for` est réécrit par la plateforme : le client ne peut pas l'imposer. */
export function clientIp(source: Headers): string {
  return source.get("x-forwarded-for")?.split(",")[0]?.trim() || source.get("x-real-ip") || "local";
}

/** Même chose depuis une Server Action */
export async function actionIp(): Promise<string> {
  return clientIp(await headers());
}
