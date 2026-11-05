import { getTranslations } from "next-intl/server";
import { DimensionalSwitchSlider } from "./dimensional-switch-slider";

// Section « ambiance » affichée uniquement sur mobile, avant le concept : 3 vidéos verticales
// qui basculent en 3D au défilement, chacune avec un morceau de la phrase.
// Le 2e morceau (« électrique ») porte l'accent Copper.
export async function Ambiance() {
  const t = await getTranslations("Ambiance");
  const parts = t.raw("parts") as string[];
  const slides = parts.map((text, i) => ({
    text,
    video: `/videos/ambiance-slide-${i + 1}.mp4`,
    poster: `/videos/ambiance-slide-${i + 1}.jpg`,
    accent: i === 1,
  }));
  return <DimensionalSwitchSlider slides={slides} label={t("label")} />;
}
