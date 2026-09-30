// ==========================================================
// sw.js — Minco service worker: offline-first static shell.
// Static GETs: stale-while-revalidate. Navigations: network-first
// with cached fallback. /api/*: network-only (the app's
// localStorage fallback already covers offline mode).
// Bump VERSION to invalidate old caches on deploy.
// ==========================================================

const VERSION = "minco-v2";
const CORE = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/assets/css/main.css",
  "/assets/css/landing.css",
  "/assets/js/main.js",
  "/assets/js/landing.js",
  "/assets/js/sos.js",
  "/assets/img/mincologo.png",
  "/assets/img/icon-192.png",
  "/assets/img/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()) // never block install on one bad asset
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // embeds/CDNs: browser handles
  if (url.pathname.startsWith("/api/")) return; // API: network-only

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(request)
            .then((hit) => hit || caches.match("/index.html"))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || network;
    })
  );
});
