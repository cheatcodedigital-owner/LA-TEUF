import { NextResponse, type NextRequest } from "next/server";
import { hasRole } from "@/lib/admin/session";
import { getAdminClient, isSupabaseConfigured } from "@/lib/ticketing/supabase";
import { renderTicketPng, type TicketEvent } from "@/lib/ticketing/ticket-image";
import { signTicketToken } from "@/lib/ticketing/ticket-token";

type Row = { id: string; nonce: string; order_id: string; events: TicketEvent | TicketEvent[] | null };

const text = (body: string, status: number) => new NextResponse(body, { status, headers: { "Cache-Control": "no-store" } });

// Billet habillé de la charte (PNG), pour le renvoyer à un client depuis /admin/achats (WhatsApp, e-mail…).
// Réservé au rôle admin : le QR donne l'entrée à la soirée.
export async function GET(request: NextRequest) {
  if (!hasRole(request, "admin")) return text("Non autorisé", 401);
  const secret = process.env.TICKET_SIGNING_SECRET;
  if (!secret || !isSupabaseConfigured()) return text("Billetterie non configurée", 503);

  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return text("Billet introuvable", 404);

  const db = getAdminClient();
  const { data: ticket } = await db
    .from("tickets")
    .select("id, nonce, order_id, events(name, venue, city, country, starts_at)")
    .eq("id", id)
    .maybeSingle<Row>();
  const event = Array.isArray(ticket?.events) ? ticket.events[0] : ticket?.events;
  if (!ticket || !event) return text("Billet introuvable", 404);

  const { data: siblings } = await db.from("tickets").select("id, created_at").eq("order_id", ticket.order_id);
  const ordered = (siblings ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const index = Math.max(1, ordered.findIndex((t) => t.id === ticket.id) + 1);

  const token = signTicketToken(ticket.id, ticket.nonce, secret);
  const png = await renderTicketPng({ token, ticketId: ticket.id, index, total: ordered.length || 1, event });
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="billet-la-teuf-${ticket.id.slice(0, 8)}.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
