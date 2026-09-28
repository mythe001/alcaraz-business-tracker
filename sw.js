/* Alcaraz Business Tracker — service worker (offline support).
   The app registers this file as sw.js?v=<version>, so every release
   (bump CONFIG.version in index.html) installs as an update automatically. */
const VERSION = new URL(self.location).searchParams.get("v") || "dev";
const CACHE = "abt-" + VERSION;
const ASSETS = [
  "./", "./index.html", "./gcash-qr.png", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png", "./icons/favicon-32.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: "reload" })))));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("abt-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// The page asks the waiting version to take over when the user taps "Refresh"
self.addEventListener("message", event => { if(event.data === "skipWaiting") self.skipWaiting(); });

const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));

self.addEventListener("fetch", event => {
  const req = event.request;
  if(req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  // Pages: try the network first (to get updates), fall back to the saved copy when offline or slow
  if(req.mode === "navigate"){
    event.respondWith((async () => {
      try{
        const fresh = await Promise.race([fetch(req), timeout(4000)]);
        if(fresh && fresh.ok){ const c = await caches.open(CACHE); c.put("./index.html", fresh.clone()); }
        return fresh;
      }catch(e){
        return (await caches.match("./index.html", { ignoreSearch: true })) || Response.error();
      }
    })());
    return;
  }

  // Everything else (icons, QR, manifest): saved copy first, network as backup
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req))
  );
});
