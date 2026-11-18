import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isValidWebhookSignature } from "@/lib/ticketing/saspay";
import { confirmSaspayTransaction } from "@/lib/ticketing/sales";

const bodySchema = z.object({
  event: z.string().min(1).max(64),
  data: z.object({ id: z.string().min(1).max(64) }).passthrough().optional(),
});

// Webhook SasPay (à créer dans le tableau de bord SasPay, événement `transaction.success`, URL
// https://<domaine>/api/billetterie/saspay-webhook ; son `signing_secret` va dans SASPAY_WEBHOOK_SECRET).
// Seule voie d'émission des billets SasPay (la page de retour n'affiche qu'un statut). Ordre des contrôles :
//   1. signature HMAC SHA-256 de `${X-Webhook-Timestamp}.${corps brut}`, horodatage à ±5 min, temps constant ;
//   2. revérification du paiement (GET /payments/{id}/verify/ → SUCCESS) et rapprochement par la session de la commande ;
//   3. `mark_order_paid`, idempotent : un webhook rejoué ne crée jamais de second jeu de billets.
// 2xx arrête les relances de SasPay (5 tentatives sur 2 h) ; 5xx les déclenche (base ou API indisponible).
export async function POST(request: NextRequest) {
  // Corps brut : la signature porte sur les octets reçus, jamais sur un JSON re-sérialisé
  const raw = await request.text();
  if (
    !isValidWebhookSignature(raw, request.headers.get("x-webhook-signature"), request.headers.get("x-webhook-timestamp"))
  ) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let json: unknown = null;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  // webhook.test, transaction.failed, settlement.*… : rien à émettre. Un échec laisse la commande en attente
  // (l'acheteur peut réessayer sur la page SasPay tant que la réservation tient).
  if (parsed.data.event !== "transaction.success" || !parsed.data.data) return NextResponse.json({ ok: true });

  const result = await confirmSaspayTransaction(parsed.data.data.id);
  if (result === "unavailable") return NextResponse.json({ ok: false }, { status: 503 });
  return NextResponse.json({ ok: true });
}
