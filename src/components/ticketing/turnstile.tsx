"use client";

import { useEffect, useRef } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript() {
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile script"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function Turnstile({
  siteKey,
  locale,
  onToken,
  onError,
}: {
  siteKey: string;
  locale: string;
  onToken: (token: string) => void;
  onError: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const handlers = useRef({ onToken, onError });
  useEffect(() => {
    handlers.current = { onToken, onError };
  });

  useEffect(() => {
    let widgetId: string | undefined;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetId = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          theme: "dark",
          language: locale,
          callback: (token: string) => handlers.current.onToken(token),
          "error-callback": () => handlers.current.onError(),
          "timeout-callback": () => handlers.current.onError(),
        });
      })
      .catch(() => handlers.current.onError());
    return () => {
      cancelled = true;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [siteKey, locale]);

  return <div ref={ref} className="min-h-[65px]" />;
}
