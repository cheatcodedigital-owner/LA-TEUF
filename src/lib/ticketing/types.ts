export type TierKind = "early_bird" | "standard";

/** upcoming : pas encore ouvert · on_sale · sold_out : quota atteint · closed : fenêtre terminée */
export type TierState = "upcoming" | "on_sale" | "sold_out" | "closed";

export type Tier = {
  id: string;
  kind: TierKind;
  priceXof: number;
  remaining: number;
  state: TierState;
  onSale: boolean;
  salesStart: string | null;
  salesEnd: string | null;
};

export type EventSales = {
  event: {
    id: string;
    slug: string;
    name: string;
    venue: string | null;
    city: string;
    country: string;
    startsAt: string;
    status: "soon" | "on_sale" | "ended";
    capacity: number;
  };
  remaining: number;
  soldOut: boolean;
  tiers: Tier[];
};

export type SalesResult =
  | { kind: "ok"; sales: EventSales; sample: boolean }
  | { kind: "not_found" }
  | { kind: "unavailable" };

export type OrderSummary = {
  orderId: string;
  expiresAt: string;
  quantity: number;
  unitPriceXof: number;
  subtotalXof: number;
  discountXof: number;
  totalXof: number;
  /** Remise de groupe appliquée (0, 10 ou 20) */
  autoDiscountPct: number;
  /** Un code promo a été appliqué (il l'emporte sur la remise de groupe) */
  promoApplied: boolean;
};

export type ReserveErrorCode =
  | "event_not_found"
  | "sales_closed"
  | "invalid_quantity"
  | "type_unavailable"
  | "sold_out"
  | "not_enough"
  | "invalid_promo"
  | "promo_exhausted"
  | "promo_not_allowed"
  | "unavailable"
  | "unknown";

export type ReserveResult =
  | { ok: true; order: OrderSummary; sample: boolean }
  | { ok: false; code: ReserveErrorCode; remaining?: number };

/** Réponse JSON de POST /api/billetterie/reserve */
export type ReserveResponse =
  | { status: "success"; order: OrderSummary; sample: boolean }
  | { status: "error"; code?: ReserveErrorCode; remaining?: number; fieldErrors?: Record<string, true> };

/** Comment l'acheteur paie : widget Kkiapay (clé publique) ou paiement simulé en démo */
export type PaymentConfig = { mode: "kkiapay"; publicKey: string; sandbox: boolean } | { mode: "sample" };

export type CheckoutResponse =
  | { status: "ready"; totalXof: number; payment: PaymentConfig }
  | { status: "error"; code: "antibot" | "not_payable" | "unavailable" };

/** Réponse de POST /api/billetterie/confirm (après le paiement dans le widget) */
export type ConfirmResponse =
  | { status: "paid"; tickets: number }
  | { status: "refund_needed" }
  | { status: "error"; code: "not_confirmed" | "unavailable" };
