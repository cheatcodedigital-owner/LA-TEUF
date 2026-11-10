import { useId } from "react";

/*
 * Champs de formulaire v2 (DESIGN.md §7.4) : pilule cerclée de 56 px, label au-dessus,
 * aide et erreur sous le champ (l'erreur est écrite, jamais signalée par la seule couleur).
 * `light` sur bande claire (focus : contour 2 px et fond Lilas), `dark` sur bande sombre
 * (champ noir cerclé d'Ivoire, focus : contour 2 px).
 */
const control = {
  light:
    "border-cosmic-black bg-warm-ivory text-deep-indigo placeholder:text-deep-indigo/55 focus:bg-violet-pale focus:ring-cosmic-black aria-invalid:border-copper-deep aria-invalid:ring-copper-deep",
  dark: "border-warm-ivory bg-cosmic-black text-warm-ivory placeholder:text-warm-ivory/55 focus:ring-warm-ivory aria-invalid:border-solar-copper aria-invalid:ring-solar-copper",
} as const;
const errorText = { light: "text-copper-deep", dark: "text-solar-copper" } as const;

export type FieldTone = keyof typeof control;

// Le contour passe de 1 à 2 px par un anneau intérieur : le texte ne bouge pas
const base =
  "w-full border font-body text-[16px] outline-none transition-colors duration-200 focus:ring-1 focus:ring-inset disabled:opacity-50 aria-invalid:ring-1 aria-invalid:ring-inset";

type Common = { label: string; hint?: string; error?: string; tone?: FieldTone; className?: string };

function useFieldIds(id: string | undefined, hint?: string, error?: string) {
  const auto = useId();
  const fid = id ?? auto;
  const describedBy = [hint && `${fid}-hint`, error && `${fid}-error`].filter(Boolean).join(" ") || undefined;
  return { fid, describedBy };
}

function FieldFrame({ fid, label, hint, error, tone, className, children }: Common & { fid: string; tone: FieldTone; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <label htmlFor={fid} className="font-label text-[14px] uppercase leading-none tracking-[0.04em]">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${fid}-hint`} className="px-6 font-body text-[15px] leading-[1.45] opacity-80">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fid}-error`} className={`px-6 font-body text-[15px] leading-[1.45] ${errorText[tone]}`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  tone = "light",
  className,
  id,
  ...input
}: Common & Omit<React.InputHTMLAttributes<HTMLInputElement>, "className">) {
  const { fid, describedBy } = useFieldIds(id, hint, error);
  return (
    <FieldFrame fid={fid} label={label} hint={hint} error={error} tone={tone} className={className}>
      <input
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${base} ${control[tone]} h-14 rounded-full px-6`}
        {...input}
      />
    </FieldFrame>
  );
}

export function TextArea({
  label,
  hint,
  error,
  tone = "light",
  className,
  id,
  rows = 5,
  ...area
}: Common & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className">) {
  const { fid, describedBy } = useFieldIds(id, hint, error);
  return (
    <FieldFrame fid={fid} label={label} hint={hint} error={error} tone={tone} className={className}>
      <textarea
        id={fid}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${base} ${control[tone]} min-h-32 resize-y rounded-[24px] px-6 py-4 leading-[1.5]`}
        {...area}
      />
    </FieldFrame>
  );
}
