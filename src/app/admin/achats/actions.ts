"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRole } from "@/lib/admin/session";
import { reconcileSaspayOrder } from "@/lib/ticketing/sales";
import { sendTicketsEmail } from "@/lib/ticketing/ticket-email";
import type { FormState } from "@/lib/admin/codes";

const resendSchema = z.object({ orderId: z.uuid(), to: z.email().max(254) });

/** Renvoie l'e-mail des billets (mêmes QR codes), à l'adresse de l'acheteur ou à une adresse corrigée. */
export async function resendTickets(_prev: FormState, form: FormData): Promise<FormState> {
  await assertRole("admin");
  const parsed = resendSchema.safeParse({ orderId: form.get("orderId"), to: String(form.get("to") ?? "").trim() });
  if (!parsed.success) return { error: "Adresse e-mail invalide." };

  const ok = await sendTicketsEmail(parsed.data.orderId, { resend: true, to: parsed.data.to });
  if (!ok) return { error: "L'e-mail n'est pas parti. Vérifiez la configuration Resend ou réessayez." };
  revalidatePath(`/admin/achats/${parsed.data.orderId}`);
  return { done: parsed.data.to };
}

const RECONCILE_MESSAGES: Record<string, FormState> = {
  paid: { done: "Paiement confirmé : billets émis et e-mail envoyé." },
  refund_needed: { error: "Paiement reçu mais plus de place : commande à rembourser." },
  not_paid: { error: "SasPay n'indique aucun paiement réussi pour cette commande." },
  no_session: { error: "Aucune session SasPay pour cette commande." },
  rejected: { error: "Paiement refusé par nos contrôles (montant ou commande) : aucun billet émis." },
  not_found: { error: "Paiement introuvable." },
  unavailable: { error: "SasPay ou la base est indisponible, réessayez." },
};

/** Rapproche à la main une commande SasPay dont le webhook n'est jamais arrivé (revérification serveur du paiement). */
export async function reconcileSaspay(_prev: FormState, form: FormData): Promise<FormState> {
  await assertRole("admin");
  const parsed = z.uuid().safeParse(form.get("orderId"));
  if (!parsed.success) return { error: "Commande invalide." };
  const result = await reconcileSaspayOrder(parsed.data);
  revalidatePath(`/admin/achats/${parsed.data}`);
  return RECONCILE_MESSAGES[result] ?? { error: "Erreur inattendue." };
}
