import { getTranslations } from "next-intl/server";
import { socials } from "@/components/layout/nav-items";
import { Band } from "@/components/ds/band";
import { Flip } from "@/components/ds/flip";
import { InstagramIcon, TikTokIcon, WhatsAppIcon } from "@/components/ds/icons";
import { Sticker } from "@/components/ds/sticker";

const href = (label: string) => socials.find((s) => s.label === label)?.href ?? "#";

const networks = [
  { name: "Instagram", Icon: InstagramIcon, wide: false },
  { name: "TikTok", Icon: TikTokIcon, wide: false },
  { name: "WhatsApp", Icon: WhatsAppIcon, wide: true },
] as const;

/** P10 Communauté (Nuit) : 3 cartes réseaux et bloc « prochaines dates » (groupe WhatsApp) */
export async function Community() {
  const t = await getTranslations("Home.community");
  const sub = { Instagram: socials[0].handle, TikTok: t("tiktok"), WhatsApp: t("whatsapp") };
  return (
    <Band
      duo="nuit"
      line="border-warm-ivory/25"
      id="communaute"
      className="scroll-mt-4 px-3 pb-3 pt-28 md:px-8 md:pb-8 md:pt-[72px]"
    >
      <h2 data-heading-reveal className="pb-8 text-center font-title text-[36px] leading-none tracking-[-0.02em] md:pb-10 md:text-[48px]">
        {t.rich("title", { accent: (c) => <span className="text-solar-copper">{c}</span> })}
      </h2>
      <Sticker
        src="/stickers/soleil.png"
        rotate={-10}
        width={360}
        height={360}
        className="left-1/2 top-6 size-20 -translate-x-1/2 md:left-auto md:right-[12%] md:top-6 md:size-24 md:translate-x-0 lg:right-[15%] lg:top-10 lg:size-[140px]"
      />

      <div data-card-reveal="wrap" className="grid grid-cols-2 gap-3 lg:flex">
        {networks.map(({ name, Icon, wide }) => (
          <a
            key={name}
            data-card-reveal="card"
            href={href(name)}
            target="_blank"
            rel="noopener noreferrer"
            className={`press flex gap-4 rounded-[24px] border border-cosmic-black bg-warm-ivory p-5 text-deep-indigo lg:h-[240px] lg:flex-1 lg:flex-col lg:items-stretch lg:justify-between lg:p-7 ${
              wide ? "col-span-2 flex-row items-center" : "flex-col justify-between"
            }`}
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-cosmic-black bg-solar-copper text-cosmic-black lg:size-14">
              <Icon className="size-6" stroke={1.6} />
            </span>
            <span className="flex flex-col gap-1.5">
              <span className="font-title text-[24px] leading-none lg:text-[32px]">{name}</span>
              <span className="font-label text-[12px] uppercase leading-[16px] tracking-[0.04em] text-copper-deep lg:text-[15px] lg:leading-[18px]">
                {sub[name]}
              </span>
            </span>
          </a>
        ))}
      </div>

      <div className="mt-3 flex flex-col items-center gap-6 rounded-[24px] border border-warm-ivory bg-violet-deep px-4 py-10 md:gap-7 md:px-8 md:py-14">
        <h3 data-heading-reveal className="max-w-[720px] text-center font-title text-[28px] leading-[105%] md:text-[48px]">
          {t("newsTitle")}
        </h3>
        {/* Pas encore de lettre d'information : les annonces passent par le groupe WhatsApp */}
        <div data-reveal-up>
          <Flip href={href("WhatsApp")} external tone="ivory" size="h-[52px] px-8 text-[15px]">
            <WhatsAppIcon className="size-5" stroke={1.6} />
            {t("newsCta")}
          </Flip>
        </div>
        <p className="max-w-[520px] text-center font-body text-[14px] leading-[145%] text-violet-pale">{t("newsNote")}</p>
      </div>
    </Band>
  );
}
