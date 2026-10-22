import { createHmac, timingSafeEqual } from "node:crypto";

const DAY = 86_400_000;

/**
 * Fin de validité d'un billet : minuit UTC du jour J + 2 jours (exclu), soit la fin du lendemain de la soirée.
 * Règle imposée au scan par `_ticket_valid_until` (migration 0004) : la garder alignée.
 */
export function ticketValidUntil(startsAt: string | Date): Date {
  const d = new Date(startsAt);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + 2 * DAY);
}

const sign = (secret: string, payload: string) => createHmac("sha256", secret).update(payload).digest("base64url").slice(0, 22);

/** Contenu du QR : `idBillet.nonce.signature`. La signature empêche de forger un QR sans connaître le secret. */
export function signTicketToken(ticketId: string, nonce: string, secret: string) {
  const payload = `${ticketId}.${nonce}`;
  return `${payload}.${sign(secret, payload)}`;
}

/** Vérifie la signature d'un QR scanné et renvoie l'id et le nonce à transmettre à `scan_ticket`, ou null. */
export function verifyTicketToken(token: string, secret: string): { ticketId: string; nonce: string } | null {
  const [ticketId, nonce, signature, ...rest] = token.split(".");
  if (!ticketId || !nonce || !signature || rest.length) return null;
  const expected = Buffer.from(sign(secret, `${ticketId}.${nonce}`));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  return { ticketId, nonce };
}
