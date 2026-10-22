import { NextResponse, type NextRequest } from "next/server";
import { getEvents, getScanManifest } from "@/lib/admin/data";
import { hasRole } from "@/lib/admin/session";
import { isSupabaseConfigured } from "@/lib/ticketing/supabase";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Liste des billets d'un événement à embarquer sur l'appareil de scan pour contrôler les entrées sans réseau.
// Ne contient ni nonce ni secret : seulement l'id, la signature du QR, le nom et l'état du billet.
export async function GET(request: NextRequest) {
  if (!hasRole(request, "staff")) return json({ error: "unauthorized" }, 401);
  const secret = process.env.TICKET_SIGNING_SECRET;
  if (!isSupabaseConfigured() || !secret) return json({ error: "unavailable" }, 503);

  const slug = request.nextUrl.searchParams.get("event");
  const events = await getEvents();
  if (!slug) {
    return json({ events: events.filter((e) => e.status !== "ended").map((e) => ({ id: e.id, slug: e.slug, name: e.name, startsAt: e.starts_at })) });
  }
  const event = events.find((e) => e.slug === slug);
  if (!event) return json({ error: "not_found" }, 404);
  return json(await getScanManifest(event, secret));
}
