"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copier" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          window.prompt("Copie ce texte :", text);
        }
      }}
      className="inline-flex min-h-11 items-center rounded-full border border-warm-ivory/40 px-4 font-label text-xs uppercase tracking-wider"
    >
      {copied ? "Copié ✓" : label}
    </button>
  );
}
