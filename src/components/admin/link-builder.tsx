"use client";

import { useState } from "react";
import { CopyButton } from "./copy-button";

// Personnalisation du lien : l'influenceur ajoute une campagne (?c=…) pour savoir quel contenu fonctionne
export function LinkBuilder({ baseUrl }: { baseUrl: string }) {
  const [campaign, setCampaign] = useState("");
  const tag = campaign.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  const url = tag ? `${baseUrl}?c=${tag}` : baseUrl;
  return (
    <div>
      <label className="block">
        <span className="font-label text-sm uppercase tracking-wider">Nom de la campagne (optionnel)</span>
        <input
          value={campaign}
          onChange={(e) => setCampaign(e.target.value)}
          maxLength={40}
          placeholder="instagram-story, tiktok-bio, newsletter…"
          className="mt-2 min-h-12 w-full rounded-full bg-cosmic-black px-5 text-warm-ivory"
        />
      </label>
      <p className="mt-3 break-all rounded-3xl bg-cosmic-black px-4 py-3 font-mono text-sm">{url}</p>
      <div className="mt-3">
        <CopyButton text={url} label="Copier ce lien" />
      </div>
    </div>
  );
}
