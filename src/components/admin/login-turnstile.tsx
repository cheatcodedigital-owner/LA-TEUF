"use client";

import { useState } from "react";
import { Turnstile, TURNSTILE_SITE_KEY } from "@/components/ticketing/turnstile";

/**
 * Anti-robot des pages de connexion (/admin, /influenceur) : le jeton part dans le champ caché `turnstile`.
 * À remonter (prop `key`) après chaque réponse du serveur : un jeton Turnstile ne sert qu'une fois.
 * Sans clé publique configurée, rien ne s'affiche et le serveur décide (voir src/lib/security/login-guard.ts).
 */
export function LoginTurnstile() {
  const [token, setToken] = useState("");
  if (!TURNSTILE_SITE_KEY) return null;
  return (
    <div>
      <input type="hidden" name="turnstile" value={token} />
      <Turnstile
        siteKey={TURNSTILE_SITE_KEY}
        locale="fr"
        onToken={setToken}
        onError={() => setToken("")}
      />
    </div>
  );
}
