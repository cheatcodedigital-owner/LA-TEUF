"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import { loginAffiliate, type LoginState } from "./actions";

const field = "mt-2 min-h-12 w-full rounded-full bg-cosmic-black px-5 text-warm-ivory";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAffiliate, {});
  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block">
        <span className="font-label text-sm uppercase tracking-wider">Identifiant</span>
        <input name="identifier" required autoFocus autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="marie" className={field} />
      </label>
      <label className="block">
        <span className="font-label text-sm uppercase tracking-wider">Mot de passe</span>
        <input type="password" name="password" required autoComplete="current-password" className={field} />
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
