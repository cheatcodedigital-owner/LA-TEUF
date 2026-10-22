// Widget de paiement Kkiapay (script officiel chargé à la demande, uniquement au moment de payer)
type Handlers = { onSuccess: (transactionId: string | null) => void; onFailed: (transactionId: string | null) => void };

declare global {
  interface Window {
    openKkiapayWidget?: (options: Record<string, unknown>) => void;
    closeKkiapayWidget?: () => void;
    addSuccessListener?: (callback: (response: unknown) => void) => void;
    addFailedListener?: (callback: (response: unknown) => void) => void;
  }
}

const SCRIPT_URL = "https://cdn.kkiapay.me/k.js";
// Couleur du widget : valeur du token solar-copper (le widget attend un code couleur, pas une classe)
const THEME = "#E66C3F";

let loading: Promise<void> | null = null;
let registered = false;
let current: Handlers | null = null;

function loadScript() {
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error("kkiapay script"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

const transactionIdOf = (response: unknown) => {
  const r = response as { transactionId?: unknown; transactionid?: unknown } | null;
  const id = r?.transactionId ?? r?.transactionid;
  return typeof id === "string" || typeof id === "number" ? String(id) : null;
};

/** Ouvre le widget. Les écouteurs de Kkiapay ne se retirent pas : on les enregistre une fois et on route vers le dernier appel. */
export async function openKkiapay(
  options: { publicKey: string; sandbox: boolean; amount: number; orderId: string; email: string },
  handlers: Handlers,
) {
  await loadScript();
  if (!window.openKkiapayWidget || !window.addSuccessListener || !window.addFailedListener) throw new Error("kkiapay api");

  current = handlers;
  if (!registered) {
    registered = true;
    window.addSuccessListener((response) => current?.onSuccess(transactionIdOf(response)));
    window.addFailedListener((response) => {
      // Ferme la fenêtre Kkiapay pour laisser la nôtre afficher la raison de l'échec
      window.closeKkiapayWidget?.();
      current?.onFailed(transactionIdOf(response));
    });
  }
  window.openKkiapayWidget({
    key: options.publicKey,
    sandbox: options.sandbox,
    amount: options.amount,
    // L'identifiant partenaire est l'id de la commande : il relie la transaction à la commande côté serveur
    partnerId: options.orderId,
    email: options.email,
    theme: THEME,
    position: "center",
  });
}
