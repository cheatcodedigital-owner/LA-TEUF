import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CopyButton } from "@/components/admin/copy-button";
import { LinkBuilder } from "@/components/admin/link-builder";
import { requireAffiliate } from "@/lib/affiliate/session";
import { getAffiliate } from "@/lib/affiliate/stats";
import { siteOrigin } from "@/lib/admin/origin";
import { isSupabaseConfigured } from "@/lib/ticketing/supabase";
import { logoutAffiliate } from "./login/actions";

const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Africa/Lome", day: "numeric", month: "long" }) : "—");

export default function AffiliateDashboardPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Suspense fallback={<p className="py-20 text-center text-warm-ivory/70">Chargement…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}

async function Content() {
  const id = await requireAffiliate();
  if (!isSupabaseConfigured()) return <p className="rounded-card bg-deep-indigo p-8">Service indisponible pour le moment.</p>;
  const a = await getAffiliate(id);
  if (!a) notFound();
  const origin = await siteOrigin();
  const link = `${origin}/r/${a.slug}`;
  const { stats: s } = a;

  const funnel: [string, string, string][] = [
    ["Clics sur ton lien", String(s.clicks), `${s.visitors} visiteur${s.visitors > 1 ? "s" : ""} unique${s.visitors > 1 ? "s" : ""}`],
    ["Achats démarrés", String(s.started), "ont rempli le formulaire"],
    ["Achats complétés", String(s.completed), s.clicks ? `${s.conversion} % des clics` : "paiement réussi"],
  ];
  const money: [string, string, boolean?][] = [
    ["Ventes générées", fcfa(s.sales)],
    [`Ta commission (${a.rate_pct} %)`, fcfa(s.earned)],
    ["Déjà versé", fcfa(s.paidOut)],
    ["Reste à te verser", fcfa(s.balance), true],
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-label text-sm uppercase tracking-widest text-solar-copper">LA TEUF · Espace influenceur</p>
        <form action={logoutAffiliate}>
          <button type="submit" className="min-h-11 px-3 text-sm text-warm-ivory/70 underline">
            Se déconnecter
          </button>
        </form>
      </div>
      <h1 className="mt-2 font-title text-4xl md:text-5xl">Salut {a.name} !</h1>
      {!a.active && (
        <p role="status" className="mt-4 rounded-3xl bg-warm-ivory/15 p-4">
          Ton lien est désactivé : les nouveaux clics ne sont plus comptés. Tes gains déjà enregistrés restent dus.
        </p>
      )}

      <section className="mt-6 rounded-card bg-deep-indigo p-6">
        <h2 className="font-title text-2xl">Ton lien</h2>
        <p className="mt-3 break-all font-label text-xl tracking-wider text-solar-copper">{link}</p>
        <p className="mt-3 text-warm-ivory/80">
          Tu gagnes <b>{a.rate_pct} %</b> du total de chaque achat terminé avec ton lien (pendant 30 jours après le clic). Seuls les paiements réussis comptent.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <CopyButton text={link} label="Copier mon lien" />
        </div>
        <div className="mt-6 border-t border-warm-ivory/10 pt-5">
          <h3 className="font-title text-xl">Un lien par contenu</h3>
          <p className="mb-4 mt-1 text-sm text-warm-ivory/70">Ajoute un nom de campagne pour voir quel post ou quelle story fait venir le plus de monde.</p>
          <LinkBuilder baseUrl={link} />
        </div>
      </section>

      <section aria-label="Ton entonnoir" className="mt-6 grid gap-4 sm:grid-cols-3">
        {funnel.map(([label, value, sub]) => (
          <div key={label} className="rounded-card bg-deep-indigo p-5">
            <p className="font-label text-xs uppercase tracking-widest text-warm-ivory/70">{label}</p>
            <p className="mt-2 font-label text-4xl text-solar-copper">{value}</p>
            <p className="mt-1 text-sm text-warm-ivory/70">{sub}</p>
          </div>
        ))}
      </section>

      <section aria-label="Tes gains" className="mt-4 grid grid-cols-2 gap-4">
        {money.map(([label, value, accent]) => (
          <div key={label} className={`rounded-card p-5 ${accent ? "bg-solar-copper text-cosmic-black" : "bg-deep-indigo"}`}>
            <p className={`font-label text-xs uppercase tracking-widest ${accent ? "" : "text-warm-ivory/70"}`}>{label}</p>
            <p className={`mt-2 font-label text-2xl ${accent ? "" : "text-solar-copper"}`}>{value}</p>
          </div>
        ))}
      </section>
      <p className="mt-3 text-sm text-warm-ivory/60">Les commissions sont versées plus tard par l&apos;équipe LA TEUF.</p>

      {s.campaigns.length > 0 && (
        <section className="mt-6 rounded-card bg-deep-indigo p-6">
          <h2 className="font-title text-2xl">Par campagne</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[26rem] text-left text-sm">
              <thead className="font-label uppercase tracking-wider text-warm-ivory/60">
                <tr>
                  <th className="py-2">Campagne</th>
                  <th className="py-2 text-right">Clics</th>
                  <th className="py-2 text-right">Démarrés</th>
                  <th className="py-2 text-right">Complétés</th>
                </tr>
              </thead>
              <tbody>
                {s.campaigns.map((c) => (
                  <tr key={c.campaign} className="border-t border-warm-ivory/10">
                    <td className="py-2">{c.campaign}</td>
                    <td className="py-2 text-right">{c.clicks}</td>
                    <td className="py-2 text-right">{c.started}</td>
                    <td className="py-2 text-right">{c.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-6 rounded-card bg-deep-indigo p-6">
        <h2 className="font-title text-2xl">Tes ventes</h2>
        <ul className="mt-4 space-y-2">
          {s.recent.length === 0 && <li className="text-warm-ivory/60">Pas encore d&apos;achat terminé avec ton lien. Partage-le !</li>}
          {s.recent.slice(0, 50).map((x) => (
            <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 rounded-3xl bg-cosmic-black px-4 py-3 text-sm">
              <span>
                {day(x.paid_at)} · {x.quantity} billet{x.quantity > 1 ? "s" : ""} · {fcfa(x.total_xof)}
                {x.campaign ? ` · ${x.campaign}` : ""}
              </span>
              <span className="font-label tracking-wider text-solar-copper">+ {fcfa(x.commission)}</span>
            </li>
          ))}
        </ul>
      </section>

      {s.payouts.length > 0 && (
        <section className="mt-6 rounded-card bg-deep-indigo p-6">
          <h2 className="font-title text-2xl">Versements reçus</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {s.payouts.map((p) => (
              <li key={p.id} className="flex justify-between gap-2 rounded-3xl bg-cosmic-black px-4 py-3">
                <span>
                  {day(p.paid_at)}
                  {p.note ? ` · ${p.note}` : ""}
                </span>
                <span className="font-label tracking-wider">{fcfa(p.amount_xof)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
