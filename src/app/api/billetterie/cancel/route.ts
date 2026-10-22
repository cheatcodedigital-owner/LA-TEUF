import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { cancelOrder } from "@/lib/ticketing/sales";

const bodySchema = z.object({ orderId: z.string().min(1).max(64), email: z.string().trim().max(120) });

// L'acheteur revient au formulaire : on supprime sa réservation pour libérer les places
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ ok: false }, { status: 403 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const ok = await cancelOrder(parsed.data.orderId, parsed.data.email);
  return NextResponse.json({ ok }, { headers: { "Cache-Control": "no-store" } });
}
