import Link from "next/link";
import { Suspense } from "react";
import { getEvents, kindLabel } from "@/lib/admin/data";
import { listPurchases, matchPurchase } from "@/lib/admin/purchases";
import { requireRole } from "@/lib/admin/session";
import { isSupabaseConfigured } from "@/lib/ticketing/supabase";
import { AdminNav } from "../nav";
import { ORDER_STATUS, fcfa, when } from "./format";

const STATUS_FILTERS = [
  ["paid", "Payées"],
  ["refund_needed", "À rembourser"],
  ["other", "Non abouties"],
  ["all", "Toutes"],
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number][0];

const chip = (active: boolean) =>
  `inline-flex min-h-11 items-center rounded-full px-5 font-label text-sm uppercase tracking-wider ${
    active ? "bg-solar-copper text-cosmic-black" : "border border-warm-ivory/40"
  }`;

export default function PurchasesPage(props: PageProps<"/admin/achats">) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Suspense fallback={<p className="py-20 text-center text-warm-ivory/70">Chargement…</p>}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const role = await requireRole("admin");
  const params = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <>
        <AdminNav role={role} active="achats" />
        <p className="mt-6 rounded-card bg-deep-indigo p-8">Supabase n&apos;est pas configuré (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).</p>
      </>
    );
  }

  const events = await getEvents();
  const slug = one(params.event);
  const event = events.find((e) => e.slug === slug) ?? null;
  const status = (STATUS_FILTERS.some(([k]) => k === one(params.status)) ? one(params.status) : "paid") as StatusFilter;
  const q = one(params.q).slice(0, 100);

  const all = await listPurchases(event?.id ?? null);
  const rows = all.filter((o) => {
    // Réservations en cours ou expirées sans paiement : bruit, sauf sous « Non abouties » / « Toutes »
    if (status === "paid" && o.status !== "paid") return false;
    if (status === "refund_needed" && o.status !== "refund_needed") return false;
    if (status === "other" && (o.status === "paid" || o.status === "refund_needed")) return false;
    return matchPurchase(o, q);
  });
  const paid = all.filter((o) => o.status === "paid");

  const href = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...(event ? { event: event.slug } : {}), status, ...(q ? { q } : {}), ...patch });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    return `/admin/achats?${p}`;
  };

  return (
    <>
      <AdminNav role={role} active="achats" />

      <h1 className="mt-6 font-title text-4xl">Achats</h1>
      <p className="mt-1 text-warm-ivory/70">
        {paid.length} commandes payées · {paid.reduce((n, o) => n + o.quantity, 0)} billets ·{" "}
        {fcfa(paid.reduce((n, o) => n + o.total_xof, 0))}
        {event ? ` · ${event.name}` : " · tous les événements"}
      </p>

      <nav aria-label="Événements" className="mt-6 flex flex-wrap gap-2">
        <Link href={href({ event: "" })} aria-current={!event ? "page" : undefined} className={chip(!event)}>
          Tous
        </Link>
        {events.map((e) => (
          <Link key={e.id} href={href({ event: e.slug })} aria-current={e.id === event?.id ? "page" : undefined} className={chip(e.id === event?.id)}>
            {e.name}
          </Link>
        ))}
      </nav>

      <form action="/admin/achats" className="mt-4 flex flex-col gap-3 sm:flex-row">
        {event && <input type="hidden" name="event" value={event.slug} />}
        <input type="hidden" name="status" value={status} />
        <label className="flex-1">
          <span className="sr-only">Rechercher</span>
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Nom, e-mail, WhatsApp ou référence (ex. 3F2A9C1B)"
            className="min-h-12 w-full rounded-full bg-deep-indigo px-5 text-warm-ivory placeholder:text-warm-ivory/40"
          />
        </label>
        <button
          type="submit"
          className="press min-h-12 rounded-full bg-solar-copper px-7 font-label uppercase tracking-wider text-cosmic-black"
        >
          Rechercher
        </button>
      </form>

      <nav aria-label="Statut" className="mt-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map(([k, label]) => (
          <Link key={k} href={href({ status: k })} aria-current={k === status ? "page" : undefined} className={chip(k === status)}>
            {label}
          </Link>
        ))}
      </nav>

      <section className="mt-6 rounded-card bg-deep-indigo p-6">
        <h2 className="font-title text-2xl">
          {rows.length} commande{rows.length > 1 ? "s" : ""}
          {q && <span className="text-warm-ivory/60"> pour « {q} »</span>}
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="font-label uppercase tracking-wider text-warm-ivory/60">
              <tr>
                <th className="py-2">Date</th>
                <th className="py-2">Acheteur</th>
                {!event && <th className="py-2">Événement</th>}
                <th className="py-2">Tarif</th>
                <th className="py-2 text-right">Billets</th>
                <th className="py-2 text-right">Total</th>
                <th className="py-2">Statut</th>
                <th className="py-2">
                  <span className="sr-only">Détail</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-3 text-warm-ivory/60">
                    Aucune commande.
                  </td>
                </tr>
              )}
              {rows.map((o) => {
                const used = o.tickets.filter((t) => t.status === "used").length;
                return (
                  <tr key={o.id} className="border-t border-warm-ivory/10 align-top">
                    <td className="py-3">{when(o.paid_at ?? o.created_at)}</td>
                    <td className="py-3">
                      {o.buyer_name}
                      <br />
                      <span className="text-warm-ivory/60">{o.buyer_email}</span>
                      <br />
                      <span className="text-warm-ivory/60">{o.buyer_whatsapp}</span>
                    </td>
                    {!event && <td className="py-3">{o.events?.name ?? "—"}</td>}
                    <td className="py-3">{kindLabel(o.ticket_types?.kind)}</td>
                    <td className="py-3 text-right">
                      {o.quantity}
                      {used > 0 && <span className="block text-warm-ivory/60">{used} scanné{used > 1 ? "s" : ""}</span>}
                    </td>
                    <td className="py-3 text-right">{fcfa(o.total_xof)}</td>
                    <td className="py-3">
                      {ORDER_STATUS[o.status] ?? o.status}
                      {o.status === "paid" && !o.tickets_emailed_at && (
                        <span className="block text-solar-copper">E-mail non envoyé</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/admin/achats/${o.id}`}
                        className="press inline-flex min-h-11 items-center rounded-full border border-warm-ivory/40 px-4 font-label text-xs uppercase tracking-wider"
                      >
                        Billets
                        <span className="sr-only"> de {o.buyer_name}</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
