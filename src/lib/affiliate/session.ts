import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";

// Session de l'espace influenceur : cookie HttpOnly signé `idAffilié.expiration.signature`, 7 jours
export const AFFILIATE_COOKIE = "teuf_aff";
const SESSION_SECONDS = 7 * 24 * 3600;

const secret = () => {
  const s = process.env.ADMIN_SESSION_SECRET || process.env.TICKET_SIGNING_SECRET;
  return s ? `affiliate-session:${s}` : null;
};
const sign = (payload: string, key: string) => createHmac("sha256", key).update(payload).digest("base64url");

export function createAffiliateSession(affiliateId: string): string | null {
  const key = secret();
  if (!key) return null;
  const payload = `${affiliateId}.${Math.floor(Date.now() / 1000) + SESSION_SECONDS}`;
  return `${payload}.${sign(payload, key)}`;
}

export function readAffiliateSession(value: string | undefined | null): string | null {
  const key = secret();
  if (!key || !value) return null;
  const [id, exp, signature, ...rest] = value.split(".");
  if (rest.length || !id || !exp || !signature) return null;
  const expected = Buffer.from(sign(`${id}.${exp}`, key));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  return Number(exp) > Date.now() / 1000 ? id : null;
}

export const affiliateCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_SECONDS,
};

/** Page serveur de l'espace influenceur : renvoie l'id de l'affilié connecté, ou redirige vers la connexion. */
export async function requireAffiliate(): Promise<string> {
  await connection();
  const id = readAffiliateSession((await cookies()).get(AFFILIATE_COOKIE)?.value);
  if (!id) redirect("/influenceur/login");
  return id;
}
