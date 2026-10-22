/** Durée pendant laquelle les places d'une commande non payée sont maintenues */
export const HOLD_MINUTES = 10;
/** Nombre maximum de billets par commande */
export const MAX_PER_ORDER = 10;

export const COUNTRIES = ["TG", "BJ", "FR", "CI", "SN", "CM", "GH", "NG", "BE", "CA", "US", "OTHER"] as const;

/**
 * Remise de groupe automatique, réservée au tarif standard : -10 % dès 5 billets, -15 % dès 8, -20 % pour 10.
 * ⚠️ À garder alignée avec `_group_discount_pct` dans supabase/migrations/0003_standard_quota_early_open.sql
 * (le serveur SQL fait foi ; ceci sert à l'aperçu du total dans le formulaire).
 */
export function groupDiscountPercent(kind: string, quantity: number) {
  if (kind !== "standard") return 0;
  if (quantity >= 10) return 20;
  if (quantity >= 8) return 15;
  if (quantity >= 5) return 10;
  return 0;
}

// Clés de test publiques de Cloudflare Turnstile (le défi réussit toujours) : utilisées uniquement
// en développement quand aucune clé n'est configurée.
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
export const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";
