/* Offline cache for the app shell. Bump CACHE to ship an update. */
const CACHE = "bymbti-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/css/style.css",
  "./assets/js/mbti-data.js",
  "./assets/js/roles.js",
  "./assets/js/scenes.js",
  "./assets/js/analyzer.js",
  "./assets/js/engine.js",
  "./assets/js/answers.js",
  "./assets/js/llm.js",
  "./assets/js/app.js",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./favicon-64.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Network-first for everything: when online you always get the latest push;
// the cache is refreshed in the background and used only as an offline fallback.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches
          .match(e.request)
          .then((hit) => hit || caches.match("./index.html"))
      )
  );
});
