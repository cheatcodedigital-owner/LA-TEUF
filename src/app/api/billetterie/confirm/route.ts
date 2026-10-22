import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { confirmPayment } from "@/lib/ticketing/sales";
import type { ConfirmResponse } from "@/lib/ticketing/types";

const bodySchema = z.object({ orderId: z.string().min(1).max(64), transactionId: z.string().min(1).max(128) });

const reply = (body: ConfirmResponse, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Appelée par le navigateur quand le widget Kkiapay annonce un succès. Le navigateur n'est pas
// cru sur parole : la transaction est revérifiée auprès de Kkiapay avant d'émettre les billets.
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return reply({ status: "error", code: "unavailable" }, 403);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return reply({ status: "error", code: "not_confirmed" }, 400);

  const result = await confirmPayment(parsed.data.orderId, parsed.data.transactionId);
  return reply(result, result.status === "error" ? (result.code === "unavailable" ? 503 : 409) : 200);
}
