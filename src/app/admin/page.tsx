import Link from "next/link";
import { Suspense } from "react";
import { getDashboard, getEvents, kindLabel, type Dashboard } from "@/lib/admin/data";
import { requireRole } from "@/lib/admin/session";
import { isSupabaseConfigured } from "@/lib/ticketing/supabase";
import { AdminNav } from "./nav";

const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;
const when = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { timeZone: "Africa/Lome", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

const ORDER_STATUS: Record<string, string> = {
  paid: "Payée",
  pending: "En attente",
  cancelled: "Annulée",
  expired: "Expirée",
  failed: "Échec",
  refund_needed: "À rembourser",
  refunded: "Remboursée",
};
const SCAN_RESULT: Record<string, string> = {
  ok: "Entrée",
  already_used: "Déjà utilisé",
  invalid: "Invalide",
  wrong_event: "Autre événement",
  cancelled: "Annulé",
  expired: "Expiré",
};

export default function AdminPage(props: PageProps<"/admin">) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Suspense fallback={<p className="py-20 text-center text-warm-ivory/70">Chargement…</p>}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ event?: string | string[] }> }) {
  const role = await requireRole("admin");
  const { event: eventParam } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <>
        <AdminNav role={role} active="dashboard" />
        <p className="mt-6 rounded-card bg-deep-indigo p-8">Supabase n&apos;est pas configuré (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).</p>
      </>
    );
  }

  const events = await getEvents();
  const slug = Array.isArray(eventParam) ? eventParam[0] : eventParam;
  const event = events.find((e) => e.slug === slug) ?? events.find((e) => e.status === "on_sale") ?? events[0];
  if (!event) return <p className="mt-6">Aucun événement.</p>;
  const d = await getDashboard(event);

  return (
    <>
      <AdminNav role={role} active="dashboard" />

      <nav aria-label="Événements" className="mt-6 flex flex-wrap gap-2">
        {events.map((e) => (
          <Link
            key={e.id}
            href={`/admin?event=${e.slug}`}
            aria-current={e.id === event.id ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full px-5 font-label text-sm uppercase tracking-wider ${
              e.id === event.id ? "bg-solar-copper text-cosmic-black" : "border border-warm-ivory/40"
            }`}
          >
            {e.name}
          </Link>
        ))}
      </nav>

      <h1 className="mt-6 font-title text-4xl">{event.name}</h1>
      <p className="text-warm-ivory/70">
        {event.city}, {event.country} · {when(event.starts_at)}
      </p>

      <Kpis d={d} />

      {d.refundNeeded.length > 0 && (
        <section className="mt-6 rounded-card bg-deep-indigo p-6 ring-2 ring-solar-copper">
          <h2 className="font-title text-2xl">À rembourser ({d.refundNeeded.length})</h2>
          <p className="mt-1 text-sm text-warm-ivory/70">
            Paiements reçus après expiration de la réservation, sans place disponible. À rembourser depuis Kkiapay.
          </p>
          <ul className="mt-4 space-y-2">
            {d.refundNeeded.map((o) => (
              <li key={o.id} className="rounded-3xl bg-cosmic-black p-4 text-sm">
                <span className="font-label uppercase tracking-wider">{fcfa(o.total_xof)}</span> · {o.buyer_name} · {o.buyer_email} · {o.buyer_whatsapp}
                <br />
                <span className="text-warm-ivory/60">Transaction Kkiapay : {o.kkiapay_transaction_id ?? "—"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-card bg-deep-indigo p-6">
          <h2 className="font-title text-2xl">Ventes par tarif</h2>
          <table className="mt-4 w-full text-left text-sm">
            <thead className="font-label uppercase tracking-wider text-warm-ivory/60">
              <tr>
                <th className="py-2">Tarif</th>
                <th className="py-2 text-right">Billets</th>
                <th className="py-2 text-right">Recettes</th>
              </tr>
            </thead>
            <tbody>
              {d.tiers.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-3 text-warm-ivory/60">
                    Aucune vente.
                  </td>
                </tr>
              )}
              {d.tiers.map((t) => (
                <tr key={t.kind} className="border-t border-warm-ivory/10">
                  <td className="py-2">{kindLabel(t.kind)}</td>
                  <td className="py-2 text-right">{t.sold}</td>
                  <td className="py-2 text-right">{fcfa(t.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-sm text-warm-ivory/70">Remises accordées : {fcfa(d.revenue.discounts)}</p>
        </section>

        <section className="rounded-card bg-deep-indigo p-6">
          <h2 className="font-title text-2xl">Commandes</h2>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {Object.entries(ORDER_STATUS).map(([k, label]) => (
              <li key={k} className="flex justify-between rounded-full bg-cosmic-black px-4 py-2">
                <span>{label}</span>
                <span className="font-label">{d.statusCounts[k] ?? 0}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-card bg-deep-indigo p-6">
        <h2 className="font-title text-2xl">Exports</h2>
        <p className="mt-1 text-sm text-warm-ivory/70">Fichiers CSV pour Excel. Ils contiennent des données personnelles : ne pas les partager.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {(
            [
              ["commandes", "Commandes"],
              ["billets", "Billets"],
              ["scans", "Journal des scans"],
            ] as const
          ).map(([type, label]) => (
            <a
              key={type}
              href={`/api/admin/export?event=${event.slug}&type=${type}`}
              download
              className="hover-glow inline-flex min-h-11 items-center rounded-full border border-warm-ivory/40 px-5 font-label text-sm uppercase tracking-wider"
            >
              {label} (CSV)
            </a>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-card bg-deep-indigo p-6">
        <h2 className="font-title text-2xl">Dernières commandes</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="font-label uppercase tracking-wider text-warm-ivory/60">
              <tr>
                <th className="py-2">Date</th>
                <th className="py-2">Acheteur</th>
                <th className="py-2">Tarif</th>
                <th className="py-2 text-right">Billets</th>
                <th className="py-2 text-right">Total</th>
                <th className="py-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {d.recentOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-3 text-warm-ivory/60">
                    Aucune commande.
                  </td>
                </tr>
              )}
              {d.recentOrders.map((o) => (
                <tr key={o.id} className="border-t border-warm-ivory/10">
                  <td className="py-2">{when(o.paid_at ?? o.created_at)}</td>
                  <td className="py-2">
                    {o.buyer_name}
                    <br />
                    <span className="text-warm-ivory/60">{o.buyer_email}</span>
                  </td>
                  <td className="py-2">{kindLabel(o.ticket_types?.kind)}</td>
                  <td className="py-2 text-right">{o.quantity}</td>
                  <td className="py-2 text-right">{fcfa(o.total_xof)}</td>
                  <td className="py-2">{ORDER_STATUS[o.status] ?? o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-card bg-deep-indigo p-6">
        <h2 className="font-title text-2xl">Scans</h2>
        <ul className="mt-4 flex flex-wrap gap-2 text-sm">
          {Object.entries(SCAN_RESULT).map(([k, label]) => (
            <li key={k} className="rounded-full bg-cosmic-black px-4 py-2">
              {label} <span className="font-label">{d.scanResults[k] ?? 0}</span>
            </li>
          ))}
        </ul>
        <ul className="mt-4 space-y-1 text-sm">
          {d.recentScans.length === 0 && <li className="text-warm-ivory/60">Aucun scan.</li>}
          {d.recentScans.map((s) => (
            <li key={s.id} className="flex flex-wrap justify-between gap-2 border-t border-warm-ivory/10 py-2">
              <span>
                {SCAN_RESULT[s.result] ?? s.result} · {s.buyer_name ?? "billet inconnu"}
              </span>
              <span className="text-warm-ivory/60">
                {s.device ? `${s.device} · ` : ""}
                {when(s.scanned_for ?? s.scanned_at)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Kpis({ d }: { d: Dashboard }) {
  const cards: [string, string, string?][] = [
    ["Recettes", fcfa(d.revenue.total), `en ligne ${fcfa(d.revenue.online)}${d.revenue.onsite ? ` · sur place ${fcfa(d.revenue.onsite)}` : ""}`],
    ["Billets vendus", `${d.tickets.sold} / ${d.event.capacity}`, `${d.capacityLeft} restants${d.held ? ` · ${d.held} en cours de paiement` : ""}`],
    ["Entrées scannées", `${d.tickets.entered}`, d.tickets.sold ? `${Math.round((d.tickets.entered / d.tickets.sold) * 100)} % des billets vendus` : undefined],
    ["À rembourser", `${d.refundNeeded.length}`, d.tickets.cancelled ? `${d.tickets.cancelled} billets annulés` : undefined],
  ];
  return (
    <section aria-label="Chiffres clés" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(([label, value, sub]) => (
        <div key={label} className="rounded-card bg-deep-indigo p-6">
          <p className="font-label text-sm uppercase tracking-widest text-warm-ivory/70">{label}</p>
          <p className="mt-2 font-label text-3xl text-solar-copper">{value}</p>
          {sub && <p className="mt-1 text-sm text-warm-ivory/70">{sub}</p>}
        </div>
      ))}
    </section>
  );
}
