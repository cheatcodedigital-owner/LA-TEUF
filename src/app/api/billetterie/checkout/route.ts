import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { z } from "zod";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getOrderPayable, getPaymentConfig, getPaymentProvider, startSaspayCheckout } from "@/lib/ticketing/sales";
import type { CheckoutResponse } from "@/lib/ticketing/types";

const bodySchema = z.object({
  orderId: z.string().min(1).max(64),
  // Ancien jeton Turnstile (pages restées ouvertes avant la mise à jour) : accepté et ignoré
  token: z.string().max(4096).optional(),
  locale: z.string().max(5).optional(),
});

const reply = (body: CheckoutResponse, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Étape suivant le clic sur « Payer » : vérification que la réservation est toujours active, puis selon
// PAYMENT_PROVIDER : configuration du widget Kkiapay (clé publique) ou création, côté serveur, de la session
// de checkout SasPay (seule son URL part vers le navigateur, jamais la clé secrète).
// L'anti-robot (Turnstile) est passé à la réservation (/reserve) : une commande payable l'a donc déjà franchi, et son
// identifiant (UUID) n'est connu que de l'acheteur.
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return reply({ status: "error", code: "unavailable" }, 403);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return reply({ status: "error", code: "not_payable" }, 400);

  const order = await getOrderPayable(parsed.data.orderId);
  if (!order.payable) return reply({ status: "error", code: "not_payable" }, 409);

  const sample = getPaymentConfig();
  if (getPaymentProvider() === "saspay" && sample?.mode !== "sample") {
    const locale = hasLocale(routing.locales, parsed.data.locale) ? parsed.data.locale : routing.defaultLocale;
    // SITE_URL saisi sans schéma (« lateufelectronic.com ») : SasPay exige une URL de retour absolue
    const configured = process.env.SITE_URL?.trim();
    const site = (configured ? (/^https?:\/\//.test(configured) ? configured : `https://${configured}`) : request.nextUrl.origin).replace(/\/$/, "");
    const returnUrl = (slug: string) =>
      `${site}${getPathname({ href: `/billetterie/${slug}/retour`, locale })}?commande=${encodeURIComponent(parsed.data.orderId)}`;
    const started = await startSaspayCheckout(parsed.data.orderId, returnUrl);
    if (!started.ok) return reply({ status: "error", code: started.code }, started.code === "not_payable" ? 409 : 503);
    return reply({ status: "ready", totalXof: started.totalXof, payment: started.payment });
  }

  if (!sample) return reply({ status: "error", code: "unavailable" }, 503);
  return reply({ status: "ready", totalXof: order.totalXof ?? 0, payment: sample });
}
