"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/admin/codes";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

// Rapprochement manuel d'une commande SasPay (webhook jamais reçu) : le serveur revérifie le paiement avant toute émission
export function ReconcileForm({ action, orderId }: { action: Action; orderId: string }) {
  const [state, run, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={run} className="mt-4">
      <input type="hidden" name="orderId" value={orderId} />
      <button
        type="submit"
        disabled={pending}
        className="press min-h-12 rounded-full bg-solar-copper px-7 font-label uppercase tracking-wider text-cosmic-black disabled:opacity-50"
      >
        {pending ? "Vérification…" : "Revérifier le paiement"}
      </button>
      {state.error && (
        <p role="alert" className="mt-3 text-sm text-solar-copper">
          {state.error}
        </p>
      )}
      {state.done && (
        <p role="status" className="mt-3 text-sm text-emerald-400">
          {state.done}
        </p>
      )}
    </form>
  );
}
