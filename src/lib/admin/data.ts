import "server-only";
import type { Manifest } from "./scan-core";
import { getAdminClient } from "@/lib/ticketing/supabase";
import { ticketSignature, ticketValidUntil } from "@/lib/ticketing/ticket-token";

export type AdminEvent = {
  id: string;
  slug: string;
  name: string;
  venue: string | null;
  city: string;
  country: string;
  starts_at: string;
  capacity: number;
  status: "soon" | "on_sale" | "ended";
};

export type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

// PostgREST plafonne chaque réponse (1000 lignes par défaut) : on lit par tranches
export async function fetchAll<T>(page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const size = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < size) return rows;
  }
}

export async function getEvents(): Promise<AdminEvent[]> {
  const { data, error } = await getAdminClient()
    .from("events")
    .select("id, slug, name, venue, city, country, starts_at, capacity, status")
    .order("starts_at");
  if (error) throw new Error(error.message);
  return data as AdminEvent[];
}

type OrderRow = {
  id: string;
  status: "pending" | "paid" | "cancelled" | "expired" | "failed" | "refund_needed" | "refunded";
  channel: "online" | "onsite";
  quantity: number;
  unit_price_xof: number;
  subtotal_xof: number;
  discount_xof: number;
  total_xof: number;
  buyer_name: string;
  buyer_email: string;
  buyer_whatsapp: string;
  buyer_country: string;
  affiliate_commission_xof: number;
  affiliate_ref: string | null;
  kkiapay_transaction_id: string | null;
  expires_at: string | null;
  created_at: string;
  paid_at: string | null;
  tickets_emailed_at: string | null;
  ticket_types: { kind: string } | null;
  promo_codes: { code: string } | null;
  affiliates: { slug: string } | null;
};

const ORDER_COLUMNS =
  "id, status, channel, quantity, unit_price_xof, subtotal_xof, discount_xof, total_xof, buyer_name, buyer_email, buyer_whatsapp, buyer_country, affiliate_commission_xof, affiliate_ref, kkiapay_transaction_id, expires_at, created_at, paid_at, tickets_emailed_at, ticket_types(kind), promo_codes(code), affiliates(slug)";

const eventOrders = (eventId: string) =>
  fetchAll<OrderRow>((from, to) =>
    getAdminClient().from("orders").select(ORDER_COLUMNS).eq("event_id", eventId).order("created_at", { ascending: false }).range(from, to) as unknown as Page<OrderRow>,
  );

export type ScanRow = {
  id: number;
  ticket_id: string | null;
  result: string;
  device: string | null;
  scanned_at: string;
  scanned_for: string | null;
  buyer_name?: string | null;
};

// scan_log n'a pas de clé étrangère vers tickets (on y journalise aussi les billets inconnus) : noms lus à part
async function withBuyers(scans: ScanRow[]): Promise<ScanRow[]> {
  const ids = [...new Set(scans.map((s) => s.ticket_id).filter((id): id is string => Boolean(id)))];
  const names = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 150) {
    const { data, error } = await getAdminClient()
      .from("tickets")
      .select("id, orders(buyer_name)")
      .in("id", ids.slice(i, i + 150));
    if (error) throw new Error(error.message);
    for (const t of (data ?? []) as unknown as { id: string; orders: { buyer_name: string } | null }[]) {
      if (t.orders) names.set(t.id, t.orders.buyer_name);
    }
  }
  return scans.map((s) => ({ ...s, buyer_name: s.ticket_id ? (names.get(s.ticket_id) ?? null) : null }));
}

const eventScans = (eventId: string) =>
  fetchAll<ScanRow>((from, to) =>
    getAdminClient()
      .from("scan_log")
      .select("id, ticket_id, result, device, scanned_at, scanned_for")
      .eq("event_id", eventId)
      .order("id", { ascending: false })
      .range(from, to) as unknown as Page<ScanRow>,
  );

const KIND_LABEL: Record<string, string> = { early_bird: "Early bird", standard: "Standard" };
export const kindLabel = (kind: string | undefined) => (kind ? (KIND_LABEL[kind] ?? kind) : "—");

export type Dashboard = {
  event: AdminEvent;
  tickets: { sold: number; entered: number; cancelled: number };
  capacityLeft: number;
  held: number;
  revenue: { total: number; online: number; onsite: number; discounts: number };
  tiers: { kind: string; sold: number; revenue: number }[];
  statusCounts: Record<string, number>;
  refundNeeded: OrderRow[];
  recentOrders: OrderRow[];
  scanResults: Record<string, number>;
  recentScans: ScanRow[];
};

