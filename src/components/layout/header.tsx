"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitch } from "./language-switch";
import { MenuButton, MenuPanel } from "./mobile-menu";
import { navItems } from "./nav-items";

export function Header() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  // Fond opaque après quelques pixels de scroll ; la barre reste toujours visible
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-500 ease-out motion-reduce:transition-none ${
        scrolled || menuOpen ? "bg-cosmic-black" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label={t("home")} className="shrink-0">
          <Image src="/brand/logo-blanc.svg" alt="LA TEUF" width={56} height={55} priority />
        </Link>

        <nav aria-label={t("mainNav")} className="hidden items-center gap-1 lg:flex">
          {navItems.map(({ key, href }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={key}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`w-[6.25rem] rounded-full py-2 text-center font-label text-sm uppercase tracking-wider transition-colors hover:text-solar-copper ${
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
    </header>
    <MenuPanel open={menuOpen} onOpenChange={setMenuOpen} menuId={menuId} />
    </>
  );
}
