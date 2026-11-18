import { NextResponse, type NextRequest } from "next/server";
import { clientIp, hitLimit, LIMITS } from "@/lib/security/rate-limit";
import { reserve } from "@/lib/ticketing/sales";
import { reservationSchema } from "@/lib/ticketing/schema";
import { verifyTurnstile } from "@/lib/ticketing/turnstile";
import type { ReserveResponse } from "@/lib/ticketing/types";

// Route API plutôt que Server Action : une réservation ne doit pas re-rendre la page de billetterie
// (qui relit les places restantes), et le formulaire garde ses valeurs en cas d'erreur.
// Une réservation bloque des places pendant HOLD_MINUTES sans paiement : sans garde-fou, un robot pourrait
// rendre tous les billets indisponibles. D'où, dans l'ordre : limite par IP (en base, partagée entre instances),
// anti-robot Turnstile, puis une seule réservation active à la fois par e-mail ou WhatsApp (`reserve`).
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ status: "error" } satisfies ReserveResponse, { status: 403 });
  }

  const form = await request.formData();
  const parsed = reservationSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fieldErrors: Record<string, true> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = true;
    return NextResponse.json({ status: "error", fieldErrors } satisfies ReserveResponse, { status: 400 });
  }

  const ip = clientIp(request.headers);
  if (await hitLimit(LIMITS.reserve, ip)) {
    return NextResponse.json({ status: "error", code: "rate" } satisfies ReserveResponse, { status: 429 });
  }

  const token = form.get("token");
  const antibot = typeof token === "string" && token.length > 0 && token.length <= 4096 ? await verifyTurnstile(token, ip) : "failed";
  if (antibot === "unavailable") return NextResponse.json({ status: "error", code: "unavailable" } satisfies ReserveResponse, { status: 503 });
  if (antibot === "failed") return NextResponse.json({ status: "error", code: "antibot" } satisfies ReserveResponse, { status: 403 });

  // Attribution : cookie posé par le lien d'affiliation /r/<slug> (format validé, jamais transmis tel quel sinon)
  const ref = request.cookies.get("teuf_ref")?.value;
  const result = await reserve(parsed.data, ref && /^[a-z0-9-]{3,30}(:[a-z0-9_-]{1,40})?$/.test(ref) ? ref : null);
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
