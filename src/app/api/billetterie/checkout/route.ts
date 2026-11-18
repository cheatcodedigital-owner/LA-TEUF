import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { z } from "zod";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getOrderPayable, getPaymentConfig, getPaymentProvider, startSaspayCheckout } from "@/lib/ticketing/sales";
import { verifyTurnstile } from "@/lib/ticketing/turnstile";
import type { CheckoutResponse } from "@/lib/ticketing/types";

const bodySchema = z.object({
  orderId: z.string().min(1).max(64),
  token: z.string().min(1).max(4096),
  locale: z.string().max(5).optional(),
});

const reply = (body: CheckoutResponse, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Étape suivant le clic sur « Payer » : contrôle anti-bot (Turnstile), vérification que la réservation est toujours
// active, puis selon PAYMENT_PROVIDER : configuration du widget Kkiapay (clé publique) ou création, côté serveur,
// de la session de checkout SasPay (seule son URL part vers le navigateur, jamais la clé secrète).
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

  const sample = getPaymentConfig();
  if (getPaymentProvider() === "saspay" && sample?.mode !== "sample") {
    const locale = hasLocale(routing.locales, parsed.data.locale) ? parsed.data.locale : routing.defaultLocale;
    const site = (process.env.SITE_URL || request.nextUrl.origin).replace(/\/$/, "");
    const returnUrl = (slug: string) =>
      `${site}${getPathname({ href: `/billetterie/${slug}/retour`, locale })}?commande=${encodeURIComponent(parsed.data.orderId)}`;
    const started = await startSaspayCheckout(parsed.data.orderId, returnUrl);
    if (!started.ok) return reply({ status: "error", code: started.code }, started.code === "not_payable" ? 409 : 503);
    return reply({ status: "ready", totalXof: started.totalXof, payment: started.payment });
  }

  if (!sample) return reply({ status: "error", code: "unavailable" }, 503);
  return reply({ status: "ready", totalXof: order.totalXof ?? 0, payment: sample });
}
