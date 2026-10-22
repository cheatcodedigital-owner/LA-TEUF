import Link from "next/link";
import { logout } from "./login/actions";
import type { Role } from "@/lib/admin/session";

export function AdminNav({ role, active }: { role: Role; active: "dashboard" | "scan" }) {
  const item = (href: string, label: string, key: string) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={`inline-flex min-h-11 items-center rounded-full px-5 font-label text-sm uppercase tracking-wider ${
        active === key ? "bg-warm-ivory text-cosmic-black" : "border border-warm-ivory/40"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <p className="font-title text-2xl">
        LA TEUF <span className="accent-word">admin</span>
      </p>
      <nav aria-label="Admin" className="flex flex-wrap items-center gap-2">
        {role === "admin" && item("/admin", "Tableau de bord", "dashboard")}
        {item("/admin/scan", "Scan", "scan")}
        <form action={logout}>
          <button type="submit" className="inline-flex min-h-11 items-center rounded-full px-4 text-sm text-warm-ivory/70 underline">
            Se déconnecter
          </button>
        </form>
      </nav>
    </header>
  );
}
