"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
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
          className="mt-2 min-h-12 w-full rounded-full bg-cosmic-black px-5 text-warm-ivory"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-solar-copper">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Connexion…" : "Entrer"}
      </Button>
    </form>
  );
}
