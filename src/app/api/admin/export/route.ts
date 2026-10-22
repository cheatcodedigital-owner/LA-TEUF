import { NextResponse, type NextRequest } from "next/server";
import { toCsv } from "@/lib/admin/csv";
import { exportOrders, exportScans, exportTickets, getEvents, kindLabel } from "@/lib/admin/data";
import { hasRole } from "@/lib/admin/session";
import { isSupabaseConfigured } from "@/lib/ticketing/supabase";

const text = (body: string, status = 200, headers: Record<string, string> = {}) =>
  new NextResponse(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

// Contient des données personnelles (noms, e-mails, WhatsApp) : réservé au rôle admin
export async function GET(request: NextRequest) {
  if (!hasRole(request, "admin")) return text("Non autorisé", 401);
  if (!isSupabaseConfigured()) return text("Base de données non configurée", 503);

  const slug = request.nextUrl.searchParams.get("event");
  const type = request.nextUrl.searchParams.get("type");
  const event = (await getEvents()).find((e) => e.slug === slug);
  if (!event) return text("Événement introuvable", 404);

  let csv: string;
  if (type === "commandes") {
    const orders = await exportOrders(event.id);
    csv = toCsv(
      ["Commande", "Créée le", "Payée le", "Statut", "Canal", "Palier", "Billets", "Prix unitaire (FCFA)", "Sous-total", "Remise", "Total", "Nom", "E-mail", "WhatsApp", "Pays", "Code promo", "Affilié", "Transaction Kkiapay", "E-mail billets envoyé le"],
      orders.map((o) => [o.id, o.created_at, o.paid_at, o.status, o.channel, kindLabel(o.ticket_types?.kind), o.quantity, o.unit_price_xof, o.subtotal_xof, o.discount_xof, o.total_xof, o.buyer_name, o.buyer_email, o.buyer_whatsapp, o.buyer_country, o.promo_codes?.code, o.affiliate_ref, o.kkiapay_transaction_id, o.tickets_emailed_at]),
    );
  } else if (type === "billets") {
    const tickets = await exportTickets(event.id);
    csv = toCsv(
      ["Billet", "Commande", "Statut du billet", "Palier", "Nom", "E-mail", "WhatsApp", "Statut de la commande", "Entré le", "Appareil de scan"],
      tickets.map((t) => [t.id, t.orders?.id, t.status, kindLabel(t.ticket_types?.kind), t.orders?.buyer_name, t.orders?.buyer_email, t.orders?.buyer_whatsapp, t.orders?.status, t.scanned_at, t.scanned_device]),
    );
  } else if (type === "scans") {
    const scans = await exportScans(event.id);
    csv = toCsv(
      ["Heure du scan", "Enregistré le", "Résultat", "Appareil", "Billet", "Nom"],
      scans.map((s) => [s.scanned_for ?? s.scanned_at, s.scanned_at, s.result, s.device, s.ticket_id, s.buyer_name]),
    );
  } else {
    return text("Type d'export inconnu", 400);
  }

  return text(csv, 200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${event.slug}-${type}.csv"`,
  });
}
