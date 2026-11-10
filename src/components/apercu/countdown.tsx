"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 1000);
  return () => window.clearInterval(id);
}
const getSnapshot = () => Math.floor(Date.now() / 1000);
// null côté serveur : pas d'écart d'hydratation
const getServerSnapshot = () => null;

export function Countdown({ target }: { target: string }) {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const left = now === null ? null : Math.max(0, Math.floor(new Date(target).getTime() / 1000) - now);

  const parts = [
    { label: "Jours", value: left === null ? null : Math.floor(left / 86400) },
    { label: "Heures", value: left === null ? null : Math.floor((left % 86400) / 3600) },
    { label: "Min", value: left === null ? null : Math.floor((left % 3600) / 60) },
    { label: "Sec", value: left === null ? null : left % 60 },
  ];

  return (
    <dl aria-label="Avant la soirée" className="flex gap-1.5">
      {parts.map((p) => (
        <div
          key={p.label}
          className="flex flex-1 flex-col-reverse items-center gap-0.5 rounded-2xl border border-warm-ivory py-2.5 lg:w-[72px] lg:flex-none"
        >
          <dt className="font-label text-[11px] uppercase leading-[14px] tracking-[0.08em]">{p.label}</dt>
          <dd className="font-label text-[30px] tabular-nums leading-none">
            {p.value === null ? "--" : String(p.value).padStart(2, "0")}
          </dd>
        </div>
      ))}
    </dl>
  );
}
