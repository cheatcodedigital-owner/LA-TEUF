"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPassword } from "@/lib/affiliate/password";
import { AFFILIATE_COOKIE, affiliateCookieOptions, createAffiliateSession } from "@/lib/affiliate/session";
import { findAffiliateForLogin } from "@/lib/affiliate/stats";
import { guardLogin, loginFailed, loginSucceeded } from "@/lib/security/login-guard";
import { LIMITS } from "@/lib/security/rate-limit";
import { isSupabaseConfigured } from "@/lib/ticketing/supabase";

/** `attempt` change à chaque réponse : le formulaire remonte un widget Turnstile neuf (un jeton ne sert qu'une fois) */
export type LoginState = { error?: string; attempt?: number };

export async function loginAffiliate(prev: LoginState, form: FormData): Promise<LoginState> {
  const attempt = (prev.attempt ?? 0) + 1;
  if (!isSupabaseConfigured()) return { error: "Service indisponible pour le moment.", attempt };
  const guard = await guardLogin(LIMITS.affiliateLogin, form);
  if (!guard.ok) return { error: guard.error, attempt };

  const identifier = String(form.get("identifier") ?? "").trim().slice(0, 40);
  const password = String(form.get("password") ?? "").slice(0, 64);
  const affiliate = identifier ? await findAffiliateForLogin(identifier) : null;
  // Toujours vérifier un hash (faux si l'identifiant est inconnu) : même durée de réponse dans tous les cas
  const ok = await verifyPassword(password, affiliate?.password_hash);
  const value = ok && affiliate?.active ? createAffiliateSession(affiliate.id) : null;
  if (!value) {
    await loginFailed(LIMITS.affiliateLogin, guard.ip);
    return { error: "Identifiant ou mot de passe incorrect.", attempt };
  }

  await loginSucceeded(LIMITS.affiliateLogin, guard.ip);
  (await cookies()).set(AFFILIATE_COOKIE, value, affiliateCookieOptions);
  redirect("/influenceur");
}

export async function logoutAffiliate() {
  (await cookies()).delete(AFFILIATE_COOKIE);
  redirect("/influenceur/login");
}
