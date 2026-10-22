import "server-only";
import QRCode from "qrcode";
import { socials } from "@/components/layout/nav-items";
import { getAdminClient, isSupabaseConfigured } from "./supabase";
import { longDate, lastValidDay, renderLogoPng, renderTicketPng } from "./ticket-image";
import { signTicketToken } from "./ticket-token";

type EventRow = { name: string; venue: string | null; city: string; country: string; starts_at: string };
type OrderRow = {
  id: string;
  buyer_name: string;
  buyer_email: string;
  events: EventRow | EventRow[] | null;
  tickets: { id: string; nonce: string; created_at: string }[];
};

// Couleurs de la charte (src/app/globals.css) : un e-mail ne peut pas utiliser les tokens Tailwind
const INDIGO = "#202052";
const BLACK = "#090a10";
const IVORY = "#f3e9d5";
const COPPER = "#e66c3f";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** URL publique du site (liens « Télécharger » de l'e-mail). Sans elle, les boutons sont omis. */
const siteUrl = () => (process.env.SITE_URL || (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "")).replace(/\/$/, "");

function renderEmail(order: OrderRow, event: EventRow, tokens: string[]) {
  const place = [event.venue, event.city, event.country].filter(Boolean).join(", ");
  const date = longDate(new Date(event.starts_at));
  const lastDay = lastValidDay(event.starts_at);
  const base = siteUrl();
  const count = order.tickets.length;

  const cards = order.tickets
    .map(
      (t, i) => `
      <tr><td style="padding:0 0 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BLACK};border-radius:20px">
          <tr><td align="center" style="padding:24px">
            <p style="margin:0 0 12px;font:700 14px Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;color:${COPPER}">Billet ${i + 1} / ${count}</p>
            <img src="cid:ticket-${i + 1}" width="240" height="240" alt="QR code du billet ${i + 1}" style="display:block;border-radius:12px;background:#fff">
            <p style="margin:12px 0 0;font:12px Arial,sans-serif;color:${IVORY};opacity:.7">Réf. ${esc(t.id.slice(0, 8).toUpperCase())}</p>
            ${
              base
                ? `<a href="${esc(`${base}/api/billetterie/ticket-image?token=${encodeURIComponent(tokens[i])}`)}" style="display:inline-block;margin-top:16px;padding:12px 28px;border-radius:999px;background:${COPPER};color:${BLACK};font:700 14px Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;text-decoration:none">Télécharger</a>`
                : ""
            }
          </td></tr>
        </table>
      </td></tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Votre billet LA TEUF</title></head>
<body style="margin:0;padding:24px 12px;background:${BLACK};font-family:Arial,sans-serif;color:${IVORY}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${INDIGO};border-radius:28px">
      <tr><td style="padding:28px 28px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font:700 13px Arial,sans-serif;letter-spacing:3px;text-transform:uppercase;color:${COPPER}">LA TEUF ÉLECTRONIQUE</td>
          <td align="right"><img src="cid:logo" width="68" height="67" alt="LA TEUF" style="display:block"></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:8px 28px 8px">
        <h1 style="margin:12px 0 0;font:700 28px/1.2 Arial,sans-serif;color:${IVORY}">Félicitations ${esc(order.buyer_name)}, ${count > 1 ? "vos billets sont confirmés" : "votre billet est confirmé"} !</h1>
        <p style="margin:16px 0 0;font:16px/1.5 Arial,sans-serif;color:${IVORY}">Toute l'équipe t'attend très bientôt pour faire la fête avec la communauté.</p>
      </td></tr>
      <tr><td style="padding:20px 28px">
        <p style="margin:0;font:700 20px Arial,sans-serif;color:${COPPER};text-transform:uppercase">${esc(date)}</p>
        <p style="margin:6px 0 0;font:16px Arial,sans-serif;color:${IVORY}">${esc(event.name)} · ${esc(place)}</p>
      </td></tr>
      <tr><td style="padding:8px 28px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cards}</table>
      </td></tr>
      <tr><td style="padding:8px 28px 32px">
        <p style="margin:0;font:14px/1.5 Arial,sans-serif;color:${IVORY}"><strong>Comment l'utiliser ?</strong> Présente le QR code à l'entrée, sur ton téléphone ou imprimé. Chaque QR code est unique et ne fonctionne qu'une seule fois : ne le partage pas.</p>
        <p style="margin:12px 0 0;font:14px/1.5 Arial,sans-serif;color:${IVORY}">Valable jusqu'à la fin du ${esc(lastDay)}.</p>
        <p style="margin:12px 0 0;font:14px/1.5 Arial,sans-serif;color:${IVORY}">Tu veux inviter un ami ? Télécharge son billet avec le bouton sous chaque QR code et envoie-le lui.</p>
      </td></tr>
      <tr><td align="center" style="padding:0 28px 32px;border-top:1px solid rgba(243,233,213,.15)">
        <p style="margin:24px 0 12px;font:700 13px Arial,sans-serif;letter-spacing:3px;text-transform:uppercase;color:${COPPER}">Suis-nous</p>
        <p style="margin:0;font:14px/2.4 Arial,sans-serif">${socials
          .map((s) => `<a href="${esc(s.href)}" style="display:inline-block;margin:0 4px;padding:0 16px;line-height:36px;border:1px solid rgba(243,233,213,.4);border-radius:999px;color:${IVORY};text-decoration:none">${esc(s.label)}</a>`)
          .join("")}</p>
        <p style="margin:20px 0 0;font:13px/1.5 Arial,sans-serif;color:${IVORY};opacity:.7">Une question ? Écris-nous à hello@lateufelectronic.com.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const text = [
    `Félicitations ${order.buyer_name} !`,
    `${count > 1 ? "Vos billets sont confirmés" : "Votre billet est confirmé"} pour ${event.name} : ${date}, ${place}.`,
    `Les billets (QR codes) sont en pièces jointes : tu peux les télécharger et en envoyer un à un ami. Chacun est unique et ne fonctionne qu'une fois.`,
    `Valable jusqu'à la fin du ${lastDay}.`,
    `Une question ? hello@lateufelectronic.com`,
  ].join("\n\n");

  return { html, text, subject: `Ton billet pour ${event.name} · ${date}` };
}

/** Envoie l'e-mail avec un QR unique par place. Ne lève jamais d'exception : renvoie `true` si l'e-mail est parti (ou déjà envoyé). */
export async function sendTicketsEmail(orderId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const apiKey = process.env.RESEND_API_KEY;
  const secret = process.env.TICKET_SIGNING_SECRET;
  const from = process.env.EMAIL_FROM || (process.env.NODE_ENV !== "production" ? "LA TEUF <onboarding@resend.dev>" : undefined);
  if (!apiKey || !secret || !from) {
    console.warn("[ticketing] e-mail du billet non envoyé : RESEND_API_KEY, TICKET_SIGNING_SECRET ou EMAIL_FROM manquant");
    return false;
  }

  const db = getAdminClient();
  // Une seule exécution gagne (confirmation navigateur et webhook) ; remis à null si l'envoi échoue
  const claim = await db
    .from("orders")
    .update({ tickets_emailed_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "paid")
    .is("tickets_emailed_at", null)
    .select("id");
  if (claim.error) {
    console.error("[ticketing] e-mail du billet", claim.error.message);
    return false;
  }
  if (!claim.data?.length) return true;

  try {
    const { data, error } = await db
      .from("orders")
      .select("id, buyer_name, buyer_email, events(name, venue, city, country, starts_at), tickets(id, nonce, created_at)")
      .eq("id", orderId)
      .single<OrderRow>();
    if (error || !data) throw new Error(error?.message ?? "commande introuvable");
    const event = Array.isArray(data.events) ? data.events[0] : data.events;
    if (!event || !data.tickets.length) throw new Error("événement ou billets introuvables");
    data.tickets.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));

    const tokens = data.tickets.map((t) => signTicketToken(t.id, t.nonce, secret));
    const total = data.tickets.length;
    const inline = await Promise.all(
      data.tickets.map(async (t, i) => {
        const png = await QRCode.toBuffer(tokens[i], {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 480,
          color: { dark: "#000000", light: "#ffffff" },
        });
        return { filename: `qr-${i + 1}.png`, content: png.toString("base64"), content_type: "image/png", content_id: `ticket-${i + 1}` };
      }),
    );
    // Billets habillés de la charte, en pièces jointes : téléchargeables et partageables même sans le lien du bouton
    const branded = await Promise.all(
      data.tickets.map(async (t, i) => {
        const png = await renderTicketPng({ token: tokens[i], ticketId: t.id, index: i + 1, total, event });
        return { filename: `billet-la-teuf-${i + 1}.png`, content: png.toString("base64"), content_type: "image/png" };
      }),
    );
    const logo = { filename: "logo.png", content: (await renderLogoPng()).toString("base64"), content_type: "image/png", content_id: "logo" };
    const attachments = [logo, ...inline, ...branded];

    const { html, text, subject } = renderEmail(data, event, tokens);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [data.buyer_email], subject, html, text, attachments }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status} ${await res.text()}`);
    return true;
  } catch (e) {
    console.error("[ticketing] e-mail du billet", e instanceof Error ? e.message : e);
    await db.from("orders").update({ tickets_emailed_at: null }).eq("id", orderId);
    return false;
  }
}
