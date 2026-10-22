"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { checkLocal, markUsed, parseToken, type LocalResult, type Manifest } from "@/lib/admin/scan-core";

type EventInfo = { id: string; slug: string; name: string; startsAt: string };
type QueueItem = { eventId: string; slug: string; token: string; at: string; device: string };
type Conflict = { token: string; at: string; result: string; name?: string; by?: string | null; slug: string };
type Banner = { tone: "ok" | "warn" | "bad"; title: string; detail?: string; offline: boolean };

const K = {
  events: "teuf.scan.events",
  slug: "teuf.scan.event",
  device: "teuf.scan.device",
  queue: "teuf.scan.queue",
  conflicts: "teuf.scan.conflicts",
  manifest: (slug: string) => `teuf.scan.manifest.${slug}`,
};

// localStorage peut être absent ou refusé (navigation privée) : on dégrade sans planter
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const KIND: Record<string, string> = { early_bird: "Early bird", standard: "Standard" };
const hhmm = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("fr-FR", { timeZone: "Africa/Lome", hour: "2-digit", minute: "2-digit" }) : "");

const MESSAGES: Record<LocalResult, { tone: Banner["tone"]; title: string }> = {
  ok: { tone: "ok", title: "Entrée validée" },
  already_used: { tone: "bad", title: "Déjà utilisé" },
  invalid: { tone: "bad", title: "Billet invalide" },
  wrong_event: { tone: "bad", title: "Autre événement" },
  cancelled: { tone: "bad", title: "Billet annulé" },
  expired: { tone: "bad", title: "Billet expiré" },
  unknown: { tone: "warn", title: "Absent de la liste" },
};

const TONE = {
  ok: "bg-emerald-600 text-white",
  warn: "bg-amber-500 text-cosmic-black",
  bad: "bg-red-700 text-white",
};

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

