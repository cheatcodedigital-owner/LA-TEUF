import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection, type NextRequest } from "next/server";

/**
 * Accès interne : deux mots de passe partagés, posés dans l'environnement.
 *  - `admin` (ADMIN_PASSWORD) : tableau de bord, exports et scan ;
 *  - `staff` (STAFF_PASSWORD) : scan uniquement (équipe à l'entrée).
 * La session est un cookie HttpOnly signé (HMAC), sans état côté serveur.
 */
export type Role = "admin" | "staff";

export const SESSION_COOKIE = "teuf_admin";
const SESSION_SECONDS = 24 * 3600;

const secret = () => {
  const s = process.env.ADMIN_SESSION_SECRET || process.env.TICKET_SIGNING_SECRET;
  return s ? `admin-session:${s}` : null;
};

export const isAdminConfigured = () => Boolean(secret() && (process.env.ADMIN_PASSWORD || process.env.STAFF_PASSWORD));

const sign = (payload: string, key: string) => createHmac("sha256", key).update(payload).digest("base64url");

// Comparaison à temps constant, y compris quand les longueurs diffèrent (on compare des empreintes)
const sameSecret = (a: string, b: string) =>
  timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

/** Rôle correspondant au mot de passe saisi, ou null. Les mots de passe vides ne donnent jamais accès. */
export function roleForPassword(password: string): Role | null {
  const admin = process.env.ADMIN_PASSWORD;
  const staff = process.env.STAFF_PASSWORD;
  if (admin && sameSecret(password, admin)) return "admin";
  if (staff && sameSecret(password, staff)) return "staff";
  return null;
}

export function createSessionValue(role: Role): string | null {
  const key = secret();
  if (!key) return null;
  const payload = `${role}.${Math.floor(Date.now() / 1000) + SESSION_SECONDS}`;
  return `${payload}.${sign(payload, key)}`;
}

export function readSessionValue(value: string | undefined | null): Role | null {
  const key = secret();
  if (!key || !value) return null;
  const [role, exp, signature, ...rest] = value.split(".");
  if (rest.length || !signature || (role !== "admin" && role !== "staff")) return null;
  const expected = Buffer.from(sign(`${role}.${exp}`, key));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  if (!(Number(exp) > Date.now() / 1000)) return null;
  return role;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_SECONDS,
};

const allowed = (role: Role | null, need: Role) => role === "admin" || (role === "staff" && need === "staff");

/** Page serveur : renvoie le rôle, ou redirige vers la connexion. À appeler derrière un <Suspense>. */
export async function requireRole(need: Role): Promise<Role> {
  await connection(); // l'expiration de la session compare à l'heure courante : jamais pré-rendu
  const role = readSessionValue((await cookies()).get(SESSION_COOKIE)?.value);
  if (!allowed(role, need)) redirect(role ? "/admin/scan" : "/admin/login");
  return role!;
}

/** Route API : vrai si la requête porte une session suffisante. */
export function hasRole(request: NextRequest, need: Role): boolean {
  return allowed(readSessionValue(request.cookies.get(SESSION_COOKIE)?.value), need);
}

// Limite de tentatives de connexion (en mémoire : suffit contre l'essai de mots de passe sur une instance)
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60_000;

export function tooManyAttempts(ip: string): boolean {
  const now = Date.now();
  const a = attempts.get(ip);
  if (!a || a.resetAt < now) return false;
  return a.count >= MAX_ATTEMPTS;
}
export function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const a = attempts.get(ip);
  if (!a || a.resetAt < now) attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  else a.count++;
}
export function clearAttempts(ip: string) {
  attempts.delete(ip);
}
