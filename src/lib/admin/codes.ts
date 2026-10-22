import "server-only";
import { randomInt } from "node:crypto";
import { getAdminClient } from "@/lib/ticketing/supabase";
import { fetchAll, type Page } from "./data";

// Alphabet sans caractères ambigus (0/O, 1/I/L) : les codes sont recopiés depuis des visuels
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_PATTERN = /^[A-Z0-9_-]{3,32}$/;

export function generateCode(prefix = "TEUF") {
  let tail = "";
  for (let i = 0; i < 5; i++) tail += ALPHABET[randomInt(ALPHABET.length)];
  return `${prefix}-${tail}`;
}

export type FormState = { error?: string; done?: string; secret?: string };

export const dbError = (e: { code?: string; message: string }) =>
  e.message.includes("code_taken") ? "Ce code est déjà utilisé (code promo ou influenceur)." : e.code === "23505" ? "Ce code existe déjà." : "Erreur d'enregistrement.";


// ---------------------------------------------------------------------------------------
// Codes promo
// ---------------------------------------------------------------------------------------
export type PromoRow = {
  id: string;
  code: string;
  label: string | null;
  kind: "percent" | "amount";
  value: number;
  max_uses: number | null;
  event_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  created_at: string;
  events: { name: string } | null;
};

export type PromoWithStats = PromoRow & { used: number; held: number; discounts: number; expired: boolean };

export async function listPromos(): Promise<PromoWithStats[]> {
  const db = getAdminClient();
  const { data, error } = await db
    .from("promo_codes")
    .select("id, code, label, kind, value, max_uses, event_id, starts_at, ends_at, active, created_at, events(name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const orders = await fetchAll<{ promo_code_id: string; status: string; discount_xof: number; expires_at: string | null }>((from, to) =>
    db.from("orders").select("promo_code_id, status, discount_xof, expires_at").not("promo_code_id", "is", null).range(from, to) as unknown as Page<never>,
  );
  const now = Date.now();
  return (data as unknown as PromoRow[]).map((p) => {
    const mine = orders.filter((o) => o.promo_code_id === p.id);
    const paid = mine.filter((o) => o.status === "paid");
    return {
      ...p,
      used: paid.length,
      held: mine.filter((o) => o.status === "pending" && o.expires_at && new Date(o.expires_at).getTime() > now).length,
      discounts: paid.reduce((t, o) => t + o.discount_xof, 0),
      expired: p.ends_at ? new Date(p.ends_at).getTime() < now : false,
    };
  });
}
