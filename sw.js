// Offline cache. Stale-while-revalidate: open instantly from cache, refresh in the background,
// so a new deploy shows up on the next launch. Bump VERSION to drop old caches entirely.
const VERSION = "v11";
const CACHE = "hyrox-" + VERSION;
const ASSETS = [
  "./", "index.html", "manifest.webmanifest", "css/app.css",
  "js/app.js", "js/dom.js", "js/editor.js", "js/library.js", "js/moves.js", "js/seed.js", "js/session.js", "js/store.js", "js/timer.js",
  "icons/icon.svg", "icons/calendar.svg", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png",
  ...["skierg", "rowerg", "sled-push", "sled-pull", "wall-ball", "burpee", "farmers-carry", "sandbag-lunge", "kettlebell", "run"].map(m => "icons/moves/" + m + ".svg")
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("hyrox-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const fonts = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== location.origin && !fonts) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => {
      if (res.ok || res.type === "opaque") cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { e.waitUntil(net); return cached; }
    return (await net) || (req.mode === "navigate" && await cache.match("index.html")) || Response.error();
  })());
});
