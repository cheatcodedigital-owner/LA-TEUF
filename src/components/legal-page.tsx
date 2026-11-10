import { getTranslations } from "next-intl/server";
import { Band } from "@/components/ds/band";
import { Flip } from "@/components/ds/flip";
import { PageHeader } from "@/components/ds/page-header";
import { Reveals } from "@/components/ds/slush-motion";
import { CONTACT_EMAIL, CONTACT_PHONE } from "@/components/layout/nav-items";

type Sections = { title: string; body: string[] }[];
type Namespace = "Cgv" | "LegalNotice" | "Privacy";

const slug = (i: number) => `section-${i + 1}`;

/**
 * Page légale (gabarit T4, maquettes CGV, mentions légales, confidentialité) : en-tête avec le seul surtitre
 * autorisé (« Informations légales »), sommaire collant + texte de 720 px sur bande Ivoire, bande Violet de contact.
 * Vouvoiement, sans sticker ni bande géante.
 */
export async function LegalPage({ namespace }: { namespace: Namespace }) {
  const t = await getTranslations(namespace);
  const tl = await getTranslations("Legal");
  const sections = t.raw("sections") as Sections;

  return (
    <>
      <PageHeader title={t("title")} surtitle={tl("surtitle")}>
        <p data-load-stagger className="font-label text-[13px] uppercase tracking-[0.04em] md:text-[14px]">
          {t("updated")}
        </p>
      </PageHeader>

      <Band duo="ivoire" className="flex flex-col gap-10 px-5 py-8 md:flex-row md:gap-14 md:px-12 md:py-14">
        <nav aria-label={tl("toc")} className="md:sticky md:top-24 md:w-[220px] md:shrink-0 md:self-start">
          <p className="border-b border-cosmic-black pb-2 font-label text-[12px] uppercase tracking-[0.08em] text-copper-deep">{tl("toc")}</p>
          <ol>
            {sections.map((s, i) => (
              <li key={s.title}>
                <a
                  href={`#${slug(i)}`}
                  className="block border-b border-cosmic-black py-2.5 font-label text-[13px] uppercase leading-4 tracking-[0.02em] transition-colors hover:text-copper-deep"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="flex max-w-[720px] flex-col gap-10">
          {sections.map((s, i) => (
            <article key={s.title} id={slug(i)} className="scroll-mt-28">
              <h2 className="font-title text-[26px] leading-[110%] md:text-[32px]">{s.title}</h2>
              <div className="mt-4 flex flex-col gap-3 font-body text-[16px] leading-[160%] md:text-[17px]">
                {s.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </Band>

      <Band duo="violet" className="flex flex-col gap-6 px-5 py-8 md:flex-row md:items-end md:justify-between md:px-12 md:py-12">
        <div className="flex flex-col gap-3">
          <h2 data-heading-reveal className="max-w-[640px] font-title text-[36px] leading-[100%] md:text-[56px]">
            {tl(`ctaTitle.${namespace}`)}
          </h2>
          <p className="font-body text-[15px] leading-[150%]">{tl("ctaText", { email: CONTACT_EMAIL, phone: CONTACT_PHONE.display })}</p>
        </div>
        <div data-reveal-up className="flex flex-col gap-3 sm:flex-row">
          <Flip href="/contact" tone="outlineDark" size="h-[52px] px-7 text-[15px]">
            {tl("ctaContact")}
          </Flip>
          <Flip href="/faq" tone="ivory" size="h-[52px] px-7 text-[15px]">
            {tl("ctaFaq")}
          </Flip>
        </div>
      </Band>
      <Reveals />
    </>
  );
}
