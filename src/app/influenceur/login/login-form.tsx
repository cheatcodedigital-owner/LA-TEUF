"use client";

import { useActionState } from "react";
import { Flip } from "@/components/ds/flip";
import { loginAffiliate, type LoginState } from "./actions";

const field =
  "mt-2 h-14 w-full rounded-full border border-warm-ivory bg-cosmic-black px-5 font-body text-[16px] text-warm-ivory outline-none placeholder:text-warm-ivory/50 focus:border-ultraviolet focus:ring-1 focus:ring-inset focus:ring-ultraviolet";

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
      <Flip type="submit" tone="copper" size="h-14 w-full px-6 text-[16px]" className="w-full" disabled={pending}>
        {pending ? "Connexion…" : "Entrer"}
      </Flip>
    </form>
  );
}
