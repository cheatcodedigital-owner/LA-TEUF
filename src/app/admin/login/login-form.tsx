"use client";

import { useActionState } from "react";
import { Flip } from "@/components/ds/flip";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block">
        <span className="font-label text-sm uppercase tracking-wider">Mot de passe</span>
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          className="mt-2 h-14 w-full rounded-full border border-warm-ivory bg-cosmic-black px-5 font-body text-[16px] text-warm-ivory outline-none focus:border-ultraviolet focus:ring-1 focus:ring-inset focus:ring-ultraviolet"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-solar-copper">
          {state.error}
        </p>
      )}
      <Flip type="submit" tone="copper" size="h-14 w-full px-6 text-[16px]" className="w-full" disabled={pending}>
        {pending ? "Connexion…" : "Entrer"}
      </Flip>
    </form>
  );
}
