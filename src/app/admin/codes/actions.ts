"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CODE_PATTERN, dbError, generateCode } from "@/lib/admin/codes";
import { assertRole } from "@/lib/admin/session";
import { getAdminClient } from "@/lib/ticketing/supabase";
import type { FormState } from "@/lib/admin/codes";

const promoSchema = z
  .object({
    code: z.string().trim().toUpperCase().max(32).optional(),
    label: z.string().trim().max(80).optional(),
    kind: z.enum(["percent", "amount"]),
    value: z.coerce.number().int().min(1),
    maxUses: z.coerce.number().int().min(1).max(10000),
    eventId: z.union([z.uuid(), z.literal("")]).optional(),
    endsAt: z.union([z.iso.date(), z.literal("")]).optional(),
  })
  .refine((v) => v.kind !== "percent" || v.value <= 100, { path: ["value"], message: "Un pourcentage ne dépasse pas 100." })
  .refine((v) => v.kind !== "amount" || v.value <= 100000, { path: ["value"], message: "Montant trop élevé." });

export async function createPromo(_prev: FormState, form: FormData): Promise<FormState> {
  await assertRole("admin");
  const parsed = promoSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const v = parsed.data;

  const code = v.code || generateCode();
  if (!CODE_PATTERN.test(code)) return { error: "Code invalide : 3 à 32 caractères parmi lettres, chiffres, - et _." };

  const { error } = await getAdminClient().from("promo_codes").insert({
    code,
    label: v.label || null,
    kind: v.kind,
    value: v.value,
    max_uses: v.maxUses,
    event_id: v.eventId || null,
    // Valable jusqu'à la fin du jour choisi (heure de Lomé = UTC)
    ends_at: v.endsAt ? `${v.endsAt}T23:59:59Z` : null,
  });
  if (error) return { error: dbError(error) };
  revalidatePath("/admin/codes");
  return { done: code };
}

export async function setPromoActive(form: FormData) {
  await assertRole("admin");
  const id = z.uuid().parse(form.get("id"));
  await getAdminClient().from("promo_codes").update({ active: form.get("active") === "true" }).eq("id", id);
  revalidatePath("/admin/codes");
}

/**
 * Supprime un code de la liste. Jamais payé : suppression définitive (les commandes non abouties qui le citaient
 * le perdent). Déjà payé : archivé et désactivé, pour garder l'historique des ventes et des exports.
 */
export async function deletePromo(_prev: FormState, form: FormData): Promise<FormState> {
  await assertRole("admin");
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return { error: "Code introuvable." };
  const db = getAdminClient();

  const { data: orders, error } = await db.from("orders").select("status, expires_at").eq("promo_code_id", id.data);
  if (error) return { error: "Erreur de lecture. Réessayez." };
  const now = Date.now();
  if (orders.some((o) => o.status === "pending" && o.expires_at && new Date(o.expires_at).getTime() > now)) {
    return { error: "Une commande avec ce code est en cours de paiement. Réessayez dans quelques minutes." };
  }

  const archive = async (): Promise<FormState> => {
    const { error: e } = await db.from("promo_codes").update({ archived_at: new Date().toISOString(), active: false }).eq("id", id.data);
    if (e) return { error: "Ce code a des ventes payées : appliquez la migration 0011 (supabase/migrations) pour pouvoir le retirer." };
    revalidatePath("/admin/codes");
    return { done: "archived" };
  };
  if (orders.some((o) => o.status === "paid")) return archive();

  // Jamais payé : on détache les commandes non abouties puis on supprime. Si une commande vient d'être payée entre-temps,
  // la clé étrangère bloque la suppression et le code est archivé à la place.
  await db.from("orders").update({ promo_code_id: null }).eq("promo_code_id", id.data).neq("status", "paid");
  const { error: delError } = await db.from("promo_codes").delete().eq("id", id.data);
  if (delError) return archive();
  revalidatePath("/admin/codes");
  return { done: "deleted" };
}
