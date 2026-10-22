import { setRequestLocale } from "next-intl/server";
import {
  Button,
  EventCard,
  Field,
  Keyhole,
  StatusBadge,
  Swatch,
  TicketPass,
} from "@/components/ui";

const colors = [
  { name: "Cosmic Black", hex: "#090A10", className: "bg-cosmic-black" },
  { name: "Deep Indigo", hex: "#202052", className: "bg-deep-indigo" },
  { name: "Warm Ivory", hex: "#F3E9D5", className: "bg-warm-ivory" },
  { name: "Solar Copper", hex: "#E66C3F", className: "bg-solar-copper" },
  { name: "Copper deep ❓", hex: "#A8451A", className: "bg-copper-deep" },
  { name: "Ultraviolet", hex: "#7655FF", className: "bg-ultraviolet" },
];

function Section({
  id,
  title,
  light,
  children,
}: {
  id: string;
  title: string;
  light?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`${light ? "section-light" : "bg-deep-indigo"} rounded-card px-5 py-10 md:px-12 md:py-16`}
    >
      <h2 className="mb-10 font-title text-4xl md:text-5xl">{title}</h2>
      {children}
    </section>
  );
}

export default async function DesignPage({ params }: PageProps<"/[locale]/design">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:space-y-8 md:py-10">
      <header className="relative overflow-hidden rounded-card bg-deep-indigo px-5 pb-14 pt-16 md:px-12 md:pb-20 md:pt-28">
        <Keyhole className="absolute -right-10 top-10 h-[120%] text-cosmic-black/40 md:right-20" />
        <p className="relative font-label text-sm uppercase tracking-widest text-solar-copper">
          Design system · démo
        </p>
        <h1 className="relative mt-4 max-w-4xl font-title text-6xl leading-[1.02] md:text-8xl">
          Passe le <span className="accent-word">portail</span>
        </h1>
        <p className="relative mt-6 max-w-xl text-lg text-warm-ivory/80">
          Tokens, typographie et composants de LA TEUF ÉLECTRONIQUE.
        </p>
        <div className="relative mt-8 flex flex-wrap gap-3">
          <Button>Billets</Button>
          <Button variant="secondary">Voir l&apos;agenda</Button>
        </div>
      </header>

      <Section id="couleurs" title="Couleurs">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
          {colors.map((c) => (
            <Swatch key={c.name} {...c} />
          ))}
        </div>
      </Section>

      <Section id="typo" title="Typographie">
        <div className="space-y-8">
          <div>
            <p className="font-label text-xs uppercase tracking-widest text-warm-ivory/60">
              Tropic Ground · H1 hero
            </p>
            <p className="font-display text-5xl md:text-7xl">
              Libre, chaleureux, <span className="accent-word">mystérieux</span>
            </p>
          </div>
          <div>
            <p className="font-label text-xs uppercase tracking-widest text-warm-ivory/60">
              ATP Dizzy · titres de section
            </p>
            <p className="font-title text-4xl md:text-5xl">Prochains rendez-vous</p>
          </div>
          <div>
            <p className="font-label text-xs uppercase tracking-widest text-warm-ivory/60">
              Anton · dates, prix, boutons
            </p>
            <p className="font-label text-5xl uppercase text-solar-copper">20 Nov · 5 000 FCFA</p>
          </div>
          <div>
            <p className="font-label text-xs uppercase tracking-widest text-warm-ivory/60">
              Pain de Mie · texte courant
            </p>
            <p className="max-w-xl">
              LA TEUF est un rendez-vous festif de musique électronique à Lomé. Il invite
              amateurs et curieux à sortir de leur routine, dans un cadre confortable et
              décontracté.
            </p>
          </div>
        </div>
      </Section>

      <Section id="boutons" title="Boutons et statuts">
        <div className="flex flex-wrap items-center gap-4">
          <Button>Billets</Button>
          <Button variant="secondary">Secondaire</Button>
          <Button variant="ghost">Contour</Button>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <StatusBadge status="bientot" />
          <StatusBadge status="en-vente" />
          <StatusBadge status="complet" />
          <StatusBadge status="termine" />
        </div>
      </Section>

      <Section id="evenements" title="Cartes événement">
        <div className="grid gap-6 md:grid-cols-3">
          <EventCard date="20 Nov" title="LA TEUF au KARMA" place="Lomé, Togo" status="en-vente" />
          <EventCard date="12 Déc" title="Édition Cotonou" place="Cotonou, Bénin" status="bientot" />
          <EventCard date="Oct" title="Archives" place="Lomé, Togo" status="termine" />
        </div>
      </Section>

      <Section id="formulaires" title="Formulaires">
        <div className="grid max-w-xl gap-4">
          <Field label="Nom complet" />
          <Field label="Email" />
          <Field label="WhatsApp" error="Numéro invalide" />
          <Button className="w-fit">Payer avec Kkiapay</Button>
        </div>
      </Section>

      <Section id="billet" title="Billet" light>
        <div className="rounded-card bg-cosmic-black p-6 md:p-12">
          <TicketPass />
        </div>
      </Section>

      <Section id="ivory" title="Section Ivory" light>
        <p className="max-w-2xl">
          Texte Deep Indigo sur Warm Ivory, avec un <span className="accent-word">accent</span> en
          Copper deep pour garder un contraste lisible.
        </p>
        <div className="mt-6">
          <Button variant="secondary">Lire la suite</Button>
        </div>
      </Section>
    </main>
  );
}
