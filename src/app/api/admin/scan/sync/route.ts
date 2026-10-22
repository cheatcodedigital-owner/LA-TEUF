import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { hasRole } from "@/lib/admin/session";
import { getAdminClient, isSupabaseConfigured } from "@/lib/ticketing/supabase";
import { verifyTicketToken } from "@/lib/ticketing/ticket-token";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

const bodySchema = z.object({
  eventId: z.uuid(),
  device: z.string().trim().max(40).default(""),
  scans: z.array(z.object({ token: z.string().max(200), at: z.iso.datetime() })).min(1).max(500),
});

type ScanResult = "ok" | "already_used" | "invalid" | "wrong_event" | "cancelled" | "expired";

// Valide les billets : un scan en ligne (1 élément, heure = maintenant) ou la synchronisation d'une file de
// scans faits hors ligne. Le contrôle fait foi ici : signature du QR, puis `scan_ticket_at` (usage unique atomique).
export async function POST(request: NextRequest) {
  if (!hasRole(request, "staff")) return json({ error: "unauthorized" }, 401);
  const secret = process.env.TICKET_SIGNING_SECRET;
  if (!isSupabaseConfigured() || !secret) return json({ error: "unavailable" }, 503);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "bad_request" }, 400);
  const { eventId, device, scans } = parsed.data;
  const db = getAdminClient();

  const results: {
    token: string;
    at: string;
    result: ScanResult;
    scannedAt?: string | null;
    scannedDevice?: string | null;
    name?: string;
    kind?: string;
  }[] = [];
  const ticketIds = new Map<string, string>(); // token → id du billet
  for (const scan of scans) {
    const parsedToken = verifyTicketToken(scan.token, secret);
    if (!parsedToken) {
      results.push({ token: scan.token, at: scan.at, result: "invalid" });
      continue;
    }
    ticketIds.set(scan.token, parsedToken.ticketId);
    const { data, error } = await db.rpc("scan_ticket_at", {
      p_ticket_id: parsedToken.ticketId,
      p_nonce: parsedToken.nonce,
      p_event_id: eventId,
      p_at: scan.at,
      p_device: device || null,
    });
    // Erreur technique (base injoignable, id mal formé) : on s'arrête, le client garde le reste en file
    if (error) {
      if (error.code === "22P02") {
        results.push({ token: scan.token, at: scan.at, result: "invalid" });
        continue;
      }
      return json({ error: "unavailable", results }, 503);
    }
    const r = data as { result: ScanResult; scannedAt?: string | null; scannedDevice?: string | null };
    results.push({ token: scan.token, at: scan.at, result: r.result, scannedAt: r.scannedAt, scannedDevice: r.scannedDevice });
  }

  // Nom et palier pour l'écran de l'agent (sans effet sur la validation)
  const ids = [...new Set(ticketIds.values())];
  if (ids.length) {
    const { data } = await db.from("tickets").select("id, orders(buyer_name), ticket_types(kind)").in("id", ids);
    const info = new Map(
      ((data ?? []) as unknown as { id: string; orders: { buyer_name: string } | null; ticket_types: { kind: string } | null }[]).map((t) => [
        t.id,
        { name: t.orders?.buyer_name, kind: t.ticket_types?.kind },
      ]),
    );
    for (const r of results) Object.assign(r, info.get(ticketIds.get(r.token) ?? ""));
  }

  return json({ results });
}
