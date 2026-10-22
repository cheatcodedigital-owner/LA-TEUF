"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  clearAttempts,
  isAdminConfigured,
  createSessionValue,
  recordFailedAttempt,
  roleForPassword,
  SESSION_COOKIE,
  sessionCookieOptions,
  tooManyAttempts,
} from "@/lib/admin/session";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (!isAdminConfigured()) return { error: "Accès non configuré (ADMIN_PASSWORD, STAFF_PASSWORD et TICKET_SIGNING_SECRET)." };
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (tooManyAttempts(ip)) return { error: "Trop d'essais. Réessaie dans quelques minutes." };

  const password = String(form.get("password") ?? "");
  const role = password ? roleForPassword(password) : null;
  const value = role && createSessionValue(role);
  if (!role || !value) {
    recordFailedAttempt(ip);
    return { error: "Mot de passe incorrect." };
  }

  clearAttempts(ip);
  (await cookies()).set(SESSION_COOKIE, value, sessionCookieOptions);
  redirect(role === "admin" ? "/admin" : "/admin/scan");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}
