export const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

export const when = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("fr-FR", { timeZone: "Africa/Lome", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "—";

export const ORDER_STATUS: Record<string, string> = {
  paid: "Payée",
  pending: "En attente",
  cancelled: "Annulée",
  expired: "Expirée",
  failed: "Échec",
  refund_needed: "À rembourser",
  refunded: "Remboursée",
};

export const TICKET_STATUS: Record<string, string> = {
  valid: "Valide",
  used: "Utilisé",
  cancelled: "Annulé",
};
