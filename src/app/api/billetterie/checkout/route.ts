import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getOrderPayable, getPaymentConfig } from "@/lib/ticketing/sales";
import { verifyTurnstile } from "@/lib/ticketing/turnstile";
import type { CheckoutResponse } from "@/lib/ticketing/types";

const bodySchema = z.object({ orderId: z.string().min(1).max(64), token: z.string().min(1).max(4096) });

const reply = (body: CheckoutResponse, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Étape suivant le clic sur « Payer » : contrôle anti-bot (Turnstile), vérification que la réservation
// est toujours active, puis remise de la configuration du widget de paiement (clé publique Kkiapay).
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return reply({ status: "error", code: "unavailable" }, 403);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return reply({ status: "error", code: "antibot" }, 400);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const antibot = await verifyTurnstile(parsed.data.token, ip);
  if (antibot === "unavailable") return reply({ status: "error", code: "unavailable" }, 503);
  if (antibot === "failed") return reply({ status: "error", code: "antibot" }, 403);

  const order = await getOrderPayable(parsed.data.orderId);
  if (!order.payable) return reply({ status: "error", code: "not_payable" }, 409);

  const payment = getPaymentConfig();
  if (!payment) return reply({ status: "error", code: "unavailable" }, 503);

  return reply({ status: "ready", totalXof: order.totalXof ?? 0, payment });
}
