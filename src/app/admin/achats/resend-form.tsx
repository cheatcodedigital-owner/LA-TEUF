"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/admin/codes";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

// Renvoi de l'e-mail des billets : adresse de l'acheteur pré-remplie, modifiable si elle était erronée
export function ResendForm({ action, orderId, email }: { action: Action; orderId: string; email: string }) {
  const [state, run, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={run} className="mt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <input type="hidden" name="orderId" value={orderId} />
        <label className="block flex-1">
          <span className="font-label text-sm uppercase tracking-wider">Adresse d&apos;envoi</span>
          <input
            name="to"
            type="email"
            required
            defaultValue={email}
            autoComplete="off"
            className="mt-2 min-h-12 w-full rounded-full bg-cosmic-black px-5 text-warm-ivory"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="press min-h-12 rounded-full bg-solar-copper px-7 font-label uppercase tracking-wider text-cosmic-black disabled:opacity-50"
        >
          {pending ? "Envoi…" : "Renvoyer les billets"}
        </button>
      </div>
      {state.error && (
        <p role="alert" className="mt-3 text-sm text-solar-copper">
          {state.error}
        </p>
      )}
      {state.done && (
        <p role="status" className="mt-3 text-sm text-emerald-400">
          E-mail envoyé à <b>{state.done}</b>
        </p>
      )}
    </form>
  );
}