export async function getDashboard(event: AdminEvent): Promise<Dashboard> {
  const db = getAdminClient();
  const count = async (status: string) => {
    const { count: n, error } = await db
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id)
      .eq("status", status);
    if (error) throw new Error(error.message);
    return n ?? 0;
  };
  const [orders, scans, valid, used, cancelled] = await Promise.all([
    eventOrders(event.id),
    eventScans(event.id),
    count("valid"),
    count("used"),
    count("cancelled"),
  ]);

  const now = Date.now();
  const paid = orders.filter((o) => o.status === "paid");
  const sum = (rows: OrderRow[], pick: (o: OrderRow) => number) => rows.reduce((t, o) => t + pick(o), 0);

  const tiers = new Map<string, { kind: string; sold: number; revenue: number }>();
  for (const o of paid) {
    const kind = o.ticket_types?.kind ?? "?";
    const t = tiers.get(kind) ?? { kind, sold: 0, revenue: 0 };
    t.sold += o.quantity;
    t.revenue += o.total_xof;
    tiers.set(kind, t);
  }

  const statusCounts: Record<string, number> = {};
  for (const o of orders) statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;

  const scanResults: Record<string, number> = {};
  for (const s of scans) scanResults[s.result] = (scanResults[s.result] ?? 0) + 1;

  const sold = valid + used;
  const held = sum(
    orders.filter((o) => o.status === "pending" && o.expires_at && new Date(o.expires_at).getTime() > now),
    (o) => o.quantity,
  );

  return {
    event,
    tickets: { sold, entered: used, cancelled },
    capacityLeft: Math.max(0, event.capacity - sold - held),
    held,
    revenue: {
      total: sum(paid, (o) => o.total_xof),
      online: sum(paid.filter((o) => o.channel === "online"), (o) => o.total_xof),
      onsite: sum(paid.filter((o) => o.channel === "onsite"), (o) => o.total_xof),
      discounts: sum(paid, (o) => o.discount_xof),
    },
    tiers: [...tiers.values()].sort((a, b) => a.kind.localeCompare(b.kind)),
    statusCounts,
    refundNeeded: orders.filter((o) => o.status === "refund_needed"),
    recentOrders: orders.filter((o) => o.status !== "pending" || (o.expires_at && new Date(o.expires_at).getTime() > now)).slice(0, 25),
    scanResults,
    recentScans: await withBuyers(scans.slice(0, 20)),
  };
}

// ---------------------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------------------
export const exportOrders = eventOrders;
export const exportScans = async (eventId: string) => withBuyers(await eventScans(eventId));

export type TicketExportRow = {
  id: string;
  status: string;
  scanned_at: string | null;
  scanned_device: string | null;
  created_at: string;
  ticket_types: { kind: string } | null;
  orders: { id: string; buyer_name: string; buyer_email: string; buyer_whatsapp: string; status: string; channel: string } | null;
};

export const exportTickets = (eventId: string) =>
  fetchAll<TicketExportRow>((from, to) =>
    getAdminClient()
      .from("tickets")
      .select("id, status, scanned_at, scanned_device, created_at, ticket_types(kind), orders(id, buyer_name, buyer_email, buyer_whatsapp, status, channel)")
      .eq("event_id", eventId)
      .order("created_at")
      .order("id")
      .range(from, to) as unknown as Page<TicketExportRow>,
  );

// ---------------------------------------------------------------------------------------
// Manifeste du scan hors ligne
// ---------------------------------------------------------------------------------------
export type { Manifest, ManifestTicket } from "./scan-core";

export async function getScanManifest(event: AdminEvent, secret: string): Promise<Manifest> {
  const rows = await fetchAll<{
    id: string;
    nonce: string;
    status: string;
    scanned_at: string | null;
    scanned_device: string | null;
    ticket_types: { kind: string } | null;
    orders: { buyer_name: string } | null;
  }>((from, to) =>
    getAdminClient()
      .from("tickets")
      .select("id, nonce, status, scanned_at, scanned_device, ticket_types(kind), orders(buyer_name)")
      .eq("event_id", event.id)
      .order("created_at")
      .order("id")
      .range(from, to) as unknown as Page<never>,
  );

  return {
    event: { id: event.id, name: event.name, startsAt: event.starts_at, validUntil: ticketValidUntil(event.starts_at).toISOString() },
    generatedAt: new Date().toISOString(),
    tickets: rows.map((t) => ({
      i: t.id,
      s: ticketSignature(t.id, t.nonce, secret),
      n: t.orders?.buyer_name ?? "",
      k: t.ticket_types?.kind ?? "",
      st: t.status === "used" ? 1 : t.status === "cancelled" ? 2 : 0,
      ...(t.scanned_at ? { at: t.scanned_at } : {}),
      ...(t.scanned_device ? { dv: t.scanned_device } : {}),
    })),
  };
}
