"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/admin/codes";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

// Suppression d'un code promo, après confirmation. Un code déjà payé est archivé côté serveur (voir deletePromo).
export function DeletePromoButton({ action, id, code, used }: { action: Action; id: string; code: string; used: number }) {
  const [state, run, pending] = useActionState<FormState, FormData>(action, {});
  const question = used
    ? `Retirer le code ${code} de la liste ? Il sera désactivé ; ses ${used} vente(s) restent dans l'historique et les exports.`
    : `Supprimer définitivement le code ${code} ?`;

  return (
    <form
      action={run}
      onSubmit={(e) => {
        if (!window.confirm(question)) e.preventDefault();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-full px-4 text-sm text-solar-copper underline disabled:opacity-50"
      >
        {pending ? "Suppression…" : "Supprimer"}
      </button>
      {state.error && (
        <span role="alert" className="text-sm text-solar-copper">
          {state.error}
        </span>
      )}
    </form>
  );
}
