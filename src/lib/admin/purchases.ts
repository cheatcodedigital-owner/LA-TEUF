import "server-only";
import QRCode from "qrcode";
import { fetchAll, type Page } from "./data";
import { getAdminClient } from "@/lib/ticketing/supabase";
import { signTicketToken } from "@/lib/ticketing/ticket-token";

// Suivi des achats dans /admin/achats : liste filtrable, puis fiche d'une commande avec ses billets (QR)
// pour les renvoyer à un client qui ne retrouve plus son e-mail.

export type PurchaseRow = {
  id: string;
  status: string;
  channel: string;
  quantity: number;
  total_xof: number;
  buyer_name: string;
  buyer_email: string;
  buyer_whatsapp: string;
  created_at: string;
  paid_at: string | null;
  tickets_emailed_at: string | null;
  events: { slug: string; name: string } | null;
  ticket_types: { kind: string } | null;
  tickets: { id: string; status: string }[];
};

export async function listPurchases(eventId: string | null): Promise<PurchaseRow[]> {
  return fetchAll<PurchaseRow>((from, to) => {
    let q = getAdminClient()
      .from("orders")
      .select(
        "id, status, channel, quantity, total_xof, buyer_name, buyer_email, buyer_whatsapp, created_at, paid_at, tickets_emailed_at, events(slug, name), ticket_types(kind), tickets(id, status)",
      )
      .order("created_at", { ascending: false })
      .range(from, to);
    if (eventId) q = q.eq("event_id", eventId);
    return q as unknown as Page<PurchaseRow>;
  });
}

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Recherche par nom, e-mail, WhatsApp (chiffres seuls) ou référence de commande / de billet (8 premiers caractères). */
export function matchPurchase(o: PurchaseRow, query: string): boolean {
  const q = normalize(query.trim());
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  const ref = q.replace(/[^0-9a-f]/g, "");
  return (
    normalize(o.buyer_name).includes(q) ||
    o.buyer_email.toLowerCase().includes(q) ||
    (digits.length >= 4 && o.buyer_whatsapp.replace(/\D/g, "").includes(digits)) ||
    (ref.length >= 4 && (o.id.startsWith(ref) || o.tickets.some((t) => t.id.startsWith(ref))))
  );
}

export type PurchaseTicket = {
  id: string;
  status: string;
  scanned_at: string | null;
  scanned_device: string | null;
  /** Position dans la commande (« Billet 2 / 3 »), même ordre que l'e-mail */
  index: number;
  /** QR (jeton signé) en image, prêt à afficher */
  qr: string | null;
};

export type PurchaseDetail = {
  order: {
    id: string;
    status: string;
    channel: string;
    quantity: number;
    unit_price_xof: number;
    subtotal_xof: number;
    discount_xof: number;
    total_xof: number;
    buyer_name: string;
    buyer_email: string;
    buyer_whatsapp: string;
    buyer_country: string;
    kkiapay_transaction_id: string | null;
    created_at: string;
    paid_at: string | null;
    tickets_emailed_at: string | null;
    events: { slug: string; name: string; venue: string | null; city: string; country: string; starts_at: string } | null;
    ticket_types: { kind: string } | null;
    promo_codes: { code: string } | null;
    affiliates: { slug: string } | null;
  };
  tickets: PurchaseTicket[];
  /** Faux si TICKET_SIGNING_SECRET manque : les QR ne peuvent pas être recalculés */
  canSign: boolean;
};

type TicketRow = { id: string; nonce: string; status: string; scanned_at: string | null; scanned_device: string | null; created_at: string };

export async function getPurchase(orderId: string): Promise<PurchaseDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null;
  const db = getAdminClient();
  const { data, error } = await db
    .from("orders")
    .select(
      "id, status, channel, quantity, unit_price_xof, subtotal_xof, discount_xof, total_xof, buyer_name, buyer_email, buyer_whatsapp, buyer_country, kkiapay_transaction_id, created_at, paid_at, tickets_emailed_at, events(slug, name, venue, city, country, starts_at), ticket_types(kind), promo_codes(code), affiliates(slug), tickets(id, nonce, status, scanned_at, scanned_device, created_at)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const { tickets: rows, ...order } = data as unknown as PurchaseDetail["order"] & { tickets: TicketRow[] };
  rows.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));

  const secret = process.env.TICKET_SIGNING_SECRET;
  const tickets = await Promise.all(
    rows.map(async (t, i) => ({
      id: t.id,
      status: t.status,
      scanned_at: t.scanned_at,
      scanned_device: t.scanned_device,
      index: i + 1,
      // Même QR que dans l'e-mail : le jeton dépend seulement de l'id, du nonce et du secret
      qr: secret
        ? await QRCode.toDataURL(signTicketToken(t.id, t.nonce, secret), {
            errorCorrectionLevel: "M",
            margin: 2,
            width: 480,
            color: { dark: "#000000", light: "#ffffff" },
          })
        : null,
    })),
  );
  return { order, tickets, canSign: Boolean(secret) };
}
