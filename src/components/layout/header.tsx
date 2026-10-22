"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitch } from "./language-switch";
import { MenuButton, MenuPanel } from "./mobile-menu";
import { navItems } from "./nav-items";

export function Header() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [hovered, setHovered] = useState<string | null>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const [pillReady, setPillReady] = useState(false);
  const activeKey = navItems.find(({ href }) => pathname.startsWith(href))?.key ?? null;
  // La capsule suit le survol/focus, sinon se repose sur la page active
  const targetKey = hovered ?? activeKey;

  const placePill = useCallback(() => {
    const el = targetKey ? itemRefs.current[targetKey] : null;
    setPill(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    // Pas d'animation du tout premier placement (évite un glissement depuis 0)
    if (el) requestAnimationFrame(() => setPillReady(true));
  }, [targetKey]);

  useEffect(() => {
    placePill();
    window.addEventListener("resize", placePill);
    return () => window.removeEventListener("resize", placePill);
  }, [placePill]);


  return (
    <>
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40">
      {/* Barre flottante détachée du hero, visible dès le haut de page */}
      <div className="mx-auto max-w-6xl px-4">
      <div
        className={`liquid-glass pointer-events-auto mt-2 flex h-14 items-center justify-between gap-4 rounded-full px-3 md:px-4 ${
          menuOpen ? "liquid-glass-solid" : ""
        }`}
      >
        <Link href="/" aria-label={t("home")} className="shrink-0">
          <Image src="/brand/logo-blanc.svg" alt="LA TEUF" width={41} height={40} priority />
        </Link>

        <nav
          aria-label={t("mainNav")}
          className="relative hidden items-center gap-1 lg:flex"
          onMouseLeave={() => setHovered(null)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setHovered(null);
          }}
        >
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 left-0 rounded-full bg-deep-indigo ease-(--ease-wave) motion-reduce:transition-none ${
              pillReady ? "transition-[transform,width,opacity] duration-500" : ""
            } ${pill ? (hovered ? "opacity-100" : "opacity-60") : "opacity-0"}`}
            style={{ width: pill?.width ?? 0, transform: `translateX(${pill?.left ?? 0}px)` }}
          />
          {navItems.map(({ key, href }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={key}
                href={href}
                ref={(el) => {
                  itemRefs.current[key] = el;
                }}
                onMouseEnter={() => setHovered(key)}
                onFocus={() => setHovered(key)}
                aria-current={active ? "page" : undefined}
                className={`relative w-[6.25rem] rounded-full py-2 text-center font-label text-sm uppercase tracking-wider transition-colors ${
                  active ? "text-solar-copper" : "text-warm-ivory"
                }`}
              >
                {t(key)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitch className="hidden lg:flex" />
          <Link
            href="/evenements"
            className="hover-glow inline-flex min-h-11 w-28 items-center justify-center rounded-full bg-solar-copper font-label text-sm uppercase tracking-wider text-cosmic-black"
          >
            {t("tickets")}
          </Link>
          <MenuButton open={menuOpen} onOpenChange={setMenuOpen} menuId={menuId} />
        </div>
      </div>
      </div>
    </header>
    <MenuPanel open={menuOpen} onOpenChange={setMenuOpen} menuId={menuId} />
    </>
  );
}
