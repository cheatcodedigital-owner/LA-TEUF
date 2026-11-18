import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getOrderStatus } from "@/lib/ticketing/sales";
import type { OrderStatusResponse } from "@/lib/ticketing/types";

const idSchema = z.string().uuid();

// Statut d'une commande pour la page de retour SasPay. Lecture seule : n'émet jamais de billet (c'est le rôle du
// webhook) et ne renvoie que le statut, sans donnée personnelle. L'identifiant (UUID) n'est connu que de l'acheteur.
export async function GET(request: NextRequest) {
  const parsed = idSchema.safeParse(request.nextUrl.searchParams.get("id"));
  const body: OrderStatusResponse = parsed.success ? await getOrderStatus(parsed.data) : { status: "unknown" };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
