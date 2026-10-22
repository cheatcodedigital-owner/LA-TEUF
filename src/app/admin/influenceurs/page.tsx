import { Suspense } from "react";
import { CopyButton } from "@/components/admin/copy-button";
import { listAffiliates } from "@/lib/affiliate/stats";
import { getEvents } from "@/lib/admin/data";
import { siteOrigin } from "@/lib/admin/origin";
import { requireRole } from "@/lib/admin/session";
import { isSupabaseConfigured } from "@/lib/ticketing/supabase";
import { AdminNav } from "../nav";
import { AffiliateForm, PayoutForm, ResetPasswordForm } from "../forms";
import { createAffiliate, deletePayout, recordPayout, resetAffiliatePassword, setAffiliateActive } from "./actions";

const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;
const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Africa/Lome" });

export default function InfluencersPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Suspense fallback={<p className="py-20 text-center text-warm-ivory/70">Chargement…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}

async function Content() {
  const role = await requireRole("admin");
  if (!isSupabaseConfigured()) {
    return (
      <>
        <AdminNav role={role} active="influenceurs" />
        <p className="mt-6 rounded-card bg-deep-indigo p-8">Supabase n&apos;est pas configuré.</p>
      </>
    );
  }

  const [affiliates, events, origin] = await Promise.all([listAffiliates(), getEvents(), siteOrigin()]);
  const totals = affiliates.reduce(
    (t, a) => ({ clicks: t.clicks + a.stats.clicks, completed: t.completed + a.stats.completed, earned: t.earned + a.stats.earned, balance: t.balance + a.stats.balance }),
    { clicks: 0, completed: 0, earned: 0, balance: 0 },
  );

  return (
    <>
      <AdminNav role={role} active="influenceurs" />
      <h1 className="mt-6 font-title text-4xl">Affiliation</h1>
      <p className="mt-2 max-w-2xl text-warm-ivory/70">
        Chaque influenceur a un lien <b>{origin}/r/identifiant</b>. Il est compté à chaque clic et rattache l&apos;acheteur pendant 30 jours (dernier clic). L&apos;influenceur touche sa commission (20 % par défaut) sur le total
        des achats payés. Il suit ses chiffres sur <b>{origin}/influenceur</b>.
      </p>

      <section aria-label="Totaux" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Clics", String(totals.clicks)],
            ["Achats complétés", String(totals.completed)],
            ["Commissions gagnées", fcfa(totals.earned)],
            ["Reste à verser", fcfa(totals.balance)],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-card bg-deep-indigo p-6">
            <p className="font-label text-sm uppercase tracking-widest text-warm-ivory/70">{label}</p>
            <p className="mt-2 font-label text-3xl text-solar-copper">{value}</p>
          </div>
        ))}
      </section>

      <p className="mt-4">
        <a href="/api/admin/export?type=influenceurs" download className="inline-flex min-h-11 items-center rounded-full border border-warm-ivory/40 px-5 font-label text-sm uppercase tracking-wider">
          Récapitulatif (CSV)
        </a>
      </p>

      <section className="mt-6 rounded-card bg-deep-indigo p-6">
        <h2 className="font-title text-2xl">Ajouter un influenceur</h2>
        <AffiliateForm action={createAffiliate} events={events.map((e) => ({ slug: e.slug, name: e.name }))} />
      </section>

      <ul className="mt-6 space-y-6">
        {affiliates.length === 0 && <li className="rounded-card bg-deep-indigo p-6 text-warm-ivory/60">Aucun influenceur pour l&apos;instant.</li>}
        {affiliates.map((a) => {
          const link = `${origin}/r/${a.slug}`;
          return (
            <li key={a.id} className="rounded-card bg-deep-indigo p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-title text-2xl">{a.name}</h2>
                  <p className="text-sm text-warm-ivory/70">
                    Identifiant <b className="font-label tracking-widest text-solar-copper">{a.slug}</b> · {a.rate_pct} %{a.contact ? ` · ${a.contact}` : ""}
                  </p>
                  <p className="mt-1 break-all text-sm text-warm-ivory/70">{link}</p>
                </div>
                <span className={`rounded-full px-4 py-1 font-label text-xs uppercase tracking-widest ${a.active ? "bg-emerald-700" : "bg-warm-ivory/15"}`}>{a.active ? "Actif" : "Désactivé"}</span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:grid-cols-7">
                {(
                  [
                    ["Clics", String(a.stats.clicks)],
                    ["Visiteurs uniques", String(a.stats.visitors)],
                    ["Achats démarrés", String(a.stats.started)],
                    ["Achats complétés", String(a.stats.completed)],
                    ["Ventes générées", fcfa(a.stats.sales)],
                    ["Commission", fcfa(a.stats.earned)],
                    ["Reste à verser", fcfa(a.stats.balance)],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-3xl bg-cosmic-black p-3">
                    <dt className="text-warm-ivory/60">{label}</dt>
                    <dd className="font-label text-lg">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 flex flex-wrap items-start gap-2">
                <CopyButton text={link} label="Copier le lien" />
                <CopyButton text={`${origin}/influenceur`} label="Copier l'adresse de connexion" />
                <form action={setAffiliateActive}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="active" value={String(!a.active)} />
                  <button type="submit" className="min-h-11 rounded-full px-4 text-sm text-warm-ivory/70 underline">
                    {a.active ? "Désactiver" : "Réactiver"}
                  </button>
                </form>
                <ResetPasswordForm action={resetAffiliatePassword} id={a.id} />
              </div>

              <PayoutForm action={recordPayout} affiliateId={a.id} balance={a.stats.balance} />

              {a.stats.payouts.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {a.stats.payouts.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-warm-ivory/10 py-1">
                      <span>
                        {day(p.paid_at)} · {fcfa(p.amount_xof)}
                        {p.note ? ` · ${p.note}` : ""}
                      </span>
                      <form action={deletePayout}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="min-h-11 px-3 text-warm-ivory/60 underline">
                          Annuler ce versement
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
