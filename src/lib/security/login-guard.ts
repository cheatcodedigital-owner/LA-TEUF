import "server-only";
import { verifyTurnstile } from "@/lib/ticketing/turnstile";
import { actionIp, clearLimit, hitLimit, isLimited, type Limit } from "./rate-limit";

/*
 * Garde commune des connexions /admin et /influenceur : échecs comptés en base par IP (partagés entre instances), puis
 * anti-robot Turnstile. Si Cloudflare est injoignable ou la clé absente (« unavailable »), la connexion reste possible :
 * l'équipe ne doit jamais être bloquée à l'entrée de la soirée, et la limite d'échecs continue de s'appliquer.
 */
export type GuardResult = { ok: true; ip: string } | { ok: false; error: string };

export async function guardLogin(limit: Limit, form: FormData): Promise<GuardResult> {
  const ip = await actionIp();
  if (await isLimited(limit, ip)) return { ok: false, error: "Trop d'essais. Réessaie dans quelques minutes." };

  const token = String(form.get("turnstile") ?? "").slice(0, 4096);
  const antibot = await verifyTurnstile(token, ip); // jeton vide : refusé par Cloudflare (« failed »)
  if (antibot === "unavailable") console.warn("[login] Turnstile indisponible : connexion vérifiée sans anti-robot");
  if (antibot === "failed") {
    await hitLimit(limit, ip);
    return { ok: false, error: "La vérification anti-robot a échoué. Réessaie." };
  }
  return { ok: true, ip };
}

/** Échec de mot de passe : compté pour cette IP */
export const loginFailed = (limit: Limit, ip: string) => hitLimit(limit, ip);
/** Connexion réussie : le compteur de cette IP repart de zéro */
export const loginSucceeded = (limit: Limit, ip: string) => clearLimit(limit, ip);
