"use client";

import gsap from "gsap";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { navItems, socials } from "@/components/layout/nav-items";
import { upcomingEvents } from "@/data/events";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Flip } from "./flip";
import { CountryFlag } from "./icons";
import { eventPlace, shortDate, ticketsHref } from "./links";
import { getLenis, prefersReducedMotion, registerSlush } from "./slush-motion";

/* Navigation v2 (DESIGN.md §7.1, composant C1 dans Paper) :
   bandeau d'annonce défilant, barre collante transparente façon slush.app, menu mobile plein écran Cuivre. */

const desktopItems = navItems.filter((i) => i.key !== "contact");

function Announce() {
  const t = useTranslations("Nav");
  const ts = useTranslations("Events.status");
  const label = (status: (typeof upcomingEvents)[number]["status"]) => (status === "en-vente" ? t("onSale") : ts(status));
  const group = (
    <div className="flex shrink-0 items-center gap-2.5 pr-2.5">
      {upcomingEvents.map((e) => (
        <span key={e.slug} className="flex items-center gap-2.5">
          <span>{eventPlace(e)}</span>
          <CountryFlag country={e.country} />
          <span>
            · {shortDate(e.startsAt)} — {label(e.status)} ✦
          </span>
        </span>
      ))}
    </div>
  );
  return (
    <>
      <p className="sr-only">
        {t("announce")} :{" "}
        {upcomingEvents.map((e) => `${eventPlace(e)}, ${shortDate(e.startsAt)}, ${label(e.status)}.`).join(" ")}
      </p>
      <div className="h-7 overflow-hidden bg-solar-copper text-cosmic-black md:h-8" aria-hidden>
        <div className="flex h-full w-max animate-marquee items-center whitespace-pre font-label text-[13px] uppercase leading-[18px] tracking-[0.04em] md:text-[14px]">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="contents">
              {group}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function LanguagePill({ variant }: { variant: "bar" | "menu" }) {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const bar = variant === "bar";
  return (
    <div
      role="group"
      aria-label={t("language")}
      className={`flex items-center gap-0.5 rounded-full border px-1 font-label text-[13px] uppercase tracking-[0.04em] ${
        bar ? "h-10 border-warm-ivory bg-cosmic-black" : "h-11 border-cosmic-black"
      }`}
    >
      {routing.locales.map((l) => {
        const current = l === locale;
        return (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={current}
            onClick={() => router.replace(pathname, { locale: l })}
            className={`flex items-center rounded-full px-3 uppercase transition-colors ${bar ? "h-8" : "h-9 px-3.5"} ${
              current
                ? bar
                  ? "bg-warm-ivory text-cosmic-black"
                  : "bg-cosmic-black text-warm-ivory"
                : bar
                  ? "text-warm-ivory hover:text-solar-copper"
                  : "text-cosmic-black"
            }`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

export function SiteHeader() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // Comme slush.app : au défilement vers le bas (après 50 px), les liens remontent hors de l'écran
  // un par un ; ils redescendent dès qu'on remonte. Le logo et « Billets » restent toujours visibles.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || prefersReducedMotion()) return;
    registerSlush();
    const items = nav.querySelectorAll("[data-nav-item]");
    let last = window.scrollY;
    let hidden = false;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 10) return;
      const down = y > last;
      last = y;
      if (down && y > 50 && !hidden) {
        hidden = true;
        gsap.to(items, { yPercent: -300, duration: 0.75, ease: "slush-bounce", stagger: { each: 0.03, from: "start" }, overwrite: true });
      } else if (!down && hidden) {
        hidden = false;
        gsap.to(items, { yPercent: 0, duration: 0.75, ease: "slush-bounce", stagger: { each: 0.03, from: "end" }, overwrite: true });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Menu plein écran : la page derrière ne défile plus et Échap le ferme
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const lenis = getLenis();
    lenis?.stop();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      lenis?.start();
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <a
        href="#contenu"
        className="sr-only z-[60] rounded-full bg-solar-copper px-5 py-3 font-label uppercase text-cosmic-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t("skipToContent")}
      </a>
      <Announce />

      {/* Barre collante, transparente : seuls les boutons (fonds pleins) reçoivent les clics */}
      <header className="pointer-events-none sticky top-0 z-40 flex items-center justify-between px-4 py-4 md:px-10">
        <Link
          href="/"
          aria-label={t("home")}
          className="press pointer-events-auto flex size-12 shrink-0 items-center justify-center rounded-full border border-warm-ivory bg-cosmic-black md:size-14"
        >
          <Image src="/brand/logo-pastille.svg" alt="" width={34} height={34} unoptimized className="size-7 md:size-[34px]" />
        </Link>

        <nav ref={navRef} aria-label={t("mainNav")} className="hidden items-center gap-2 lg:flex">
          {desktopItems.map(({ key, href }) => {
            const active = isActive(href);
            return (
              <div key={key} data-nav-item className="pointer-events-auto">
                <Flip href={href} current={active} tone="nav" size="h-10 px-[18px] text-[14px]">
                  {active && <span aria-hidden className="size-1.5 rounded-full bg-solar-copper" />}
                  {t(key)}
                </Flip>
              </div>
            );
          })}
          <div data-nav-item className="pointer-events-auto">
            <LanguagePill variant="bar" />
          </div>
          <div className="pointer-events-auto">
            <Flip href={ticketsHref} tone="copper" size="h-10 px-[22px] text-[14px]">
              {t("tickets")}
            </Flip>
          </div>
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <div className="pointer-events-auto">
            <Flip href={ticketsHref} tone="copper" size="h-11 px-5 text-[14px]">
              {t("tickets")}
            </Flip>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="menu-site"
            aria-label={t("openMenu")}
            className="press pointer-events-auto flex size-11 shrink-0 items-center justify-center rounded-full border border-warm-ivory bg-cosmic-black text-warm-ivory"
          >
            <svg
              viewBox="0 0 18 18"
              className={`size-[18px] transition-[rotate] duration-500 ease-[cubic-bezier(0.65,0.05,0,1)] ${open ? "rotate-45" : ""}`}
              aria-hidden
            >
              <path d="M9 2v14M2 9h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {/* Menu mobile : toujours monté (rendu hors du <header>), il se déplie du haut vers le bas (.menu-sheet) */}
      <div
        id="menu-site"
        role="dialog"
        aria-modal="true"
        aria-label={t("menu")}
        aria-hidden={!open}
        inert={!open}
        data-open={open || undefined}
        data-lenis-prevent
        className="menu-sheet fixed inset-0 z-50 flex flex-col overflow-y-auto bg-solar-copper text-cosmic-black lg:hidden"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <Link
            href="/"
            aria-label={t("home")}
            onClick={close}
            className="flex size-12 shrink-0 items-center justify-center rounded-full border border-cosmic-black"
          >
            <Image src="/brand/logo-badge.svg" alt="" width={28} height={28} unoptimized className="size-7" />
          </Link>
          <button
            type="button"
            onClick={close}
            aria-label={t("closeMenu")}
            className="press flex size-12 shrink-0 items-center justify-center rounded-full bg-cosmic-black text-warm-ivory"
          >
            <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
              <path d="M4.3 4.3l11.4 11.4M15.7 4.3L4.3 15.7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav aria-label={t("mainNav")} className="flex flex-1 flex-col px-4 pt-4">
          {navItems.map(({ key, href }, i) => (
            <Link
              key={key}
              href={href}
              onClick={close}
              aria-current={isActive(href) ? "page" : undefined}
              className="menu-item group flex items-baseline gap-3.5 border-b border-cosmic-black py-3"
              style={{ "--i": i } as React.CSSProperties}
            >
              <span className="w-7 shrink-0 font-label text-[14px] leading-[18px]">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-title text-[48px] leading-none transition-[translate] duration-500 ease-[cubic-bezier(0.65,0.05,0,1)] group-hover:translate-x-2 group-aria-[current=page]:underline group-aria-[current=page]:decoration-2 group-aria-[current=page]:underline-offset-8">
                {t(key)}
              </span>
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-4 px-4 pb-8 pt-6">
          <div className="menu-item" style={{ "--i": navItems.length } as React.CSSProperties}>
            <Flip href={ticketsHref} onClick={close} tone="blackIvory" size="h-[52px] px-8 text-[15px]" className="w-full">
              {t("ticketsCta")}
            </Flip>
          </div>
          <div className="menu-item flex items-center justify-between" style={{ "--i": navItems.length + 1 } as React.CSSProperties}>
            <div className="flex gap-2">
              {socials
                .filter((s) => s.label !== "Linktree")
                .map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="press flex size-11 items-center justify-center rounded-full border border-cosmic-black font-label text-[12px]"
                  >
                    {s.short}
                  </a>
                ))}
            </div>
            <LanguagePill variant="menu" />
          </div>
        </div>
      </div>
    </>
  );
}
