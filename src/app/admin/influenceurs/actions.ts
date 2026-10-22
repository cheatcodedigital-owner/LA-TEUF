"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generatePassword, hashPassword } from "@/lib/affiliate/password";
import { getAffiliate, SLUG_PATTERN, slugify } from "@/lib/affiliate/stats";
import type { FormState } from "@/lib/admin/codes";
import { assertRole } from "@/lib/admin/session";
import { getAdminClient } from "@/lib/ticketing/supabase";

const PATH = "/admin/influenceurs";

const affiliateSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court.").max(80),
  slug: z.string().trim().max(60).optional(),
  contact: z.string().trim().max(120).optional(),
  ratePct: z.coerce.number().int().min(1).max(50),
  eventSlug: z.string().trim().max(80).optional(),
});

export async function createAffiliate(_prev: FormState, form: FormData): Promise<FormState> {
  await assertRole("admin");
  const parsed = affiliateSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const v = parsed.data;

  const slug = slugify(v.slug || v.name);
  if (!SLUG_PATTERN.test(slug)) return { error: "Identifiant invalide : 3 à 30 caractères, lettres, chiffres et tirets." };

  // Le mot de passe n'est affiché qu'une fois, à la création : seul son empreinte est conservée
  const password = generatePassword();
  const { error } = await getAdminClient()
    .from("affiliates")
    .insert({ name: v.name, slug, contact: v.contact || null, rate_pct: v.ratePct, default_event_slug: v.eventSlug || null, password_hash: await hashPassword(password) });
  if (error) return { error: error.code === "23505" ? "Cet identifiant existe déjà." : "Erreur d'enregistrement." };
  revalidatePath(PATH);
  return { done: slug, secret: password };
}

export async function resetAffiliatePassword(_prev: FormState, form: FormData): Promise<FormState> {
  await assertRole("admin");
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return { error: "Influenceur introuvable." };
  const password = generatePassword();
  const { error } = await getAdminClient().from("affiliates").update({ password_hash: await hashPassword(password) }).eq("id", id.data);
  if (error) return { error: "Erreur d'enregistrement." };
  return { done: "Nouveau mot de passe", secret: password };
}

export async function setAffiliateActive(form: FormData) {
  await assertRole("admin");
  const id = z.uuid().parse(form.get("id"));
  await getAdminClient().from("affiliates").update({ active: form.get("active") === "true" }).eq("id", id);
  revalidatePath(PATH);
}

export async function recordPayout(_prev: FormState, form: FormData): Promise<FormState> {
  await assertRole("admin");
  const parsed = z
    .object({ affiliateId: z.uuid(), amount: z.coerce.number().int().min(1, "Montant invalide."), note: z.string().trim().max(120).optional() })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const { affiliateId, amount, note } = parsed.data;

  const aff = await getAffiliate(affiliateId);
  if (!aff) return { error: "Influenceur introuvable." };
  if (amount > aff.stats.balance) return { error: `Le versement dépasse le solde dû (${aff.stats.balance.toLocaleString("fr-FR")} FCFA).` };

  const { error } = await getAdminClient().from("affiliate_payouts").insert({ affiliate_id: affiliateId, amount_xof: amount, note: note || null });
  if (error) return { error: "Erreur d'enregistrement." };
  revalidatePath(PATH);
  return { done: `${amount.toLocaleString("fr-FR")} FCFA enregistrés.` };
}

export async function deletePayout(form: FormData) {
  await assertRole("admin");
  const id = z.uuid().parse(form.get("id"));
  await getAdminClient().from("affiliate_payouts").delete().eq("id", id);
  revalidatePath(PATH);
}
