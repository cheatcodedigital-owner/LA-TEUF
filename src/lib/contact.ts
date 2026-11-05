// Réponse de POST /api/contact (formulaire de la page /contact)
export type ContactResponse = { status: "sent" } | { status: "error"; code: "invalid" | "antibot" | "rate" | "unavailable" };
