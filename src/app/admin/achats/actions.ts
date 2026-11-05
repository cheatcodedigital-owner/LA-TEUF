"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRole } from "@/lib/admin/session";
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
