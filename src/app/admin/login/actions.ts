"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminConfigured, createSessionValue, roleForPassword, SESSION_COOKIE, sessionCookieOptions } from "@/lib/admin/session";
import { guardLogin, loginFailed, loginSucceeded } from "@/lib/security/login-guard";
import { LIMITS } from "@/lib/security/rate-limit";

/** `attempt` change à chaque réponse : le formulaire remonte un widget Turnstile neuf (un jeton ne sert qu'une fois) */
export type LoginState = { error?: string; attempt?: number };

export async function login(prev: LoginState, form: FormData): Promise<LoginState> {
  const attempt = (prev.attempt ?? 0) + 1;
  if (!isAdminConfigured()) return { error: "Accès non configuré (ADMIN_PASSWORD, STAFF_PASSWORD et TICKET_SIGNING_SECRET).", attempt };
  const guard = await guardLogin(LIMITS.adminLogin, form);
  if (!guard.ok) return { error: guard.error, attempt };

  const password = String(form.get("password") ?? "").slice(0, 256);
  const role = password ? roleForPassword(password) : null;
  const value = role && createSessionValue(role);
  if (!role || !value) {
    await loginFailed(LIMITS.adminLogin, guard.ip);
    return { error: "Mot de passe incorrect.", attempt };
  }

  await loginSucceeded(LIMITS.adminLogin, guard.ip);
  (await cookies()).set(SESSION_COOKIE, value, sessionCookieOptions);
  redirect(role === "admin" ? "/admin" : "/admin/scan");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}
