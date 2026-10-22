import { getTranslations } from "next-intl/server";
import { getEventViews, getShowcaseLabels } from "@/components/events/event-views";
import { EventsShowcase } from "@/components/events/events-showcase";
import { Section } from "@/components/section";
import { ButtonLink } from "@/components/ui";
import { upcomingEvents } from "@/data/events";

export async function Upcoming() {
  const t = await getTranslations("HomeEvents");
  const [views, labels] = await Promise.all([getEventViews(upcomingEvents), getShowcaseLabels()]);

  return (
    <Section id="rendez-vous" className="scroll-mt-24">
      <h2 className="mb-10 font-title text-4xl md:text-6xl">{t("title")}</h2>
      <EventsShowcase events={views} labels={labels} />
      <div className="mt-10">
        <ButtonLink href="/evenements" variant="secondary" className="w-56 px-0">
          {t("all")}
        </ButtonLink>
      </div>
    </Section>
  );
}
