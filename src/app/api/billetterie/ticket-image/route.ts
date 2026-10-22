import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient, isSupabaseConfigured } from "@/lib/ticketing/supabase";
import { renderTicketPng, type TicketEvent } from "@/lib/ticketing/ticket-image";
import { verifyTicketToken } from "@/lib/ticketing/ticket-token";

type Row = { id: string; nonce: string; order_id: string; events: TicketEvent | TicketEvent[] | null };

// Lien « Télécharger » de l'e-mail : renvoie le billet (QR habillé de la charte) en PNG. Le jeton signé du QR sert de
// clé d'accès : seul le détenteur du billet peut obtenir l'image, et rien n'est lisible sans la signature.
export async function GET(request: NextRequest) {
  const secret = process.env.TICKET_SIGNING_SECRET;
  const token = request.nextUrl.searchParams.get("token");
  if (!secret || !token || !isSupabaseConfigured()) return new NextResponse("Not found", { status: 404 });

  const parsed = verifyTicketToken(token, secret);
  if (!parsed) return new NextResponse("Not found", { status: 404 });

  const db = getAdminClient();
  const { data: ticket } = await db
    .from("tickets")
    .select("id, nonce, order_id, events(name, venue, city, country, starts_at)")
    .eq("id", parsed.ticketId)
    .eq("nonce", parsed.nonce)
    .maybeSingle<Row>();
  const event = Array.isArray(ticket?.events) ? ticket.events[0] : ticket?.events;
  if (!ticket || !event) return new NextResponse("Not found", { status: 404 });

  // Position du billet dans sa commande (« Billet 2 / 3 »)
  const { data: siblings } = await db.from("tickets").select("id, created_at").eq("order_id", ticket.order_id);
  const ordered = (siblings ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const index = Math.max(1, ordered.findIndex((t) => t.id === ticket.id) + 1);

  const png = await renderTicketPng({ token, ticketId: ticket.id, index, total: ordered.length || 1, event });
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="billet-la-teuf-${index}.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
