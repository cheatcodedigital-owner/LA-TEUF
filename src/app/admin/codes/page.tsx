import { Suspense } from "react";
import { CopyButton } from "@/components/admin/copy-button";
import { getEvents } from "@/lib/admin/data";
import { listPromos } from "@/lib/admin/codes";
import { siteOrigin } from "@/lib/admin/origin";
import { requireRole } from "@/lib/admin/session";
import { isSupabaseConfigured } from "@/lib/ticketing/supabase";
import { AdminNav } from "../nav";
import { PromoForm } from "../forms";
import { createPromo, setPromoActive } from "./actions";

const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Africa/Lome" }) : "—");

export default function CodesPage() {
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
        <AdminNav role={role} active="codes" />
        <p className="mt-6 rounded-card bg-deep-indigo p-8">Supabase n&apos;est pas configuré.</p>
      </>
    );
  }

  const [promos, events, origin] = await Promise.all([listPromos(), getEvents(), siteOrigin()]);
  const saleEvent = events.find((e) => e.status === "on_sale") ?? events[0];
  const link = (code: string, slug?: string) => `${origin}/billetterie/${slug ?? saleEvent?.slug ?? ""}?code=${encodeURIComponent(code)}`;

  return (
    <>
      <AdminNav role={role} active="codes" />
      <h1 className="mt-6 font-title text-4xl">Codes promo</h1>
      <p className="mt-2 max-w-2xl text-warm-ivory/70">
        Chaque code a un nombre d&apos;utilisations limité (une utilisation = une commande payée). Il ne s&apos;applique qu&apos;au tarif standard, jamais à l&apos;early bird, et ne se cumule pas avec la
        remise de groupe : la remise la plus avantageuse est retenue.
      </p>

      <section className="mt-6 rounded-card bg-deep-indigo p-6">
        <h2 className="font-title text-2xl">Créer un code</h2>
        <PromoForm action={createPromo} events={events.map((e) => ({ id: e.id, name: e.name }))} />
      </section>

      <section className="mt-6 rounded-card bg-deep-indigo p-6">
        <h2 className="font-title text-2xl">Codes ({promos.length})</h2>
        <ul className="mt-4 space-y-3">
          {promos.length === 0 && <li className="text-warm-ivory/60">Aucun code pour l&apos;instant.</li>}
          {promos.map((p) => {
            const left = p.max_uses === null ? null : Math.max(0, p.max_uses - p.used - p.held);
            const state = !p.active ? "Désactivé" : p.expired ? "Expiré" : left === 0 ? "Épuisé" : "Actif";
            const eventSlug = p.event_id ? events.find((e) => e.id === p.event_id)?.slug : undefined;
            return (
              <li key={p.id} className="rounded-3xl bg-cosmic-black p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-label text-2xl tracking-widest text-solar-copper">{p.code}</p>
                    <p className="text-sm text-warm-ivory/70">
                      {p.label ? `${p.label} · ` : ""}
                      {p.kind === "percent" ? `-${p.value} %` : `-${fcfa(p.value)}`} · {p.events?.name ?? "Tous les événements"}
                    </p>
                  </div>
                  <span className={`rounded-full px-4 py-1 font-label text-xs uppercase tracking-widest ${state === "Actif" ? "bg-emerald-700" : "bg-warm-ivory/15"}`}>{state}</span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-warm-ivory/60">Utilisé (payé)</dt>
                    <dd className="font-label text-lg">
                      {p.used}
                      {p.max_uses !== null && ` / ${p.max_uses}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-warm-ivory/60">En cours de paiement</dt>
                    <dd className="font-label text-lg">{p.held}</dd>
                  </div>
                  <div>
                    <dt className="text-warm-ivory/60">Remises accordées</dt>
                    <dd className="font-label text-lg">{fcfa(p.discounts)}</dd>
                  </div>
                  <div>
                    <dt className="text-warm-ivory/60">Valable jusqu&apos;au</dt>
                    <dd className="font-label text-lg">{day(p.ends_at)}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <CopyButton text={p.code} label="Copier le code" />
                  <CopyButton text={link(p.code, eventSlug)} label="Copier le lien" />
                  <form action={setPromoActive}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="active" value={String(!p.active)} />
                    <button type="submit" className="min-h-11 rounded-full px-4 text-sm text-warm-ivory/70 underline">
                      {p.active ? "Désactiver" : "Réactiver"}
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
