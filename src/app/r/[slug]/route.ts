import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient, isSupabaseConfigured } from "@/lib/ticketing/supabase";

// Lien d'affiliation : /r/<slug>[?c=<campagne>]. Compte le clic, pose un cookie d'attribution de 30 jours
// (dernier clic gagnant) et redirige vers la page de billetterie de l'événement.
const REF_COOKIE = "teuf_ref";
const VISITOR_COOKIE = "teuf_vid";
const THIRTY_DAYS = 30 * 24 * 3600;
const DEDUPE_MS = 30 * 60_000;

// Robots d'aperçu de lien (WhatsApp, Facebook, Telegram…) et crawlers : redirigés mais jamais comptés
const BOT = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|curl|wget|headless|python|java\/|okhttp|go-http/i;

export async function GET(request: NextRequest, { params }: RouteContext<"/r/[slug]">) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.toLowerCase();
  const campaign = (request.nextUrl.searchParams.get("c") ?? "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) || null;
  const redirect = (path: string) => {
    const res = NextResponse.redirect(new URL(path, request.url), 302);
    res.headers.set("Cache-Control", "no-store");
    return res;
  };

  if (!isSupabaseConfigured() || !/^[a-z0-9-]{3,30}$/.test(slug)) return redirect("/");
  const db = getAdminClient();
  const { data: affiliate } = await db.from("affiliates").select("id, active, default_event_slug").eq("slug", slug).maybeSingle();
  if (!affiliate?.active) return redirect("/");

  let eventSlug: string | null = affiliate.default_event_slug;
  if (!eventSlug) {
    const { data } = await db.from("events").select("slug").eq("status", "on_sale").order("starts_at").limit(1).maybeSingle();
    eventSlug = data?.slug ?? null;
  }
  const res = redirect(eventSlug ? `/billetterie/${eventSlug}` : "/");

  const ua = request.headers.get("user-agent") ?? "";
  const prefetch = request.headers.get("sec-purpose")?.includes("prefetch") || request.headers.get("purpose") === "prefetch";
  if (!ua || BOT.test(ua) || prefetch) return res;

  const visitorId = request.cookies.get(VISITOR_COOKIE)?.value || randomUUID();
  const secure = process.env.NODE_ENV === "production";
  const opts = { httpOnly: true, sameSite: "lax" as const, secure, path: "/", maxAge: THIRTY_DAYS };
  res.cookies.set(VISITOR_COOKIE, visitorId, opts);
  res.cookies.set(REF_COOKIE, campaign ? `${slug}:${campaign}` : slug, opts);

  // Un même visiteur qui recharge ou revient en arrière n'est compté qu'une fois par tranche de 30 minutes
  const since = new Date(Date.now() - DEDUPE_MS).toISOString();
  const { data: recent } = await db
    .from("affiliate_clicks")
    .select("id")
    .eq("affiliate_id", affiliate.id)
    .eq("visitor_id", visitorId)
    .gte("created_at", since)
    .limit(1);
  if (!recent?.length) await db.from("affiliate_clicks").insert({ affiliate_id: affiliate.id, campaign, visitor_id: visitorId });

  return res;
}
