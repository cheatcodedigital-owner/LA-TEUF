import { Ambiance } from "@/components/apercu/ambiance";
import { Community } from "@/components/apercu/community";
import { Concept } from "@/components/apercu/concept";
import { TicketsBand } from "@/components/apercu/cta";
import { Dates } from "@/components/apercu/dates";
import { Hero } from "@/components/apercu/hero";
import { Reveals } from "@/components/ds/slush-motion";

// Aperçu de l'accueil v2 (maquettes Paper) : les bandes de la page ; l'habillage vient du layout.
// L'accueil public (src/app/[locale]/(v1)/page.tsx) n'est pas encore migré.
export default function ApercuPage() {
  return (
    <>
      <Hero />
      <Ambiance />
      <Concept />
      <Dates />
      <TicketsBand />
      <Community />
      <Reveals />
    </>
  );
}
