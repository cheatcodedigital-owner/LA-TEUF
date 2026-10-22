import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { navItems, socials } from "./nav-items";

export async function Footer() {
  const t = await getTranslations("Footer");
  const tn = await getTranslations("Nav");

  const heading = "font-label text-sm uppercase tracking-widest text-solar-copper";
  const link = "text-warm-ivory/80 transition-colors hover:text-solar-copper";

  return (
    <footer className="mx-auto max-w-6xl px-4 pb-6 md:pb-10">
      <div className="rounded-card bg-deep-indigo px-5 py-10 md:px-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Image src="/brand/logo-blanc.svg" alt="LA TEUF" width={88} height={86} />
            <p className="mt-5 min-h-28 max-w-xs text-warm-ivory/80">{t("tagline")}</p>
          </div>

          <div>
            <h2 className={heading}>{t("explore")}</h2>
            <ul className="mt-4 space-y-2">
              {navItems.map(({ key, href }) => (
                <li key={key}>
                  <Link href={href} className={link}>
                    {tn(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={heading}>{t("contact")}</h2>
            <ul className="mt-4 space-y-2">
              <li>
                <a href="mailto:hello@lateufelectronic.com" className={link}>
                  hello@lateufelectronic.com
                </a>
              </li>
              <li>
                <a href="tel:+22891950193" className={link}>
                  Shayn · +228 91 95 01 93
                </a>
              </li>
              <li>
                <a href="tel:+22893706242" className={link}>
                  {t("booking")} · +228 93 70 62 42
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className={heading}>{t("follow")}</h2>
            <ul className="mt-4 space-y-2">
              {socials.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className={link}>
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-warm-ivory/15 pt-6 text-sm text-warm-ivory/60 md:flex-row md:items-center md:justify-between">
          <p>
            © 2026 LA TEUF ÉLECTRONIQUE. {t("rights")}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            <li><Link href="/mentions-legales" className={link}>{t("legal")}</Link></li>
            <li><Link href="/cgv" className={link}>{t("terms")}</Link></li>
            <li><Link href="/confidentialite" className={link}>{t("privacy")}</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
