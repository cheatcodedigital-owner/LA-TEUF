import type { ReactNode } from "react";

// Encadré arrondi : Deep Indigo (sombre) ou Ivory (clair), voir DESIGN.md §4
export function Section({
  id,
  light,
  className = "",
  children,
}: {
  id?: string;
  light?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`${light ? "section-light" : "bg-deep-indigo"} border border-frame-line rounded-card px-5 py-10 md:px-12 md:py-16 ${className}`}
    >
      {children}
    </section>
  );
}

export function PageMain({ children }: { children: ReactNode }) {
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:space-y-8 md:py-10">{children}</main>;
}
