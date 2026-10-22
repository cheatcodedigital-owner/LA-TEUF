// Logique du scanner, sans dépendance serveur : s'exécute dans le navigateur, y compris hors ligne.
// Le contrôle local compare la signature du QR à celle du manifeste (voir getScanManifest) ; le serveur
// revérifie toujours la signature HMAC et l'usage unique à la synchronisation.

export type ScanResult = "ok" | "already_used" | "invalid" | "wrong_event" | "cancelled" | "expired";
/** `unknown` : QR bien formé mais absent de la liste embarquée (billet vendu après la dernière mise à jour ?) */
export type LocalResult = ScanResult | "unknown";

export type ManifestTicket = { i: string; s: string; n: string; k: string; st: 0 | 1 | 2; at?: string; dv?: string };
export type Manifest = {
  event: { id: string; name: string; startsAt: string; validUntil: string };
  generatedAt: string;
  tickets: ManifestTicket[];
};

export function parseToken(raw: string): { id: string; sig: string } | null {
  const parts = raw.trim().split(".");
  if (parts.length !== 3 || parts.some((p) => !p) || raw.length > 200) return null;
  return { id: parts[0], sig: parts[2] };
}

export function checkLocal(manifest: Manifest, raw: string, nowMs: number): { result: LocalResult; ticket?: ManifestTicket } {
  const parsed = parseToken(raw);
  if (!parsed) return { result: "invalid" };
  const ticket = manifest.tickets.find((t) => t.i === parsed.id);
  if (!ticket) return { result: "unknown" };
  if (ticket.s !== parsed.sig) return { result: "invalid" };
  if (ticket.st === 2) return { result: "cancelled", ticket };
  if (ticket.st === 1) return { result: "already_used", ticket };
  if (nowMs >= new Date(manifest.event.validUntil).getTime()) return { result: "expired", ticket };
  return { result: "ok", ticket };
}

/** Marque un billet comme utilisé dans le manifeste local (copie modifiée, l'original n'est pas touché). */
export function markUsed(manifest: Manifest, ticketId: string, at: string, device?: string | null): Manifest {
  return {
    ...manifest,
    tickets: manifest.tickets.map((t) => (t.i === ticketId ? { ...t, st: 1, at: t.at ?? at, ...(device && !t.dv ? { dv: device } : {}) } : t)),
  };
}
