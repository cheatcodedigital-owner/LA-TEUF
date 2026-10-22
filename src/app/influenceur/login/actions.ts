"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPassword } from "@/lib/affiliate/password";
import { AFFILIATE_COOKIE, affiliateCookieOptions, createAffiliateSession } from "@/lib/affiliate/session";
import { findAffiliateForLogin } from "@/lib/affiliate/stats";
import { clearAttempts, recordFailedAttempt, tooManyAttempts } from "@/lib/admin/session";
import { isSupabaseConfigured } from "@/lib/ticketing/supabase";

export type LoginState = { error?: string };

export async function loginAffiliate(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (!isSupabaseConfigured()) return { error: "Service indisponible pour le moment." };
  const ip = `aff:${(await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local"}`;
  if (tooManyAttempts(ip)) return { error: "Trop d'essais. Réessaie dans quelques minutes." };

  const identifier = String(form.get("identifier") ?? "").trim().slice(0, 40);
  const password = String(form.get("password") ?? "").slice(0, 64);
  const affiliate = identifier ? await findAffiliateForLogin(identifier) : null;
  // Toujours vérifier un hash (faux si l'identifiant est inconnu) : même durée de réponse dans tous les cas
  const ok = await verifyPassword(password, affiliate?.password_hash);
  const value = ok && affiliate?.active ? createAffiliateSession(affiliate.id) : null;
  if (!value) {
    recordFailedAttempt(ip);
    return { error: "Identifiant ou mot de passe incorrect." };
  }

  clearAttempts(ip);
  (await cookies()).set(AFFILIATE_COOKIE, value, affiliateCookieOptions);
  redirect("/influenceur");
}

export async function logoutAffiliate() {
  (await cookies()).delete(AFFILIATE_COOKIE);
  redirect("/influenceur/login");
}