export function Scanner() {
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [slug, setSlug] = useState("");
  const [device, setDevice] = useState("Entrée 1");
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [queueSize, setQueueSize] = useState(0);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [online, setOnline] = useState(true);
  const [authExpired, setAuthExpired] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [busy, setBusy] = useState(false);

  const manifestRef = useRef<Manifest | null>(null);
  const slugRef = useRef("");
  const deviceRef = useRef("Entrée 1");
  const lastRef = useRef({ token: "", at: 0 });
  const bannerTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const flushing = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const setManifestBoth = useCallback((m: Manifest | null, key?: string) => {
    manifestRef.current = m;
    setManifest(m);
    if (m && key) write(K.manifest(key), m);
  }, []);

  // --- File d'attente ----------------------------------------------------------------------------
  const getQueue = () => read<QueueItem[]>(K.queue, []);
  const setQueue = (q: QueueItem[]) => {
    write(K.queue, q);
    setQueueSize(q.length);
  };

  // Réapplique sur un manifeste frais les entrées pas encore synchronisées, pour ne pas les « oublier »
  const withPending = useCallback((m: Manifest, theSlug: string) => {
    let out = m;
    for (const q of read<QueueItem[]>(K.queue, []).filter((x) => x.slug === theSlug)) {
      const id = parseToken(q.token)?.id;
      if (id) out = markUsed(out, id, q.at, q.device);
    }
    return out;
  }, []);

  const postScans = useCallback(async (eventId: string, scans: { token: string; at: string }[], timeoutMs: number) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch("/api/admin/scan/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, device: deviceRef.current, scans }),
        signal: ctrl.signal,
      });
      if (res.status === 401) {
        setAuthExpired(true);
        return null;
      }
      if (!res.ok) return null;
      setAuthExpired(false);
      return (await res.json()) as {
        results: { token: string; at: string; result: string; scannedAt?: string | null; scannedDevice?: string | null; name?: string; kind?: string }[];
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }, []);

  const flushQueue = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    setBusy(true);
    try {
      for (;;) {
        const queue = read<QueueItem[]>(K.queue, []);
        if (!queue.length) break;
        const batch = queue.filter((q) => q.eventId === queue[0].eventId).slice(0, 50);
        const data = await postScans(batch[0].eventId, batch.map(({ token, at }) => ({ token, at })), 15000);
        if (!data) break;

        const done = new Set(data.results.map((r) => `${r.token}|${r.at}`));
        const bad: Conflict[] = [];
        let m = manifestRef.current;
        for (const r of data.results) {
          const item = batch.find((b) => b.token === r.token && b.at === r.at);
          if (r.result !== "ok") {
            bad.push({ token: r.token, at: r.at, result: r.result, name: r.name, by: r.scannedDevice, slug: item?.slug ?? "" });
          }
          const id = parseToken(r.token)?.id;
          if (m && id && item?.slug === slugRef.current && (r.result === "ok" || r.result === "already_used")) {
            m = markUsed(m, id, r.scannedAt ?? r.at, r.scannedDevice);
          }
        }
        if (m && m !== manifestRef.current) setManifestBoth(m, slugRef.current);
        setQueue(getQueue().filter((q) => !done.has(`${q.token}|${q.at}`)));
        if (bad.length) {
          const all = [...read<Conflict[]>(K.conflicts, []), ...bad].slice(-100);
          write(K.conflicts, all);
          setConflicts(all);
        }
      }
    } finally {
      flushing.current = false;
      setBusy(false);
    }
  }, [postScans, setManifestBoth]);

  // --- Données : événements et manifeste ------------------------------------------------------------
  const refreshManifest = useCallback(
    async (theSlug: string) => {
      if (!theSlug) return;
      await flushQueue();
      try {
        const res = await fetch(`/api/admin/scan/manifest?event=${encodeURIComponent(theSlug)}`, { cache: "no-store" });
        if (res.status === 401) return setAuthExpired(true);
        if (!res.ok) return;
        setAuthExpired(false);
        const fresh = withPending((await res.json()) as Manifest, theSlug);
        if (slugRef.current === theSlug) setManifestBoth(fresh, theSlug);
        else write(K.manifest(theSlug), fresh);
      } catch {}
    },
    [flushQueue, setManifestBoth, withPending],
  );

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/scan/manifest", { cache: "no-store" });
      if (res.status === 401) return setAuthExpired(true);
      if (!res.ok) return;
      const { events: list } = (await res.json()) as { events: EventInfo[] };
      setEvents(list);
      write(K.events, list);
    } catch {}
  }, []);

  const chooseEvent = useCallback(
    (next: string) => {
      slugRef.current = next;
      setSlug(next);
      write(K.slug, next);
      setManifestBoth(next ? read<Manifest | null>(K.manifest(next), null) : null);
      if (next && navigator.onLine) void refreshManifest(next);
    },
    [refreshManifest, setManifestBoth],
  );

  // Démarrage : état local d'abord (fonctionne hors ligne), réseau ensuite. Le stockage n'existe que dans le
  // navigateur : il ne peut pas servir d'état initial sans écart d'hydratation.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const storedEvents = read<EventInfo[]>(K.events, []);
    const storedSlug = read<string>(K.slug, "");
    const storedDevice = read<string>(K.device, "Entrée 1");
    deviceRef.current = storedDevice;
    setDevice(storedDevice);
    setEvents(storedEvents);
    setQueueSize(read<QueueItem[]>(K.queue, []).length);
    setConflicts(read<Conflict[]>(K.conflicts, []));
    setOnline(navigator.onLine);
    if (storedSlug) chooseEvent(storedSlug);
    if (navigator.onLine) void loadEvents();
  }, [chooseEvent, loadEvents]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const up = () => {
      setOnline(true);
      void flushQueue();
      void loadEvents();
    };
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    const timer = setInterval(() => {
      if (navigator.onLine && read<QueueItem[]>(K.queue, []).length) void flushQueue();
    }, 20000);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      clearInterval(timer);
    };
  }, [flushQueue, loadEvents]);

  // --- Service worker : charger l'app sans réseau ----------------------------------------------------
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/admin-sw.js", { scope: "/admin/" })
      .then(async (reg) => {
        await navigator.serviceWorker.ready;
        const urls = performance
          .getEntriesByType("resource")
          .map((e) => new URL(e.name))
          .filter((u) => u.origin === location.origin && u.pathname.startsWith("/_next/static/"))
          .map((u) => u.pathname + u.search);
        (reg.active ?? navigator.serviceWorker.controller)?.postMessage({ type: "precache", urls: [...urls, location.pathname] });
      })
      .catch(() => {});
  }, []);

  // Garde l'écran allumé pendant le contrôle
  useEffect(() => {
    let lock: { release: () => Promise<void> } | undefined;
    const request = async () => {
      try {
        lock = await (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen");
      } catch {}
    };
    void request();
    const onVisible = () => document.visibilityState === "visible" && void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);

  // --- Scan -----------------------------------------------------------------------------------------
  const show = useCallback((result: LocalResult, offline: boolean, detail?: string) => {
    clearTimeout(bannerTimer.current);
    const m = MESSAGES[result];
    setBanner({ ...m, detail, offline });
    try {
      navigator.vibrate?.(result === "ok" ? 80 : [120, 60, 120]);
    } catch {}
    bannerTimer.current = setTimeout(() => setBanner(null), result === "ok" ? 2200 : 4000);
  }, []);

  const handleScan = useCallback(
    async (raw: string) => {
      const now = Date.now();
      if (lastRef.current.token === raw && now - lastRef.current.at < 4000) return;
      lastRef.current = { token: raw, at: now };

      const theSlug = slugRef.current;
      const m = manifestRef.current;
      const event = m?.event;
      if (!theSlug || !event) return show("invalid", false, "Choisis un événement et télécharge la liste des billets.");
      if (!parseToken(raw)) return show("invalid", false, "Ce QR code n'est pas un billet LA TEUF.");

      const at = new Date(now).toISOString();

      // 1. En ligne : le serveur tranche (usage unique entre tous les appareils)
      if (navigator.onLine) {
        const data = await postScans(event.id, [{ token: raw, at }], 4000);
        const r = data?.results[0];
        if (r) {
          const id = parseToken(raw)?.id;
          if (id && (r.result === "ok" || r.result === "already_used")) {
            setManifestBoth(markUsed(manifestRef.current!, id, r.scannedAt ?? at, r.scannedDevice ?? deviceRef.current), theSlug);
          }
          const who = [r.name, r.kind ? KIND[r.kind] ?? r.kind : ""].filter(Boolean).join(" · ");
          const detail = r.result === "already_used" ? `Entré à ${hhmm(r.scannedAt ?? undefined)}${r.scannedDevice ? ` (${r.scannedDevice})` : ""}${who ? ` · ${who}` : ""}` : who;
          return show(r.result as LocalResult, false, detail);
        }
      }

      // 2. Hors ligne (ou serveur injoignable) : contrôle sur la liste embarquée, synchronisé plus tard
      const local = checkLocal(m, raw, now);
      const who = local.ticket ? [local.ticket.n, KIND[local.ticket.k] ?? local.ticket.k].filter(Boolean).join(" · ") : "";
      if (local.result === "ok" || local.result === "unknown") {
        setQueue([...getQueue(), { eventId: event.id, slug: theSlug, token: raw, at, device: deviceRef.current }]);
      }
      if (local.result === "ok" && local.ticket) setManifestBoth(markUsed(m, local.ticket.i, at, deviceRef.current), theSlug);
      const detail =
        local.result === "unknown"
          ? "Liste hors ligne incomplète : vérifie le billet à la main. Il sera contrôlé à la synchronisation."
          : local.result === "already_used"
            ? `Entré à ${hhmm(local.ticket?.at)}${local.ticket?.dv ? ` (${local.ticket.dv})` : ""}${who ? ` · ${who}` : ""}`
            : who;
      show(local.result, true, detail);
    },
    [postScans, setManifestBoth, show],
  );

  // --- Caméra ---------------------------------------------------------------------------------------
  const scanRef = useRef(handleScan);
  useEffect(() => {
    scanRef.current = handleScan;
  }, [handleScan]);

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout>;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      } catch {
        setCameraError("Caméra inaccessible. Autorise l'accès à la caméra dans le navigateur (HTTPS requis).");
        return;
      }
      const video = videoRef.current;
      if (stopped || !video) return stream.getTracks().forEach((t) => t.stop());
      video.srcObject = stream;
      await video.play().catch(() => {});

      const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
      const detector = BD ? new BD({ formats: ["qr_code"] }) : null;
      const jsQR = detector ? null : (await import("jsqr")).default;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      const tick = async () => {
        if (stopped) return;
        try {
          if (video.readyState >= 2 && video.videoWidth) {
            if (detector) {
              const codes = await detector.detect(video);
              if (codes[0]) void scanRef.current(codes[0].rawValue);
            } else if (jsQR && ctx) {
              const w = Math.min(640, video.videoWidth);
              canvas.width = w;
              canvas.height = Math.round((video.videoHeight * w) / video.videoWidth);
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
              if (code?.data) void scanRef.current(code.data);
            }
          }
        } catch {}
        timer = setTimeout(tick, 150);
      };
      void tick();
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // --- Rendu ----------------------------------------------------------------------------------------
  const live = manifest?.tickets.filter((t) => t.st !== 2) ?? [];
  const entered = live.filter((t) => t.st === 1).length;
  const age = manifest ? hhmm(manifest.generatedAt) : "";

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-card bg-cosmic-black">
        <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover sm:aspect-video" />
        {!cameraError && <div aria-hidden className="pointer-events-none absolute inset-[18%] rounded-3xl border-2 border-warm-ivory/60" />}
        {cameraError && <p className="absolute inset-0 grid place-items-center p-6 text-center">{cameraError}</p>}
        {banner && (
          <button
            type="button"
            onClick={() => setBanner(null)}
            className={`absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center ${TONE[banner.tone]}`}
          >
            <span className="font-label text-4xl uppercase tracking-wider">{banner.title}</span>
            {banner.detail && <span className="text-lg">{banner.detail}</span>}
            {banner.offline && <span className="font-label text-sm uppercase tracking-widest opacity-80">Contrôle hors ligne</span>}
          </button>
        )}
      </div>

      <div role="status" className="flex flex-wrap gap-2 text-sm">
        <span className={`rounded-full px-4 py-2 font-label uppercase tracking-wider ${online ? "bg-emerald-700" : "bg-amber-500 text-cosmic-black"}`}>
          {online ? "En ligne" : "Hors ligne"}
        </span>
        <span className="rounded-full bg-deep-indigo px-4 py-2">
          Entrés <b className="font-label">{entered}</b> / {live.length}
        </span>
        <span className={`rounded-full px-4 py-2 ${queueSize ? "bg-amber-500 text-cosmic-black" : "bg-deep-indigo"}`}>
          {queueSize ? `${queueSize} à synchroniser` : "Tout est synchronisé"}
        </span>
        {authExpired && <span className="rounded-full bg-red-700 px-4 py-2">Session expirée : reconnecte-toi quand tu as du réseau (la file est conservée)</span>}
      </div>

      <section className="rounded-card bg-deep-indigo p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="font-label text-sm uppercase tracking-wider">Événement</span>
            <select
              value={slug}
              onChange={(e) => chooseEvent(e.target.value)}
              className="mt-2 min-h-12 w-full rounded-full bg-cosmic-black px-5 text-warm-ivory"
            >
              <option value="">— Choisir —</option>
              {events.map((e) => (
                <option key={e.id} value={e.slug}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-label text-sm uppercase tracking-wider">Nom de cet appareil</span>
            <input
              value={device}
              maxLength={40}
              onChange={(e) => {
                setDevice(e.target.value);
                deviceRef.current = e.target.value.trim();
                write(K.device, e.target.value.trim());
              }}
              className="mt-2 min-h-12 w-full rounded-full bg-cosmic-black px-5 text-warm-ivory"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            disabled={!slug || !online || busy}
            onClick={() => void refreshManifest(slug)}
            className="hover-glow min-h-11 rounded-full bg-solar-copper px-6 font-label uppercase tracking-wider text-cosmic-black disabled:opacity-50"
          >
            {busy ? "Synchronisation…" : "Mettre à jour la liste"}
          </button>
          <button
            type="button"
            disabled={!queueSize || !online || busy}
            onClick={() => void flushQueue()}
            className="min-h-11 rounded-full border border-warm-ivory/40 px-6 font-label uppercase tracking-wider disabled:opacity-40"
          >
            Synchroniser
          </button>
          <span className="text-warm-ivory/70">
            {manifest ? `Liste de ${manifest.tickets.length} billets, mise à jour à ${age}` : slug ? "Liste non téléchargée : connecte-toi au réseau." : "Choisis un événement."}
          </span>
        </div>
        <p className="mt-3 text-sm text-warm-ivory/60">
          Avant la soirée, mets la liste à jour avec du réseau. Pendant la soirée, les scans fonctionnent sans connexion et se synchronisent dès le retour du réseau.
        </p>
      </section>

      {conflicts.length > 0 && (
        <section className="rounded-card bg-deep-indigo p-5 ring-2 ring-amber-500">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-title text-2xl">À vérifier ({conflicts.length})</h2>
            <button
              type="button"
              onClick={() => {
                write(K.conflicts, []);
                setConflicts([]);
              }}
              className="min-h-11 rounded-full border border-warm-ivory/40 px-5 text-sm"
            >
              Effacer
            </button>
          </div>
          <p className="mt-1 text-sm text-warm-ivory/70">Scans faits hors ligne que le serveur a refusés à la synchronisation (billet déjà utilisé sur un autre appareil, invalide…).</p>
          <ul className="mt-3 space-y-2 text-sm">
            {conflicts.map((c, i) => (
              <li key={i} className="rounded-3xl bg-cosmic-black p-3">
                {MESSAGES[c.result as LocalResult]?.title ?? c.result} · {hhmm(c.at)} {c.name ? `· ${c.name}` : ""}
                {c.by ? ` · déjà entré via ${c.by}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
