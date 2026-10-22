import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isValidWebhookSecret, verifyTransaction } from "@/lib/ticketing/kkiapay";
import { confirmPayment } from "@/lib/ticketing/sales";

const bodySchema = z.object({
  transactionId: z.string().min(1).max(128),
  isPaymentSucces: z.boolean().optional(),
  event: z.string().optional(),
});

// Webhook Kkiapay (à déclarer dans le tableau de bord, avec le même « hash secret » que
// KKIAPAY_WEBHOOK_SECRET). Filet de sécurité : émet les billets même si l'acheteur ferme l'onglet
// après avoir payé. Le contenu reçu n'est qu'un signal : tout est revérifié auprès de Kkiapay.
// Une réponse 2xx arrête les relances de Kkiapay ; 5xx les déclenche (utile si la base est indisponible).
export async function POST(request: NextRequest) {
  if (!isValidWebhookSecret(request.headers.get("x-kkiapay-secret"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const { transactionId, isPaymentSucces, event } = parsed.data;
  if (event === "transaction.failed" || isPaymentSucces === false) return NextResponse.json({ ok: true });

  // La commande visée est l'identifiant partenaire transmis au widget (id de la commande)
  const tx = await verifyTransaction(transactionId);
  if (!tx) return NextResponse.json({ ok: false }, { status: 503 });
  if (!tx.success || !tx.partnerId) return NextResponse.json({ ok: true });

  const result = await confirmPayment(tx.partnerId, transactionId);
  if (result.status === "error" && result.code === "unavailable") return NextResponse.json({ ok: false }, { status: 503 });
  return NextResponse.json({ ok: true });
}
