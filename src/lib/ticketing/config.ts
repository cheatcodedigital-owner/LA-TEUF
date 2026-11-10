/** Durée pendant laquelle les places d'une commande non payée sont maintenues */
export const HOLD_MINUTES = 10;
/** Personnes par table (salon) */
export const TABLE_SEATS = 6;
/** Nombre maximum de billets par commande */
export const MAX_PER_ORDER = 10;

export const COUNTRIES = ["TG", "BJ", "FR", "CI", "SN", "CM", "GH", "NG", "BE", "CA", "US", "OTHER"] as const;

// Clés de test publiques de Cloudflare Turnstile (le défi réussit toujours) : utilisées uniquement
// en développement quand aucune clé n'est configurée.
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
export const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";
