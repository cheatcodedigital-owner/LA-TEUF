import Image from "next/image";
import { Band } from "@/components/ds/band";
import { Flip } from "@/components/ds/flip";
import { ticketsHref } from "@/components/ds/links";
import { Sticker } from "@/components/ds/sticker";

type DateCard = {
  date: string;
  place: string;
  name: string;
  text: string;
  price: string;
  cta: { label: string; mobileLabel?: string; href: string; primary: boolean };
  badge: { label: string; onSale: boolean };
  img: string;
  imgAlt: string;
  infoBg: string;
  /** Détails affichés au survol du visuel (web) */
  hover: { title: string; text: string; genres?: string; lineup: { name: string; photo: string; bg: string }[] };
  sticker: { src: string; className: string; rotate: number };
  reverse?: boolean;
};

const dates: DateCard[] = [
  {
    date: "Ven. 20 nov",
    place: "Lomé · Togo",
    name: "Karma",
    text: "Édition rooftop qui introduit la connexion entre les DJs électroniques de la scène togolaise et béninoise",
    price: "Dès 5 000 FCFA",
    cta: { label: "Billets", mobileLabel: "Prendre mon billet", href: ticketsHref, primary: true },
    badge: { label: "En vente", onSale: true },
    img: "/apercu/date-karma.jpg",
    imgAlt: "La cabine DJ LA TEUF dans la fumée bleue",
    infoBg: "bg-warm-ivory",
    hover: {
      title: "Une nouvelle expérience électronique qui fait vibrer les frontières !",
      text: "2 scènes, une seule piste, une même énergie pour célébrer la musique électronique et la connexion entre Lomé et Cotonou.",
      genres: "House, Afro House, Afro Tech, SA Tech",
      lineup: [
        { name: "Shayn", photo: "/apercu/dj-shayn.png", bg: "bg-copper-pale" },
        { name: "AK2M", photo: "/apercu/dj-ak2m.png", bg: "bg-violet-pale" },
        { name: "Wafa", photo: "/apercu/dj-wafa.png", bg: "bg-solar-copper" },
        { name: "Famouz", photo: "/apercu/dj-famouz.png", bg: "bg-warm-ivory" },
      ],
    },
    sticker: { src: "/stickers/dj-karma.png", className: "right-6 top-3 size-[190px]", rotate: 6 },
  },
  {
    date: "Sam. 12 déc",
    place: "Cotonou · Bénin",
    name: "Zone 5 Plage",
    text: "Line-up et tarifs annoncés bientôt. Inscris-toi pour être prévenu en premier.",
    price: "Tarifs à venir",
    cta: { label: "Me prévenir", href: "#communaute", primary: false },
    badge: { label: "Bientôt", onSale: false },
    img: "/apercu/date-zone5.jpg",
    imgAlt: "Une teufeuse sur la terrasse d'une soirée LA TEUF",
    infoBg: "bg-copper-pale",
    hover: {
      title: "Rendez-vous à Cotonou",
      text: "Line-up et tarifs annoncés bientôt. Inscris-toi pour être prévenu en premier.",
      lineup: [],
    },
    sticker: { src: "/stickers/palmiers.png", className: "right-4 top-7 size-[140px]", rotate: -8 },
    reverse: true,
  },
];

