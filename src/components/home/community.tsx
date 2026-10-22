import { getTranslations } from "next-intl/server";
import { socials } from "@/components/layout/nav-items";
import { Section } from "@/components/section";

const pill =
  "hover-glow inline-flex min-h-11 w-44 items-center justify-center rounded-full py-3.5 font-label text-base uppercase tracking-wider";

export async function Community() {
  const t = await getTranslations("Community");

  return (
    <Section id="contact" className="scroll-mt-24">
      <div className="grid gap-12 md:grid-cols-2 md:gap-16">
        <div>
          <h2 className="font-title text-4xl md:whitespace-nowrap md:text-[clamp(1.75rem,3.6vw,2.75rem)]">{t("title")}</h2>
          <p className="mt-6 max-w-md text-warm-ivory/80">{t("text")}</p>
          <ul className="mt-8 flex flex-wrap gap-3">
            {socials.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${pill} bg-cosmic-black text-warm-ivory`}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-title text-4xl md:whitespace-nowrap md:text-[clamp(1.75rem,3.6vw,2.75rem)]">{t("contactTitle")}</h2>
          <p className="mt-6 max-w-md text-warm-ivory/80">{t("contactText")}</p>
          <ul className="mt-8 flex flex-wrap gap-3">
            <li>
              <a href="mailto:hello@lateufelectronic.com" className={`${pill} bg-solar-copper text-cosmic-black`}>
                {t("email")}
              </a>
            </li>
            <li>
              <a href="tel:+22891950193" className={`${pill} border border-warm-ivory/40 text-warm-ivory`}>
                {t("call")} · Shayn
              </a>
            </li>
            <li>
              <a href="tel:+22893706242" className={`${pill} border border-warm-ivory/40 text-warm-ivory`}>
                {t("booking")} · AK2M
              </a>
            </li>
          </ul>
        </div>
      </div>
    </Section>
  );
}
