// Service worker du scanner : permet d'ouvrir /admin/scan sans réseau (page et fichiers statiques en cache).
// Portée : /admin/. Les appels /api/ ne sont jamais interceptés (le scanner gère lui-même le hors ligne).
const CACHE = "teuf-admin-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

// Le client envoie la liste des fichiers déjà chargés avant l'activation du worker
self.addEventListener("message", (event) => {
  if (event.data?.type !== "precache") return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      for (const url of event.data.urls) {
        try {
          const u = new URL(url, self.location.origin);
          if (u.origin !== self.location.origin) continue;
          if (!u.pathname.startsWith("/_next/static/") && u.pathname !== "/admin/scan") continue;
          const res = await fetch(u, { credentials: "same-origin" });
          if (res.ok && !res.redirected) await cache.put(u.pathname + (u.pathname.startsWith("/_next/") ? u.search : ""), res);
        } catch {}
      }
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // Fichiers versionnés par Next : cache d'abord
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // Page du scanner : réseau d'abord, copie en cache si hors ligne
  if (req.mode === "navigate" && url.pathname === "/admin/scan") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const res = await fetch(req);
          // Pas de copie d'une redirection (session expirée → page de connexion)
          if (res.ok && !res.redirected) cache.put("/admin/scan", res.clone());
          return res;
        } catch {
          const hit = await cache.match("/admin/scan");
          return hit ?? Response.error();
        }
      })(),
    );
  }
});
