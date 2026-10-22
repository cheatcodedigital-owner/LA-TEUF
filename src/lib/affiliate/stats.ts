import "server-only";
import { fetchAll, type Page } from "@/lib/admin/data";
import { getAdminClient } from "@/lib/ticketing/supabase";

export type Affiliate = {
  id: string;
  name: string;
  slug: string;
  contact: string | null;
  rate_pct: number;
  active: boolean;
  default_event_slug: string | null;
  created_at: string;
  has_password: boolean;
};

export type CampaignStats = { campaign: string; clicks: number; started: number; completed: number };
export type Sale = { id: string; quantity: number; total_xof: number; commission: number; paid_at: string | null; event: string | null; campaign: string | null };
export type Payout = { id: string; amount_xof: number; paid_at: string; note: string | null };

export type AffiliateStats = {
  clicks: number;
  visitors: number;
  started: number; // acheteurs distincts ayant validé le formulaire (commande créée)
  completed: number; // commandes payées
  conversion: number; // achats complétés / clics, en %
  sales: number; // total encaissé des commandes payées
  earned: number; // commissions des commandes payées
  paidOut: number;
  balance: number;
  campaigns: CampaignStats[];
  recent: Sale[];
  payouts: Payout[];
};

const NONE = "(sans campagne)";

type OrderRow = {
  id: string;
  affiliate_id: string;
  status: string;
  quantity: number;
  total_xof: number;
  affiliate_commission_xof: number;
  affiliate_ref: string | null;
  buyer_email: string;
  paid_at: string | null;
  events: { name: string } | null;
};

function compute(clicks: { campaign: string | null; visitor_id: string }[], orders: OrderRow[], payouts: (Payout & { affiliate_id: string })[]): AffiliateStats {
  const paid = orders.filter((o) => o.status === "paid");
  const earned = paid.reduce((t, o) => t + o.affiliate_commission_xof, 0);
  const paidOut = payouts.reduce((t, p) => t + p.amount_xof, 0);

  const map = new Map<string, CampaignStats & { buyers: Set<string> }>();
  const row = (c: string | null) => {
    const key = c ?? NONE;
    if (!map.has(key)) map.set(key, { campaign: key, clicks: 0, started: 0, completed: 0, buyers: new Set() });
    return map.get(key)!;
  };
  for (const c of clicks) row(c.campaign).clicks++;
  for (const o of orders) {
    const r = row(o.affiliate_ref);
    r.buyers.add(o.buyer_email);
    if (o.status === "paid") r.completed++;
  }
  const campaigns = [...map.values()].map(({ buyers, ...c }) => ({ ...c, started: buyers.size })).sort((a, b) => b.clicks - a.clicks || b.completed - a.completed);

  return {
    clicks: clicks.length,
    visitors: new Set(clicks.map((c) => c.visitor_id)).size,
    started: new Set(orders.map((o) => o.buyer_email)).size,
    completed: paid.length,
    conversion: clicks.length ? Math.round((paid.length / clicks.length) * 1000) / 10 : 0,
    sales: paid.reduce((t, o) => t + o.total_xof, 0),
    earned,
    paidOut,
    balance: earned - paidOut,
    campaigns,
    recent: paid
      .map((o) => ({ id: o.id, quantity: o.quantity, total_xof: o.total_xof, commission: o.affiliate_commission_xof, paid_at: o.paid_at, event: o.events?.name ?? null, campaign: o.affiliate_ref }))
      .sort((a, b) => (b.paid_at ?? "").localeCompare(a.paid_at ?? "")),
    payouts: payouts.map((p) => ({ id: p.id, amount_xof: p.amount_xof, paid_at: p.paid_at, note: p.note })).sort((a, b) => b.paid_at.localeCompare(a.paid_at)),
  };
}

const COLUMNS = "id, name, slug, contact, rate_pct, active, default_event_slug, created_at, password_hash";

function toAffiliate(r: Record<string, unknown>): Affiliate {
  const { password_hash, ...rest } = r as Record<string, unknown> & { password_hash: string | null };
  return { ...(rest as Omit<Affiliate, "has_password">), has_password: Boolean(password_hash) };
}

async function load(affiliateId?: string) {
  const db = getAdminClient();
  const clicks = fetchAll<{ affiliate_id: string; campaign: string | null; visitor_id: string }>((from, to) => {
    let q = db.from("affiliate_clicks").select("affiliate_id, campaign, visitor_id").order("id");
    if (affiliateId) q = q.eq("affiliate_id", affiliateId);
    return q.range(from, to) as unknown as Page<never>;
  });
  // Seules les commandes payées comptent en gains ; toutes servent à compter les achats démarrés (même abandonnés)
  const orders = fetchAll<OrderRow>((from, to) => {
    let q = db
      .from("orders")
      .select("id, affiliate_id, status, quantity, total_xof, affiliate_commission_xof, affiliate_ref, buyer_email, paid_at, events(name)")
      .not("affiliate_id", "is", null)
      .order("created_at");
    if (affiliateId) q = q.eq("affiliate_id", affiliateId);
    return q.range(from, to) as unknown as Page<never>;
  });
  const payouts = fetchAll<Payout & { affiliate_id: string }>((from, to) => {
    let q = db.from("affiliate_payouts").select("id, affiliate_id, amount_xof, paid_at, note");
    if (affiliateId) q = q.eq("affiliate_id", affiliateId);
    return q.order("paid_at", { ascending: false }).range(from, to) as unknown as Page<never>;
  });
  return Promise.all([clicks, orders, payouts]);
}

export async function listAffiliates(): Promise<(Affiliate & { stats: AffiliateStats })[]> {
  const { data, error } = await getAdminClient().from("affiliates").select(COLUMNS).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const [clicks, orders, payouts] = await load();
  return (data ?? []).map((r) => {
    const a = toAffiliate(r);
    return { ...a, stats: compute(clicks.filter((c) => c.affiliate_id === a.id), orders.filter((o) => o.affiliate_id === a.id), payouts.filter((p) => p.affiliate_id === a.id)) };
  });
}

export async function getAffiliate(id: string): Promise<(Affiliate & { stats: AffiliateStats }) | null> {
  const { data, error } = await getAdminClient().from("affiliates").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const [clicks, orders, payouts] = await load(id);
  return { ...toAffiliate(data), stats: compute(clicks, orders, payouts) };
}

export async function findAffiliateForLogin(slug: string) {
  const { data } = await getAdminClient().from("affiliates").select("id, active, password_hash").eq("slug", slug.trim().toLowerCase()).maybeSingle();
  return data as { id: string; active: boolean; password_hash: string | null } | null;
}

export const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
