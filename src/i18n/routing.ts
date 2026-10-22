import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  // FR sans préfixe (/), EN en /en
  localePrefix: "as-needed",
});
