export const navItems = [
  { key: "events", href: "/evenements" },
  { key: "djs", href: "/djs" },
  { key: "gallery", href: "/galerie" },
  { key: "faq", href: "/faq" },
  { key: "contact", href: "/contact" },
] as const;

// Partagé par l'ancienne et la nouvelle charte (short : pastille du menu mobile v2, handle : tuiles du footer v2)
export const socials = [
  { label: "Instagram", short: "IG", handle: "@la_teuf_electronic", href: "https://www.instagram.com/la_teuf_electronic/" },
  { label: "TikTok", short: "TT", handle: "@shayntheproducer", href: "https://www.tiktok.com/@shayntheproducer" },
  { label: "WhatsApp", short: "WA", handle: null, href: "https://chat.whatsapp.com/Cggl1KC8ZgDBkZWS5URH0e" },
  { label: "Linktree", short: "LT", handle: null, href: "https://linktr.ee/la_teuf" },
] as const;

export const CONTACT_EMAIL = "hello@lateufelectronic.com";
/** Numéro pour les demandes d'informations (page contact) */
export const CONTACT_PHONE = { tel: "+22891950193", display: "+228 91 95 01 93" } as const;