function Row({ d }: { d: DateCard }) {
  return (
    <article data-card-reveal="wrap" className={`flex flex-col gap-3 lg:h-[440px] ${d.reverse ? "lg:flex-row-reverse" : "lg:flex-row"}`}>
      {/* Visuel : au survol (web), voile Cosmic Black 82 %, description puis grille des DJs, contour en lueur UV */}
      <div data-card-reveal="card" className="group relative aspect-[4/3] overflow-hidden rounded-[24px] border border-cosmic-black transition-[box-shadow,border-color] duration-300 hover:border-ultraviolet hover:shadow-glow lg:aspect-auto lg:min-w-0 lg:grow-[1.15] lg:basis-0">
        <Image src={d.img} alt={d.imgAlt} fill sizes="(min-width: 1024px) 720px, 100vw" className="object-cover" />
        <div className="absolute inset-0 hidden flex-col justify-between bg-cosmic-black/82 px-7 pb-6 pt-[72px] text-warm-ivory opacity-0 transition-[opacity,translate] duration-300 [translate:0_12px] group-hover:opacity-100 group-hover:[translate:0_0] motion-reduce:translate-none motion-reduce:transition-opacity lg:flex">
          <div className="flex max-w-[560px] flex-col gap-3">
            <p className="font-title text-[24px] leading-[105%]">{d.hover.title}</p>
            <p className="font-body text-[16px] leading-[150%]">{d.hover.text}</p>
          </div>
          {d.hover.lineup.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              <p className="font-label text-[13px] uppercase leading-4 tracking-[0.12em] text-solar-copper">Line-up · {d.hover.genres}</p>
              <ul className="flex gap-2.5">
                {d.hover.lineup.map((dj) => (
                  <li key={dj.name} className={`relative h-[150px] min-w-0 flex-1 overflow-hidden rounded-2xl border border-warm-ivory ${dj.bg}`}>
                    <Image src={dj.photo} alt={dj.name} fill sizes="160px" className="object-cover object-top" />
                    <span className="absolute bottom-2 left-2 flex h-6 items-center rounded-full bg-cosmic-black px-2.5 font-label text-[12px] uppercase leading-4 tracking-[0.04em]">
                      {dj.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="font-label text-[15px] uppercase tracking-[0.04em] text-violet-pale">Line-up annoncé bientôt</p>
          )}
        </div>
        <p
          className={`absolute top-5 flex h-[30px] items-center gap-1.5 rounded-full border border-cosmic-black px-3 font-label text-[13px] uppercase leading-4 tracking-[0.04em] ${
            d.badge.onSale ? "left-5 bg-solar-copper text-cosmic-black" : "right-5 bg-violet-pale text-deep-indigo"
          }`}
        >
          {d.badge.onSale && <span className="size-[7px] rounded-full bg-cosmic-black" />}
          {d.badge.label}
        </p>
      </div>

      <div
        data-card-reveal="card"
        className={`relative flex flex-col justify-between gap-3.5 rounded-[24px] border border-cosmic-black p-5 text-deep-indigo md:gap-6 md:p-8 lg:grow lg:basis-0 ${d.infoBg}`}
      >
        {/* Mobile (maquette) : lieu à droite de la date ; grand écran : lieu sous la date */}
        <div className="flex items-baseline justify-between gap-3 md:flex-col md:items-start md:justify-start md:gap-1.5">
          <p className="font-label text-[32px] uppercase leading-none text-copper-deep md:text-[48px]">{d.date}</p>
          <p className="font-label text-[14px] uppercase leading-5 tracking-[0.04em] md:text-[16px]">{d.place}</p>
        </div>
        <div className="flex flex-col gap-3.5">
          <h3 className="font-label text-[48px] leading-[95%] tracking-[-0.02em] md:text-[56px] lg:text-[72px]">{d.name}</h3>
          <p className="hidden max-w-[560px] font-label text-[17px] uppercase leading-[150%] md:block">{d.text}</p>
        </div>
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="font-label text-[17px] sm:text-[20px] uppercase leading-6 tracking-[-0.02em] text-cosmic-black">{d.price}</p>
          <Flip href={d.cta.href} tone={d.cta.primary ? "copper" : "outlineLight"} size="h-[52px] px-6 text-[15px] sm:h-12" className={`w-full sm:w-auto ${d.cta.primary ? "[&_.flip-front]:border [&_.flip-front]:border-cosmic-black" : ""}`}>
            {d.cta.mobileLabel ? (
              <>
                <span className="sm:hidden">{d.cta.mobileLabel}</span>
                <span className="hidden sm:inline">{d.cta.label}</span>
              </>
            ) : (
              d.cta.label
            )}
          </Flip>
        </div>
        <Sticker {...d.sticker} width={480} height={480} className={`hidden lg:block ${d.sticker.className}`} />
      </div>
    </article>
  );
}

export function Dates() {
  return (
    <Band duo="lilas" className="px-3 pb-3 pt-8 md:px-8 md:pb-8 md:pt-12">
      {/* Calendrier collé au titre, centré sur sa hauteur (maquette) ; au-dessus du titre sur mobile, faute de place */}
      <div className="flex flex-col items-center gap-2 pb-8 md:flex-row md:justify-center md:gap-5 md:pb-10">
        <h2 data-heading-reveal className="text-center font-title text-[36px] leading-none tracking-[-0.02em] md:text-[48px]">
          Prochains rendez-vous
        </h2>
        <Sticker
          src="/stickers/calendrier.png"
          rotate={8}
          width={360}
          height={360}
          inFlow
          className="order-first block size-20 shrink-0 md:order-none md:size-[110px]"
        />
      </div>
      <div className="flex flex-col gap-3">
        {dates.map((d) => (
          <Row key={d.name} d={d} />
        ))}
      </div>
    </Band>
  );
}
