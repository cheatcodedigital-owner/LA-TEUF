import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { ContactResponse } from "@/lib/contact";
import { clientIp, hitLimit, LIMITS } from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/ticketing/turnstile";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(254),
  subject: z.string().trim().min(2).max(120),
  message: z.string().trim().min(10).max(4000),
  token: z.string().min(1).max(4096),
  // Piège à robots : champ caché, doit rester vide
  website: z.string().max(0).optional(),
});

const reply = (body: ContactResponse, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Formulaire de la page /contact : le message part vers la boîte de l'équipe, « Répondre » écrit au visiteur.
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return reply({ status: "error", code: "unavailable" }, 403);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return reply({ status: "error", code: "invalid" }, 400);
  const { name, email, subject, message, token } = parsed.data;

  // 5 envois par heure et par IP, comptés en base (partagés entre instances)
  const ip = clientIp(request.headers);
  if (await hitLimit(LIMITS.contact, ip)) return reply({ status: "error", code: "rate" }, 429);

  const antibot = await verifyTurnstile(token, ip);
  if (antibot === "unavailable") return reply({ status: "error", code: "unavailable" }, 503);
  if (antibot === "failed") return reply({ status: "error", code: "antibot" }, 403);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[contact] message non envoyé : RESEND_API_KEY manquant");
    return reply({ status: "error", code: "unavailable" }, 503);
  }
  const to = process.env.CONTACT_EMAIL_TO || "hello@lateufelectronic.com";
  const from = process.env.CONTACT_EMAIL_FROM || "LA TEUF · Site <contact@lateufelectronic.com>";

  const text = `${message}\n\n— ${name} <${email}>\nEnvoyé depuis la page contact du site.`;
  const html = `<div style="font:15px/1.5 Arial,sans-serif;white-space:pre-wrap">${esc(message)}</div>
<p style="font:13px Arial,sans-serif;color:#666">— ${esc(name)} &lt;${esc(email)}&gt;<br>Envoyé depuis la page contact du site.</p>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], reply_to: email, subject: `[Site] ${subject.replace(/[\r\n]+/g, " ")}`, text, html }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status} ${await res.text()}`);
  } catch (e) {
    console.error("[contact]", e instanceof Error ? e.message : e);
    return reply({ status: "error", code: "unavailable" }, 502);
  }

  return reply({ status: "sent" });
}
