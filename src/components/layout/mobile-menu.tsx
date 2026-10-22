"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitch } from "./language-switch";
import { navItems, socials } from "./nav-items";

type MenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuId: string;
};

export function MenuButton({ open, onOpenChange, menuId }: MenuProps) {
  const t = useTranslations("Nav");
  return (
    <button
      type="button"
      aria-label={t("openMenu")}
      aria-expanded={open}
      aria-controls={menuId}
      onClick={() => onOpenChange(true)}
      className="grid size-11 place-items-center rounded-full bg-deep-indigo lg:hidden"
    >
      <span className="flex w-5 flex-col gap-1.5" aria-hidden>
        <span className="h-0.5 rounded bg-warm-ivory" />
        <span className="h-0.5 rounded bg-warm-ivory" />
      </span>
    </button>
  );
}

// Rendu hors du <header> : un parent avec `transform` casserait le `fixed inset-0`
export function MenuPanel({ open, onOpenChange, menuId }: MenuProps) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Ferme à chaque navigation
  useEffect(() => {
    onOpenChange(false);
  }, [pathname, onOpenChange]);

  // Verrouille le scroll, Échap ferme, focus sur le bouton de fermeture
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div className="lg:hidden">
      <div
        id={menuId}
        role="dialog"
        aria-modal="true"
        aria-label={t("mainNav")}
        inert={!open}
        className={`fixed inset-0 z-50 flex flex-col bg-cosmic-black px-6 pb-8 pt-4 transition-[clip-path] duration-700 ease-out motion-reduce:transition-none ${
          open ? "[clip-path:circle(150%_at_90%_5%)]" : "[clip-path:circle(0%_at_90%_5%)]"
        }`}
      >
        <div className="flex justify-end">
          <button
            ref={closeRef}
            type="button"
            aria-label={t("closeMenu")}
            onClick={() => onOpenChange(false)}
            className="grid size-11 place-items-center rounded-full bg-deep-indigo"
          >
            <span className="relative block size-5" aria-hidden>
              <span className="absolute left-0 top-1/2 h-0.5 w-5 rotate-45 rounded bg-warm-ivory" />
              <span className="absolute left-0 top-1/2 h-0.5 w-5 -rotate-45 rounded bg-warm-ivory" />
            </span>
          </button>
        </div>

        <nav className="mt-8 flex flex-1 flex-col justify-center gap-2">
          {navItems.map(({ key, href }) => (
            <Link
              key={key}
              href={href}
              className="font-title text-5xl leading-tight text-warm-ivory transition-colors hover:text-solar-copper"
            >
              {t(key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-between gap-4">
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-warm-ivory/70">
            {socials.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-solar-copper">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <LanguageSwitch />
        </div>
      </div>
    </div>
  );
}
