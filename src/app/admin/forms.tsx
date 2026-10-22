"use client";

import { useActionState, useEffect, useRef } from "react";
import { CopyButton } from "@/components/admin/copy-button";
import type { FormState } from "@/lib/admin/codes";

const field = "mt-2 min-h-12 w-full rounded-full bg-cosmic-black px-5 text-warm-ivory";
const labelCls = "font-label text-sm uppercase tracking-wider";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

// Formulaire d'admin : message d'erreur ou de succès, et remise à zéro après un succès
function useAdminForm(action: Action) {
  const [state, run, pending] = useActionState<FormState, FormData>(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.done) ref.current?.reset();
  }, [state]);
  return { state, run, pending, ref };
}

function Status({ state }: { state: FormState }) {
  return (
    <>
      {state.error && (
        <p role="alert" className="text-sm text-solar-copper">
          {state.error}
        </p>
      )}
      {state.done && (
        <p role="status" className="text-sm text-emerald-400">
          Créé : <b className="font-label tracking-widest">{state.done}</b>
        </p>
      )}
    </>
  );
}

const submit = "hover-glow min-h-12 rounded-full bg-solar-copper px-7 font-label uppercase tracking-wider text-cosmic-black disabled:opacity-50";

export function PromoForm({ action, events }: { action: Action; events: { id: string; name: string }[] }) {
  const { state, run, pending, ref } = useAdminForm(action);
  return (
    <form ref={ref} action={run} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="block">
        <span className={labelCls}>Code (vide = généré)</span>
        <input name="code" maxLength={32} placeholder="TEUF-XXXXX" className={`${field} uppercase`} autoComplete="off" />
      </label>
      <label className="block">
        <span className={labelCls}>Libellé interne</span>
        <input name="label" maxLength={80} placeholder="Story Instagram du 25/10" className={field} />
      </label>
      <label className="block">
        <span className={labelCls}>Nombre d&apos;utilisations</span>
        <input name="maxUses" type="number" min={1} max={10000} defaultValue={50} required className={field} />
      </label>
      <label className="block">
        <span className={labelCls}>Type de remise</span>
        <select name="kind" defaultValue="percent" className={`${field} appearance-none`}>
          <option value="percent">Pourcentage (%)</option>
          <option value="amount">Montant fixe (FCFA)</option>
        </select>
      </label>
      <label className="block">
        <span className={labelCls}>Valeur</span>
        <input name="value" type="number" min={1} defaultValue={10} required className={field} />
      </label>
      <label className="block">
        <span className={labelCls}>Événement</span>
        <select name="eventId" defaultValue="" className={`${field} appearance-none`}>
          <option value="">Tous les événements</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={labelCls}>Valable jusqu&apos;au (optionnel)</span>
        <input name="endsAt" type="date" className={field} />
      </label>
      <div className="flex flex-col justify-end gap-2 sm:col-span-2">
        <Status state={state} />
        <div>
          <button type="submit" disabled={pending} className={submit}>
            {pending ? "Création…" : "Créer le code"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Secret({ state, intro }: { state: FormState; intro: string }) {
  if (!state.secret) return null;
  return (
    <div role="status" className="rounded-3xl bg-cosmic-black p-4 text-sm">
      <p className="text-emerald-400">{intro}</p>
      <p className="mt-2">
        Mot de passe : <b className="select-all font-label text-xl tracking-widest">{state.secret}</b>
      </p>
      <p className="mt-2 text-warm-ivory/70">Il n&apos;est affiché qu&apos;une seule fois : copie-le et envoie-le à l&apos;influenceur avec son identifiant.</p>
      <div className="mt-2">
        <CopyButton text={state.secret} label="Copier le mot de passe" />
      </div>
    </div>
  );
}

export function AffiliateForm({ action, events }: { action: Action; events: { slug: string; name: string }[] }) {
  const { state, run, pending, ref } = useAdminForm(action);
  return (
    <form ref={ref} action={run} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="block">
        <span className={labelCls}>Nom</span>
        <input name="name" required minLength={2} maxLength={80} placeholder="Marie K." className={field} />
      </label>
      <label className="block">
        <span className={labelCls}>Identifiant du lien (vide = depuis le nom)</span>
        <input name="slug" maxLength={30} placeholder="marie" className={`${field} lowercase`} autoComplete="off" />
      </label>
      <label className="block">
        <span className={labelCls}>Commission (%)</span>
        <input name="ratePct" type="number" min={1} max={50} defaultValue={20} required className={field} />
      </label>
      <label className="block">
        <span className={labelCls}>Le lien mène vers</span>
        <select name="eventSlug" defaultValue="" className={`${field} appearance-none`}>
          <option value="">Prochain événement en vente</option>
          {events.map((e) => (
            <option key={e.slug} value={e.slug}>
              {e.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block sm:col-span-1 lg:col-span-2">
        <span className={labelCls}>Contact (optionnel)</span>
        <input name="contact" maxLength={120} placeholder="WhatsApp ou @instagram" className={field} />
      </label>
      <div className="flex flex-col justify-end gap-3 sm:col-span-2 lg:col-span-3">
        {state.error && (
          <p role="alert" className="text-sm text-solar-copper">
            {state.error}
          </p>
        )}
        {state.done && <Secret state={state} intro={`Influenceur créé. Identifiant : ${state.done}`} />}
        <div>
          <button type="submit" disabled={pending} className={submit}>
            {pending ? "Création…" : "Ajouter l'influenceur"}
          </button>
        </div>
      </div>
    </form>
  );
}

export function ResetPasswordForm({ action, id }: { action: Action; id: string }) {
  const [state, run, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={run} className="inline-flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className="min-h-11 rounded-full px-4 text-left text-sm text-warm-ivory/70 underline">
        Nouveau mot de passe
      </button>
      {state.error && <span className="text-sm text-solar-copper">{state.error}</span>}
      {state.secret && <Secret state={state} intro="Mot de passe réinitialisé." />}
    </form>
  );
}

export function PayoutForm({ action, affiliateId, balance }: { action: Action; affiliateId: string; balance: number }) {
  const { state, run, pending, ref } = useAdminForm(action);
  return (
    <form ref={ref} action={run} className="mt-3 flex flex-wrap items-end gap-3">
      <input type="hidden" name="affiliateId" value={affiliateId} />
      <label className="block">
        <span className="text-sm text-warm-ivory/70">Versement (FCFA)</span>
        <input name="amount" type="number" min={1} max={balance || undefined} defaultValue={balance || undefined} required className="mt-1 min-h-11 w-36 rounded-full bg-cosmic-black px-4 text-warm-ivory" />
      </label>
      <label className="block">
        <span className="text-sm text-warm-ivory/70">Note</span>
        <input name="note" maxLength={120} placeholder="Mobile money…" className="mt-1 min-h-11 w-48 rounded-full bg-cosmic-black px-4 text-warm-ivory" />
      </label>
      <button type="submit" disabled={pending || balance <= 0} className="min-h-11 rounded-full border border-warm-ivory/40 px-5 font-label text-sm uppercase tracking-wider disabled:opacity-40">
        Enregistrer le versement
      </button>
      {state.error && (
        <p role="alert" className="basis-full text-sm text-solar-copper">
          {state.error}
        </p>
      )}
      {state.done && <p className="basis-full text-sm text-emerald-400">{state.done}</p>}
    </form>
  );
}
