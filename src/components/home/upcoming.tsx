import { getTranslations } from "next-intl/server";
import { getEventViews, getShowcaseLabels } from "@/components/events/event-views";
import { EventsDeck } from "@/components/events/events-deck";
import { Reveal } from "@/components/reveal";
import { Section } from "@/components/section";
import { upcomingEvents } from "@/data/events";
import { AmbianceVideo } from "./ambiance-video";

export async function Upcoming() {
  const t = await getTranslations("HomeEvents");
  const [views, labels] = await Promise.all([getEventViews(upcomingEvents), getShowcaseLabels()]);

  return (
    <Section id="rendez-vous" className="relative isolate scroll-mt-24 overflow-x-clip">
      <AmbianceVideo />
      <Reveal>
        <h2 className="mb-8 font-title text-4xl md:text-6xl">{t("title")}</h2>
      </Reveal>
      <Reveal delay={120}>
        <EventsDeck events={views} labels={labels} />
      </Reveal>
    </Section>
  );
}
