import { socials } from "@/components/layout/nav-items";
import { Band } from "@/components/ds/band";
import { Flip } from "@/components/ds/flip";
import { InstagramIcon, TikTokIcon, WhatsAppIcon } from "@/components/ds/icons";
import { Sticker } from "@/components/ds/sticker";

const href = (label: string) => socials.find((s) => s.label === label)?.href ?? "#";

const networks = [
  { name: "Instagram", sub: "@la_teuf_electronic", Icon: InstagramIcon, wide: false },
  { name: "TikTok", sub: "Les extraits des soirées", Icon: TikTokIcon, wide: false },
  { name: "WhatsApp", sub: "La communauté, en direct", Icon: WhatsAppIcon, wide: true },
];

export function Community() {
  return (
    <Band
      duo="nuit"
      line="border-warm-ivory/25"
      id="communaute"
      className="scroll-mt-4 px-3 pb-3 pt-28 md:px-8 md:pb-8 md:pt-[72px]"
    >
      <h2 data-heading-reveal className="pb-8 text-center font-title text-[36px] leading-none tracking-[-0.02em] md:pb-10 md:text-[48px]">
        Rejoins la <span className="text-solar-copper">communauté</span>
      </h2>
      <Sticker
        src="/stickers/soleil.png"
        rotate={-10}
        width={360}
        height={360}
        className="left-1/2 top-6 size-20 -translate-x-1/2 md:left-auto md:right-[12%] md:top-6 md:size-24 md:translate-x-0 lg:right-[15%] lg:top-10 lg:size-[140px]"
      />

      <div data-card-reveal="wrap" className="grid grid-cols-2 gap-3 lg:flex">
        {networks.map(({ name, sub, Icon, wide }) => (
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
                {sub}
              </span>
            </span>
          </a>
        ))}
      </div>

      <div className="mt-3 flex flex-col items-center gap-6 rounded-[24px] border border-warm-ivory bg-violet-deep px-4 py-10 md:gap-7 md:px-8 md:py-14">
        <h3 data-heading-reveal className="max-w-[720px] text-center font-title text-[28px] leading-[105%] md:text-[48px]">
          Sois le premier au courant des prochaines dates
        </h3>
        {/* Aperçu : formulaire visuel, l'inscription n'est pas encore branchée */}
        <form data-reveal-up className="flex w-full max-w-[620px] flex-col gap-3 md:h-[60px] md:flex-row md:items-center md:gap-0 md:rounded-full md:border md:border-warm-ivory md:py-1.5 md:pl-6 md:pr-1.5">
          <label htmlFor="apercu-email" className="sr-only">
            Ton e-mail
          </label>
          <input
            id="apercu-email"
            type="email"
            placeholder="Ton e-mail"
            autoComplete="email"
            className="h-12 rounded-full border border-warm-ivory bg-transparent px-5 font-body text-[16px] text-warm-ivory placeholder:text-violet-pale focus-visible:outline-solar-copper md:h-full md:flex-1 md:border-0 md:px-0"
          />
          <Flip tone="ivory" size="h-12 px-6 text-[15px]">
            Je m&apos;inscris
          </Flip>
        </form>
        <p className="text-center font-body text-[14px] leading-[145%] text-violet-pale">Tu peux te désinscrire à tout moment.</p>
      </div>
    </Band>
  );
}
