import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Section } from "@/components/section";

const photos = ["01", "02", "03", "04", "05", "06"];

export async function Gallery() {
  const t = await getTranslations("Gallery");
  const alts = t.raw("alt") as string[];

  return (
    <Section id="galerie" light className="scroll-mt-24">
      <h2 className="mb-10 font-title text-4xl md:text-6xl">{t("title")}</h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
        {photos.map((id, i) => (
          <li key={id} className="relative aspect-[4/5] overflow-hidden rounded-card bg-deep-indigo">
            <Image
              src={`/images/gallery/${id}.jpg`}
              alt={alts[i] ?? ""}
              fill
              sizes="(min-width: 1152px) 360px, (min-width: 768px) 33vw, 50vw"
              className="object-cover"
            />
          </li>
        ))}
      </ul>
    </Section>
  );
}
