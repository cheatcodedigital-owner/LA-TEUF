import type { ComponentProps, ReactNode } from "react";
import { Link } from "@/i18n/navigation";

export function Keyhole({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 230" aria-hidden className={className} fill="currentColor">
      <path d="M50 0a50 50 0 0 1 22 95l26 135H2L28 95A50 50 0 0 1 50 0Z" />
    </svg>
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: "cta" | "secondary" | "ghost";
};

const buttonBase =
  "hover-glow inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 font-label text-base uppercase tracking-wider min-h-11";
const buttonStyles = {
  cta: "bg-solar-copper text-cosmic-black",
  secondary: "bg-cosmic-black text-warm-ivory",
  ghost: "border border-warm-ivory/40 text-warm-ivory",
};

export function Button({ variant = "cta", className = "", ...props }: ButtonProps) {
  return <button className={`${buttonBase} ${buttonStyles[variant]} ${className}`} {...props} />;
}

// Lien stylé en bouton. Largeur fixe conseillée (w-40) pour une mise en page identique FR/EN.
export function ButtonLink({
  variant = "cta",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof buttonStyles }) {
  return <Link className={`${buttonBase} ${buttonStyles[variant]} ${className}`} {...props} />;
}

export type Status = "bientot" | "en-vente" | "complet" | "termine";
const statusLabel: Record<Status, string> = {
  bientot: "Bientôt",
  "en-vente": "En vente",
  complet: "Complet",
  termine: "Terminé",
};
const statusStyle: Record<Status, string> = {
  bientot: "bg-ultraviolet/20 text-warm-ivory",
  "en-vente": "bg-solar-copper text-cosmic-black",
  complet: "bg-warm-ivory text-cosmic-black",
  termine: "bg-warm-ivory/15 text-warm-ivory/70",
};

export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 font-label text-xs uppercase tracking-widest ${statusStyle[status]}`}
    >
      {label ?? statusLabel[status]}
    </span>
  );
}

export function EventCard({
  date,
  title,
  place,
  status,
}: {
  date: string;
  title: string;
  place: string;
  status: Status;
}) {
  return (
    <article className="hover-glow group rounded-card bg-cosmic-black p-3 pb-6">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-deep-indigo">
        <Keyhole className="absolute left-1/2 top-1/2 h-3/5 -translate-x-1/2 -translate-y-1/2 text-cosmic-black/50" />
        <div className="absolute left-3 top-3">
          <StatusBadge status={status} />
        </div>
      </div>
      <div className="px-3 pt-5">
        <p className="font-label text-3xl uppercase tracking-wide text-solar-copper">{date}</p>
        <h3 className="mt-2 font-title text-2xl">{title}</h3>
        <p className="mt-1 text-warm-ivory/70">{place}</p>
        <div className="mt-5">
          <Button variant={status === "bientot" ? "ghost" : "cta"}>
            {status === "bientot" ? "Me prévenir" : "Billets"}
          </Button>
        </div>
      </div>
    </article>
  );
}

export function Field({
  label,
  children,
  error,
}: {
  label: string;
  children?: ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="relative block">
        <input
          placeholder=" "
          className="peer w-full rounded-full bg-cosmic-black px-6 pb-2 pt-6 text-warm-ivory outline-none ring-1 ring-transparent transition focus:ring-ultraviolet aria-[invalid=true]:ring-solar-copper"
          aria-invalid={error ? true : undefined}
        />
        <span className="pointer-events-none absolute left-6 top-4 origin-left text-warm-ivory/60 transition-all peer-focus:top-2 peer-focus:scale-75 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:scale-75">
          {label}
        </span>
      </span>
      {error && <span className="mt-1 block px-6 text-sm text-solar-copper">{error}</span>}
      {children}
    </label>
  );
}

export function TicketPass() {
  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-card bg-deep-indigo">
      <div className="p-7">
        <p className="font-label text-sm uppercase tracking-widest text-solar-copper">
          Billet · Early bird
        </p>
        <h3 className="mt-3 font-title text-3xl">LA TEUF au KARMA</h3>
        <dl className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-warm-ivory/60">Date</dt>
            <dd className="font-label text-xl uppercase text-solar-copper">20 Nov 2026</dd>
          </div>
          <div>
            <dt className="text-sm text-warm-ivory/60">Lieu</dt>
            <dd className="font-label text-xl uppercase">Lomé</dd>
          </div>
        </dl>
      </div>
      <div className="relative">
        <div className="absolute -left-4 -top-4 size-8 rounded-full bg-cosmic-black" />
        <div className="absolute -right-4 -top-4 size-8 rounded-full bg-cosmic-black" />
        <div className="mx-6 border-t border-dashed border-warm-ivory/30" />
      </div>
      {/* QR sombre sur zone Ivory pour un scan fiable */}
      <div className="flex flex-col items-center gap-3 p-7">
        <div className="grid size-44 place-items-center rounded-2xl bg-warm-ivory text-cosmic-black">
          <span className="font-label text-sm uppercase">QR code</span>
        </div>
        <p className="text-sm text-warm-ivory/60">1 place · à usage unique</p>
      </div>
    </div>
  );
}

export function Swatch({ name, hex, className }: { name: string; hex: string; className: string }) {
  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-warm-ivory/15">
      <div className={`h-24 ${className}`} />
      <div className="bg-cosmic-black px-4 py-3">
        <p className="font-label text-sm uppercase tracking-wider">{name}</p>
        <p className="text-sm text-warm-ivory/70">{hex}</p>
      </div>
    </div>
  );
}
