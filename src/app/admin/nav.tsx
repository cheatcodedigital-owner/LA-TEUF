import Image from "next/image";
import Link from "next/link";
import { logout } from "./login/actions";
import type { Role } from "@/lib/admin/session";

export function AdminNav({ role, active }: { role: Role; active: "dashboard" | "achats" | "codes" | "influenceurs" | "scan" }) {
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
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-warm-ivory/25 pb-5">
      <p className="flex items-center gap-3 font-title text-[28px] leading-none">
        <span className="flex size-12 items-center justify-center rounded-full border border-warm-ivory">
          <Image src="/brand/logo-pastille.svg" alt="" width={28} height={28} unoptimized className="size-7" />
        </span>
        LA TEUF <span className="text-solar-copper">admin</span>
      </p>
      <nav aria-label="Admin" className="flex flex-wrap items-center gap-2">
        {role === "admin" && item("/admin", "Tableau de bord", "dashboard")}
        {role === "admin" && item("/admin/achats", "Achats", "achats")}
        {role === "admin" && item("/admin/codes", "Codes promo", "codes")}
        {role === "admin" && item("/admin/influenceurs", "Influenceurs", "influenceurs")}
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
