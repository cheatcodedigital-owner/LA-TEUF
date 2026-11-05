"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Turnstile } from "@/components/ticketing/turnstile";
import type { ContactResponse } from "@/lib/contact";
import { TURNSTILE_TEST_SITE_KEY } from "@/lib/ticketing/config";

const SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || (process.env.NODE_ENV !== "production" ? TURNSTILE_TEST_SITE_KEY : undefined);

// Champs en Cosmic Black sur la carte Deep Indigo (même style que la billetterie)
const field =
  "w-full bg-cosmic-black px-6 py-3.5 text-warm-ivory outline-none ring-1 ring-warm-ivory/25 transition placeholder:text-warm-ivory/40 hover:ring-warm-ivory/50 focus:ring-2 focus:ring-ultraviolet disabled:opacity-50";
const label = "mb-2 block px-2 font-label text-sm uppercase tracking-widest text-warm-ivory/80";

type State = "idle" | "sending" | "sent" | Extract<ContactResponse, { status: "error" }>["code"];

export function ContactForm() {
  const t = useTranslations("Contact.form");
  const locale = useLocale();
  const [token, setToken] = useState<string | null>(null);
  const [widget, setWidget] = useState(0);
  const [state, setState] = useState<State>("idle");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    const form = e.currentTarget;
    setState("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(new FormData(form)), token }),
      });
      const data = (await res.json()) as ContactResponse;
      if (data.status === "sent") {
        form.reset();
        setState("sent");
      } else setState(data.code);
    } catch {
      setState("unavailable");
    } finally {
      // Un jeton Turnstile ne sert qu'une fois : nouveau contrôle pour le prochain envoi
      setToken(null);
      setWidget((n) => n + 1);
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="rounded-3xl bg-cosmic-black p-6">
        <p className="font-title text-2xl">{t("sentTitle")}</p>
        <p className="mt-2 text-warm-ivory/80">{t("sentText")}</p>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="mt-6 inline-flex min-h-11 items-center rounded-full border border-warm-ivory/40 px-6 font-label text-sm uppercase tracking-wider transition hover:border-solar-copper hover:text-solar-copper"
        >
          {t("another")}
        </button>
      </div>
    );
  }

  const sending = state === "sending";

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={label}>{t("name")}</span>
          <input name="name" required minLength={2} maxLength={80} autoComplete="name" className={`${field} rounded-full`} disabled={sending} />
        </label>
        <label className="block">
          <span className={label}>{t("email")}</span>
          <input name="email" type="email" required maxLength={254} autoComplete="email" className={`${field} rounded-full`} disabled={sending} />
        </label>
      </div>
      <label className="block">
        <span className={label}>{t("subject")}</span>
        <input name="subject" required minLength={2} maxLength={120} className={`${field} rounded-full`} disabled={sending} />
      </label>
      <label className="block">
        <span className={label}>{t("message")}</span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          placeholder={t("messagePlaceholder")}
          className={`${field} resize-y rounded-3xl`}
          disabled={sending}
        />
      </label>
      {/* Piège à robots : invisible pour les humains */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      {SITE_KEY ? (
        <Turnstile key={widget} siteKey={SITE_KEY} locale={locale} onToken={setToken} onError={() => setState("antibot")} />
      ) : (
        <p className="text-solar-copper">{t("errors.unavailable")}</p>
      )}

      {state !== "idle" && state !== "sending" && (
        <p role="alert" className="rounded-2xl bg-solar-copper/15 px-4 py-3 text-solar-copper">
          {t(`errors.${state}`)}
        </p>
      )}

      <button
        type="submit"
        disabled={!token || sending}
        className="hover-glow inline-flex min-h-11 w-full items-center justify-center rounded-full bg-solar-copper py-3.5 font-label text-base uppercase tracking-wider text-cosmic-black disabled:cursor-not-allowed disabled:opacity-60 sm:w-56"
      >
        {sending ? t("sending") : t("send")}
      </button>
    </form>
  );
}
