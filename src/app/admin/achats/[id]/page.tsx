import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { kindLabel } from "@/lib/admin/data";
import { getPurchase } from "@/lib/admin/purchases";
import { requireRole } from "@/lib/admin/session";
import { isSupabaseConfigured } from "@/lib/ticketing/supabase";
import { AdminNav } from "../../nav";
import { resendTickets } from "../actions";
import { ORDER_STATUS, TICKET_STATUS, fcfa, when } from "../format";
import { ResendForm } from "../resend-form";

export default function PurchasePage(props: PageProps<"/admin/achats/[id]">) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Suspense fallback={<p className="py-20 text-center text-warm-ivory/70">Chargement…</p>}>
        <Content params={props.params} />
      </Suspense>
    </main>
  );
}

const ghost =
  "press inline-flex min-h-11 items-center justify-center rounded-full border border-warm-ivory/40 px-5 font-label text-sm uppercase tracking-wider";

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const role = await requireRole("admin");
  if (!isSupabaseConfigured()) notFound();
  const { id } = await params;
  const purchase = await getPurchase(id);
  if (!purchase) notFound();
  const { order: o, tickets, canSign } = purchase;
  const ev = o.events;
  const ref = o.id.slice(0, 8).toUpperCase();
  const whatsapp = o.buyer_whatsapp.replace(/\D/g, "");
  const deliverable = o.status === "paid";
  const active = tickets.filter((t) => t.status !== "cancelled");

  const info: [string, string][] = [
    ["Événement", ev ? `${ev.name} · ${[ev.venue, ev.city].filter(Boolean).join(", ")} · ${when(ev.starts_at)}` : "—"],
    ["Statut", ORDER_STATUS[o.status] ?? o.status],
    ["Commande le", when(o.created_at)],
    ["Payée le", when(o.paid_at)],
    ["Tarif", `${kindLabel(o.ticket_types?.kind)} · ${o.quantity} × ${fcfa(o.unit_price_xof)}`],
    ["Total", `${fcfa(o.total_xof)}${o.discount_xof ? ` (remise ${fcfa(o.discount_xof)})` : ""}`],
    ["Canal", o.channel === "onsite" ? "Sur place" : "En ligne"],
    ["Transaction Kkiapay", o.kkiapay_transaction_id ?? "—"],
    ["Code promo / influenceur", [o.promo_codes?.code, o.affiliates?.slug].filter(Boolean).join(" · ") || "—"],
    ["E-mail des billets", o.tickets_emailed_at ? `envoyé le ${when(o.tickets_emailed_at)}` : "pas encore envoyé"],
  ];

  return (
    <>
      <AdminNav role={role} active="achats" />

      <Link href={ev ? `/admin/achats?event=${ev.slug}` : "/admin/achats"} className="mt-6 inline-flex min-h-11 items-center text-sm text-warm-ivory/70 underline">
        ← Tous les achats
      </Link>
      <h1 className="font-title text-4xl">{o.buyer_name}</h1>
      <p className="mt-1 font-label uppercase tracking-widest text-solar-copper">Réf. {ref}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="rounded-card bg-deep-indigo p-6">
          <h2 className="font-title text-2xl">Acheteur</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-warm-ivory/60">E-mail</dt>
              <dd>
                <a href={`mailto:${o.buyer_email}`} className="underline">
                  {o.buyer_email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-warm-ivory/60">WhatsApp</dt>
              <dd>{o.buyer_whatsapp}</dd>
            </div>
            <div>
              <dt className="text-warm-ivory/60">Pays</dt>
              <dd>{o.buyer_country}</dd>
            </div>
          </dl>
          {whatsapp.length >= 8 && (
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className={`${ghost} mt-5`}>
              Ouvrir WhatsApp
            </a>
          )}
        </section>

        <section className="rounded-card bg-deep-indigo p-6">
          <h2 className="font-title text-2xl">Commande</h2>
          <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {info.map(([k, v]) => (
              <div key={k}>
                <dt className="text-warm-ivory/60">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {deliverable && active.length > 0 && (
        <section className="mt-6 rounded-card bg-deep-indigo p-6">
          <h2 className="font-title text-2xl">Renvoyer par e-mail</h2>
          <p className="mt-1 text-sm text-warm-ivory/70">
            Le client reçoit le même e-mail qu&apos;après son achat, avec les mêmes QR codes ({active.length} billet{active.length > 1 ? "s" : ""}). Corrigez
            l&apos;adresse si elle était erronée.
          </p>
          <ResendForm action={resendTickets} orderId={o.id} email={o.buyer_email} />
        </section>
      )}

      <section className="mt-6 rounded-card bg-deep-indigo p-6">
        <h2 className="font-title text-2xl">Billets ({tickets.length})</h2>
        {!deliverable && <p className="mt-1 text-sm text-solar-copper">Commande non payée : aucun billet à remettre.</p>}
        {deliverable && (
          <p className="mt-1 text-sm text-warm-ivory/70">
            Mêmes QR codes que dans l&apos;e-mail. Chaque billet ne passe qu&apos;une fois au scan : ne l&apos;envoyez qu&apos;au client lui-même.
          </p>
        )}
        {!canSign && tickets.length > 0 && (
          <p className="mt-3 text-sm text-solar-copper">TICKET_SIGNING_SECRET manquant : les QR codes ne peuvent pas être affichés.</p>
        )}
        {tickets.length === 0 && <p className="mt-4 text-sm text-warm-ivory/60">Aucun billet émis.</p>}

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tickets.map((t) => (
            <li key={t.id} className="flex flex-col items-center rounded-card bg-cosmic-black p-5 text-center">
              <p className="font-label text-sm uppercase tracking-widest text-solar-copper">
                Billet {t.index} / {tickets.length}
              </p>
              {t.qr && t.status !== "cancelled" ? (
                // eslint-disable-next-line @next/next/no-img-element -- image générée (data URL), rien à optimiser
                <img src={t.qr} width={220} height={220} alt={`QR code du billet ${t.index}`} className="mt-3 rounded-xl bg-white" />
              ) : (
                <div className="mt-3 flex h-[220px] w-[220px] items-center justify-center rounded-xl bg-warm-ivory/10 text-sm text-warm-ivory/60">
                  {t.status === "cancelled" ? "Billet annulé" : "QR indisponible"}
                </div>
              )}
              <p className="mt-3 text-xs text-warm-ivory/60">Réf. {t.id.slice(0, 8).toUpperCase()}</p>
              <p className={`mt-1 text-sm ${t.status === "used" ? "text-solar-copper" : ""}`}>
                {TICKET_STATUS[t.status] ?? t.status}
                {t.scanned_at && ` le ${when(t.scanned_at)}`}
                {t.scanned_device && ` · ${t.scanned_device}`}
              </p>
              {deliverable && canSign && t.status !== "cancelled" && (
                <a href={`/api/admin/ticket-image?id=${t.id}`} download className={`${ghost} mt-4`}>
                  Télécharger le billet
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
