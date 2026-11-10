/* Icônes et drapeaux de la charte v2 (trait 1,3 px par défaut, couleur du texte) */

export function FlagTogo() {
  return (
    <svg width="24" height="16" viewBox="0 0 24 16" aria-hidden className="shrink-0">
      <rect width="24" height="16" fill="#006A4E" />
      <rect y="3.2" width="24" height="3.2" fill="#FFCE00" />
      <rect y="9.6" width="24" height="3.2" fill="#FFCE00" />
      <rect width="9.6" height="9.6" fill="#D21034" />
      <path d="M4.8 2.1l0.9 2.6h2.7l-2.2 1.6 0.8 2.6-2.2-1.6-2.2 1.6 0.8-2.6-2.2-1.6h2.7z" fill="#FFFFFF" />
      <rect x="0.5" y="0.5" width="23" height="15" fill="none" stroke="var(--color-cosmic-black)" />
    </svg>
  );
}

export function FlagBenin() {
  return (
    <svg width="24" height="16" viewBox="0 0 24 16" aria-hidden className="shrink-0">
      <rect width="24" height="16" fill="#FCD116" />
      <rect y="8" width="24" height="8" fill="#E8112D" />
      <rect width="9.6" height="16" fill="#008751" />
      <rect x="0.5" y="0.5" width="23" height="15" fill="none" stroke="var(--color-cosmic-black)" />
    </svg>
  );
}

/** Drapeau du pays d'un évènement (`country` de src/data/events.ts) */
export function CountryFlag({ country }: { country: string }) {
  if (country === "Togo") return <FlagTogo />;
  if (country === "Bénin") return <FlagBenin />;
  return null;
}

type IconProps = { className?: string; stroke?: number };

export function InstagramIcon({ className, stroke = 1.3 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5.5" fill="none" stroke="currentColor" strokeWidth={stroke} />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth={stroke} />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function TikTokIcon({ className, stroke = 1.3 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        d="M13 3v12.5a3.5 3.5 0 1 1-3.5-3.5M13 3c.4 3 2.6 5.2 6 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WhatsAppIcon({ className, stroke = 1.3 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path d="M3.5 20.5l1.3-4.2A8.6 8.6 0 1 1 8 19.3z" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" />
      <path d="M9 8.5c0 3.2 2.8 6.5 6.5 6.5l1-1.6-2-1-1 .9c-1-.4-2.2-1.6-2.6-2.6l.9-1-1-2z" fill="currentColor" />
    </svg>
  );
}

/** Icône du réseau par son nom (`label` de `socials`) */
export const socialIcons = { Instagram: InstagramIcon, TikTok: TikTokIcon, WhatsApp: WhatsAppIcon } as const;

export function ArrowUpRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** « + » des cartes dépliables et du menu : la barre verticale s'efface quand `open` (« − ») */
export function PlusIcon({ open = false, className = "size-[18px]" }: { open?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 18 18" className={className} aria-hidden>
      <path d="M3 9h12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M9 3v12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className={`origin-center transition-transform duration-500 ease-[cubic-bezier(0.65,0.05,0,1)] [transform-box:fill-box] ${
          open ? "scale-y-0" : "scale-y-100"
        }`}
      />
    </svg>
  );
}
