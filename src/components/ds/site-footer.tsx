import Image from "next/image";
import { useTranslations } from "next-intl";
import { CONTACT_EMAIL, CONTACT_PHONE, socials } from "@/components/layout/nav-items";
import { Link } from "@/i18n/navigation";
import { Flip } from "./flip";
import { ArrowUpRight, socialIcons } from "./icons";
import { ticketsHref } from "./links";
import { Sticker } from "./sticker";

/* Bande géante LA TEUF + footer v2 (DESIGN.md §7.5, patterns P11 et C6 dans Paper) */

function WordmarkGroup() {
  const circle = "flex size-24 shrink-0 items-center justify-center rounded-full border border-cosmic-black lg:size-[180px]";
  const word =
    "flex h-24 shrink-0 items-center rounded-full border border-cosmic-black px-6 font-title text-[76px] leading-none tracking-[-0.02em] text-cosmic-black lg:h-[180px] lg:px-12 lg:text-[150px]";
  return (
    <div className="flex shrink-0 items-center gap-2 pr-2">
      <span className={`${circle} bg-ultraviolet`}>
        <Image src="/brand/logo-badge.svg" alt="" width={100} height={100} unoptimized className="size-[52px] lg:size-[100px]" />
      </span>
      <span className={`${word} bg-solar-copper`}>LA TEUF</span>
      <span className={`${circle} bg-violet-pale`}>
        <Image src="/brand/logo-badge.svg" alt="" width={100} height={100} unoptimized className="size-[52px] lg:size-[100px]" />
      </span>
      <span className={`${word} bg-warm-ivory`}>LA TEUF</span>
    </div>
  );
}

/** Bande géante qui défile avant le footer (pas sur les pages de contenu, T4) */
export function GiantBand() {
  return (
    <div className="overflow-hidden" aria-hidden>
      <div className="flex w-max animate-marquee-slow">
        <WordmarkGroup />
        <WordmarkGroup />
      </div>
    </div>
  );
}

const tileBg = { Instagram: "bg-solar-copper", TikTok: "bg-violet-pale", WhatsApp: "bg-copper-pale" } as const;

export function SiteFooter() {
  const t = useTranslations("Footer");
  const tn = useTranslations("Nav");

  const columns = [
    {
      title: t("colParty"),
      links: [
        { label: tn("events"), href: "/evenements" },
        { label: tn("djs"), href: "/djs" },
        { label: tn("gallery"), href: "/galerie" },
      ],
    },
    {
      title: t("colHelp"),
      links: [
        { label: tn("faq"), href: "/faq" },
        { label: tn("contact"), href: "/contact" },
        { label: t("terms"), href: "/cgv" },
      ],
    },
  ];
  const tiles = socials.filter((s) => s.label !== "Linktree");
  const colTitle = "font-label text-[13px] uppercase leading-4 tracking-[0.08em] text-copper-deep";
  const colLink = "font-label text-[18px] uppercase leading-6 transition-colors hover:text-copper-deep md:text-[20px]";

  return (
    <footer className="flex flex-col gap-2 lg:flex-row">
      <div className="relative flex flex-col justify-between gap-10 rounded-[24px] border border-warm-ivory bg-deep-indigo p-6 text-warm-ivory md:p-9 lg:grow lg:basis-0">
        <Image src="/brand/logo-pastille.svg" alt="LA TEUF" width={96} height={96} unoptimized className="size-16 md:size-24" />
        <div className="flex flex-col gap-5">
          <p data-heading-reveal className="font-label text-[30px] uppercase leading-[105%] md:text-[44px]">
            {t("brand")}
          </p>
          <Flip href={ticketsHref} tone="copper" size="h-12 px-6 text-[15px]" className="self-stretch sm:self-start">
            {tn("ticketsCta")}
          </Flip>
        </div>
        <Sticker src="/stickers/etoiles.png" rotate={-8} className="right-6 top-5 size-20 md:right-9 md:top-7 md:size-[150px]" />
      </div>

      <div className="flex flex-col gap-2 lg:grow-[1.4] lg:basis-0">
        <ul aria-label={t("socials")} data-card-reveal="wrap" className="grid grid-cols-3 gap-2">
          {tiles.map((s) => {
            const Icon = socialIcons[s.label as keyof typeof socialIcons];
            return (
              <li key={s.label} data-card-reveal="card">
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`press relative flex h-[130px] flex-col justify-between gap-4 rounded-[24px] border border-cosmic-black p-3 text-cosmic-black md:h-[260px] md:p-6 ${tileBg[s.label as keyof typeof tileBg]}`}
                >
                  <Icon className="size-12 md:size-[104px]" />
                  <span className="flex flex-col gap-1">
                    <span className="font-label text-[14px] uppercase leading-none md:text-[24px] md:leading-[34px]">{s.label}</span>
                    <span className="hidden font-body text-[15px] leading-5 md:block">{s.handle ?? t("whatsappSub")}</span>
                  </span>
                  <ArrowUpRight className="absolute right-6 top-6 hidden size-7 md:block" />
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col justify-between gap-6 rounded-[24px] bg-warm-ivory p-5 text-cosmic-black md:p-7 lg:grow">
          <div className="grid grid-cols-2 gap-6 md:flex md:items-start md:gap-14">
            {columns.map((col) => (
              <nav key={col.title} aria-label={col.title} className="flex flex-col gap-2.5">
                <p className={colTitle}>{col.title}</p>
                {col.links.map((l) => (
                  <Link key={l.href} href={l.href} className={colLink}>
                    {l.label}
                  </Link>
                ))}
              </nav>
            ))}
            <div className="col-span-2 flex flex-col gap-2.5 md:grow md:items-end">
              <p className={colTitle}>{t("writeUs")}</p>
              <a href={`mailto:${CONTACT_EMAIL}`} className={`${colLink} break-all`}>
                {CONTACT_EMAIL}
              </a>
              <a href={`tel:${CONTACT_PHONE.tel}`} className={colLink}>
                {CONTACT_PHONE.display}
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-cosmic-black pt-4 font-body text-[14px] leading-[18px] text-deep-indigo md:flex-row md:items-center md:justify-between">
            <p>{t("copyright")}</p>
            <div className="flex gap-5">
              <Link href="/mentions-legales" className="hover:underline">
                {t("legal")}
              </Link>
              <Link href="/confidentialite" className="hover:underline">
                {t("privacy")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
