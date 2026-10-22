"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 1000);
  return () => window.clearInterval(id);
}
const getSnapshot = () => Math.floor(Date.now() / 1000);
// null côté serveur : évite tout écart d'hydratation
const getServerSnapshot = () => null;

export function Countdown({ target }: { target: string }) {
  const t = useTranslations("Hero.countdown");
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const remaining = now === null ? null : Math.max(0, Math.floor(new Date(target).getTime() / 1000) - now);

  if (remaining === 0) {
    return <p className="font-label text-2xl uppercase text-solar-copper">{t("started")}</p>;
  }

  const parts = [
    { key: "days", value: remaining === null ? null : Math.floor(remaining / 86400) },
    { key: "hours", value: remaining === null ? null : Math.floor((remaining % 86400) / 3600) },
    { key: "minutes", value: remaining === null ? null : Math.floor((remaining % 3600) / 60) },
    { key: "seconds", value: remaining === null ? null : remaining % 60 },
  ] as const;

  return (
    <dl className="flex gap-3 md:gap-4" aria-label={t("label")}>
      {parts.map(({ key, value }) => (
        <div key={key} className="w-16 rounded-2xl bg-cosmic-black/70 px-1 py-3 text-center md:w-20">
          <dd className="font-label text-3xl tabular-nums leading-none md:text-4xl">
            {value === null ? "--" : String(value).padStart(2, "0")}
          </dd>
          <dt className="mt-1 text-xs uppercase tracking-wider text-warm-ivory/70">{t(key)}</dt>
        </div>
      ))}
    </dl>
  );
}
