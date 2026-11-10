"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Flip } from "@/components/ds/flip";
import { Turnstile } from "@/components/ticketing/turnstile";
import type { ContactResponse } from "@/lib/contact";
import { TURNSTILE_TEST_SITE_KEY } from "@/lib/ticketing/config";

const SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || (process.env.NODE_ENV !== "production" ? TURNSTILE_TEST_SITE_KEY : undefined);

// Champs v2 sur bande Ivoire (maquette « Contact ») : pilules cerclées, focus contour 2 px et fond Lilas
const field =
  "w-full border border-cosmic-black bg-transparent px-5 font-body text-[16px] text-deep-indigo outline-none transition-colors placeholder:text-deep-indigo/60 focus:bg-violet-pale focus:ring-1 focus:ring-inset focus:ring-cosmic-black disabled:opacity-50";
const label = "mb-1.5 block font-label text-[13px] uppercase leading-4 tracking-[0.06em] text-deep-indigo";

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
      <div role="status" className="flex flex-col items-start gap-3 rounded-[24px] bg-violet-pale p-6 text-deep-indigo md:p-8">
        <p className="font-title text-[28px] leading-[100%]">{t("sentTitle")}</p>
        <p className="font-body text-[16px] leading-[150%]">{t("sentText")}</p>
        <Flip tone="outlineLight" size="h-12 px-6 text-[15px]" className="mt-3" onClick={() => setState("idle")}>
          {t("another")}
        </Flip>
      </div>
    );
  }

  const sending = state === "sending";

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 md:gap-5">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1.4fr] md:gap-3">
        <label className="block">
          <span className={label}>{t("name")}</span>
          <input name="name" required minLength={2} maxLength={80} autoComplete="name" className={`${field} h-[52px] rounded-full`} disabled={sending} />
        </label>
        <label className="block">
          <span className={label}>{t("email")}</span>
          <input name="email" type="email" required maxLength={254} autoComplete="email" className={`${field} h-[52px] rounded-full`} disabled={sending} />
        </label>
        <label className="block">
          <span className={label}>{t("subject")}</span>
          <input name="subject" required minLength={2} maxLength={120} className={`${field} h-[52px] rounded-full`} disabled={sending} />
        </label>
      </div>
      <label className="block">
        <span className={label}>{t("message")}</span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          placeholder={t("messagePlaceholder")}
          className={`${field} min-h-[130px] resize-y rounded-[20px] py-4 md:min-h-[180px]`}
          disabled={sending}
        />
      </label>
      {/* Piège à robots : invisible pour les humains */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      {state !== "idle" && state !== "sending" && (
        <p role="alert" className="rounded-[24px] border border-copper-deep bg-copper-pale px-5 py-4 font-body text-[15px] leading-[145%] text-deep-indigo">
          {t(`errors.${state}`)}
        </p>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {SITE_KEY ? (
          <Turnstile key={widget} siteKey={SITE_KEY} locale={locale} onToken={setToken} onError={() => setState("antibot")} />
        ) : (
          <p className="font-body text-copper-deep">{t("errors.unavailable")}</p>
        )}
        <Flip
          type="submit"
          tone="copper"
          size="h-14 px-10 text-[16px]"
          className="w-full md:w-auto [&_.flip-front]:border [&_.flip-front]:border-cosmic-black"
          disabled={!token || sending}
        >
          {sending ? t("sending") : t("send")}
        </Flip>
      </div>
    </form>
  );
}
