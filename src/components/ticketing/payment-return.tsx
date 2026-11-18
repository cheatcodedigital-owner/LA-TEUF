"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Flip } from "@/components/ds/flip";
import { CONTACT_EMAIL } from "@/components/layout/nav-items";
import { getPathname } from "@/i18n/navigation";
import type { OrderStatusResponse } from "@/lib/ticketing/types";

/** Interrogations du statut : toutes les 3 s pendant 2 minutes, puis on laisse l'e-mail prendre le relais */
const POLL_MS = 3000;
const POLL_MAX = 40;

type View = "processing" | "slow" | "refund" | "unknown";

/*
 * Retour depuis la page de paiement SasPay. N'émet jamais de billet : lit seulement le statut de la commande
 * (GET /api/billetterie/commande), que le webhook fait passer à « payé » après vérification serveur du paiement.
 * Payée → page « merci ». SasPay ne ramène ici qu'après un paiement réussi (sur un échec, l'acheteur reste chez SasPay).
 */
export function PaymentReturn({ slug, locale }: { slug: string; locale: string }) {
  const t = useTranslations("PaymentReturn");
  const orderId = useSearchParams().get("commande");
  const [view, setView] = useState<View>(orderId ? "processing" : "unknown");

  useEffect(() => {
    if (!orderId) return;
    let stopped = false;
    let tries = 0;
    let timer: number | undefined;
    const tick = async () => {
      tries++;
      try {
        const res = await fetch(`/api/billetterie/commande?id=${encodeURIComponent(orderId)}`, { cache: "no-store" });
        const data = (await res.json()) as OrderStatusResponse;
        if (stopped) return;
        if (data.status === "paid") {
          window.location.replace(getPathname({ href: `/billetterie/${slug}/merci`, locale }));
          return;
        }
        if (data.status === "refund") return setView("refund");
        if (data.status === "unknown") return setView("unknown");
      } catch {
        // Réseau coupé : on réessaie au tour suivant
      }
      if (stopped) return;
      if (tries >= POLL_MAX) return setView("slow");
      timer = window.setTimeout(tick, POLL_MS);
    };
    void tick();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [orderId, slug, locale]);

  const reference = orderId ? orderId.slice(0, 8).toUpperCase() : null;

  return (
    <div className="flex max-w-[640px] flex-col gap-6" aria-live="polite">
      <h1 className="font-title text-[48px] leading-[92%] tracking-[-0.02em] md:text-[80px]">
        {t.rich(`${view}.title`, { accent: (c) => <span className="text-violet-pale">{c}</span> })}
      </h1>
      <p className="font-body text-[16px] leading-[160%] md:text-[18px]">{t(`${view}.text`, { email: CONTACT_EMAIL })}</p>
      {view === "processing" && (
        <p role="status" className="flex items-center gap-3 font-label text-[14px] uppercase tracking-[0.06em] text-violet-pale">
          <span aria-hidden className="size-3 rounded-full bg-violet-pale motion-safe:animate-pulse" />
          {t("waiting")}
        </p>
      )}
      {(view === "processing" || view === "slow") && (
        <p className="rounded-card border border-violet-pale/40 px-5 py-4 font-body text-[14px] leading-[160%] md:text-[15px]">
          {t("help")}
        </p>
      )}
      {reference && (
        <p className="font-body text-[14px]">
          {t("reference")} <span className="font-label tracking-[0.06em]">{reference}</span>
        </p>
      )}
      {view !== "processing" && (
        <div className="flex flex-wrap gap-3">
          <Flip tone="ivory" size="h-[52px] px-6 text-[16px]" href={`/billetterie/${slug}`}>
            {t("back")}
          </Flip>
          <Flip tone="outlineDark" size="h-[52px] px-6 text-[16px]" href="/contact">
            {t("contact")}
          </Flip>
        </div>
      )}
    </div>
  );
}
