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
