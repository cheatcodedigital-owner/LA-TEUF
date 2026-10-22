import { getTranslations } from "next-intl/server";
import { getEventViews, getShowcaseLabels } from "@/components/events/event-views";
import { EventsDeck } from "@/components/events/events-deck";
import { Reveal } from "@/components/reveal";
import { Section } from "@/components/section";
import { ButtonLink } from "@/components/ui";
import { upcomingEvents } from "@/data/events";

export async function Upcoming() {
  const t = await getTranslations("HomeEvents");
  const [views, labels] = await Promise.all([getEventViews(upcomingEvents), getShowcaseLabels()]);

  return (
    <Section id="rendez-vous" className="scroll-mt-24 overflow-x-clip">
      <Reveal>
        <h2 className="mb-10 font-title text-4xl md:text-6xl">{t("title")}</h2>
      </Reveal>
      <Reveal delay={120}>
        <EventsDeck events={views} labels={labels} hint={t("hint")} />
      </Reveal>
      <Reveal delay={80} className="mt-10">
        <ButtonLink href="/evenements" variant="secondary" className="w-56 px-0">
          {t("all")}
        </ButtonLink>
      </Reveal>
    </Section>
  );
}
