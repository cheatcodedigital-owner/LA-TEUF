"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LanguageSwitch({ className = "" }: { className?: string }) {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div role="group" aria-label={t("language")} className={`flex items-center gap-1 ${className}`}>
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === locale}
          onClick={() => router.replace(pathname, { locale: l })}
          className={`min-h-11 min-w-11 rounded-full px-3 font-label text-sm uppercase tracking-wider transition-colors ${
            l === locale ? "bg-warm-ivory text-cosmic-black" : "text-warm-ivory/70 hover:text-warm-ivory"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
