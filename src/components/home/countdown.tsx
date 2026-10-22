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
    <dl className="flex w-full justify-start gap-2 sm:gap-3 md:w-auto lg:gap-3 xl:gap-4" aria-label={t("label")}>
      {parts.map(({ key, value }) => (
        <div
          key={key}
          className="min-w-0 max-w-[4.5rem] flex-1 rounded-2xl bg-deep-indigo px-1 py-3 text-center short:py-2 md:w-[clamp(4.25rem,7.5vw,5.25rem)] md:max-w-none md:flex-none md:py-4 md:short:py-3 lg:w-[4.25rem] lg:py-3 lg:short:py-2 xl:w-20"
        >
          <dd className="font-label text-[clamp(1.75rem,0.9rem+4.4vw,2.25rem)] tabular-nums leading-none short:text-[clamp(1.5rem,0.8rem+3.6vw,2rem)] lg:text-4xl lg:max-xl:text-[clamp(2rem,3.4vw,2.25rem)] lg:short:text-3xl">
            {value === null ? "--" : String(value).padStart(2, "0")}
          </dd>
          <dt className="mt-2 text-xs uppercase tracking-wider text-warm-ivory/80 md:text-sm lg:mt-1.5 lg:text-xs">{t(key)}</dt>
        </div>
      ))}
    </dl>
  );
}
