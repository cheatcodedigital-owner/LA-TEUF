import { NextResponse, type NextRequest } from "next/server";
import { reserve } from "@/lib/ticketing/sales";
import { reservationSchema } from "@/lib/ticketing/schema";
import type { ReserveResponse } from "@/lib/ticketing/types";

// Route API plutôt que Server Action : une réservation ne doit pas re-rendre la page de billetterie
// (qui relit les places restantes), et le formulaire garde ses valeurs en cas d'erreur.
// ❓ À ajouter avant l'ouverture des ventes : anti-bot (Turnstile) et limitation de débit par IP.
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ status: "error" } satisfies ReserveResponse, { status: 403 });
  }

  const parsed = reservationSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) {
    const fieldErrors: Record<string, true> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = true;
    return NextResponse.json({ status: "error", fieldErrors } satisfies ReserveResponse, { status: 400 });
  }

  const result = await reserve(parsed.data);
  if (!result.ok) {
    const status = result.code === "unavailable" || result.code === "unknown" ? 503 : 409;
    return NextResponse.json(
      { status: "error", code: result.code, remaining: result.remaining } satisfies ReserveResponse,
      { status },
    );
  }
  return NextResponse.json({ status: "success", order: result.order, sample: result.sample } satisfies ReserveResponse, {
    headers: { "Cache-Control": "no-store" },
  });
}
