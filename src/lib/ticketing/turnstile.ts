import "server-only";
import { TURNSTILE_TEST_SECRET_KEY } from "./config";

/** Vérifie le jeton Turnstile côté serveur. `unavailable` si aucune clé n'est configurée en production. */
export async function verifyTurnstile(token: string, ip?: string | null): Promise<"ok" | "failed" | "unavailable"> {
  const secret =
    process.env.TURNSTILE_SECRET_KEY ?? (process.env.NODE_ENV !== "production" ? TURNSTILE_TEST_SECRET_KEY : undefined);
  if (!secret) return "unavailable";

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const data = (await res.json()) as { success?: boolean };
    return data.success ? "ok" : "failed";
  } catch (e) {
    console.error("[ticketing] turnstile", e);
    return "unavailable";
  }
}
