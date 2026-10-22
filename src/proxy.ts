import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Exclut l'API, les fichiers internes Next/Vercel, l'admin, l'espace influenceur, les liens d'affiliation /r/ et les fichiers statiques
  matcher: "/((?!api|_next|_vercel|admin|influenceur|r/|.*\\..*).*)",
};
