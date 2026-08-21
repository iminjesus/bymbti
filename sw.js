/* Offline cache for the app shell. Bump CACHE to ship an update. */
const CACHE = "bymbti-v11";
const V = "11";
const ASSETS = [
  "./",
  "./index.html",
  `./manifest.json?v=${V}`,
  `./assets/css/style.css?v=${V}`,
  `./assets/js/mbti-data.js?v=${V}`,
  `./assets/js/roles.js?v=${V}`,
  `./assets/js/scenes.js?v=${V}`,
  `./assets/js/analyzer.js?v=${V}`,
  `./assets/js/engine.js?v=${V}`,
  `./assets/js/answers.js?v=${V}`,
  `./assets/js/llm.js?v=${V}`,
  `./assets/js/app.js?v=${V}`,
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

// 문서 요청은 브라우저 HTTP 캐시를 건너뛴다. GitHub Pages 가 max-age 를 걸어두면
// 온라인이어도 낡은 index.html 이 돌아와서 업데이트가 안 보이기 때문.
// (CSS/JS 는 ?v= 쿼리가 붙어 있어 파일이 바뀌면 URL 자체가 달라진다)
function freshRequest(request) {
  if (request.mode === "navigate") {
    return new Request(request.url, { cache: "no-store", credentials: "same-origin" });
  }
  return request;
}

// Network-first for everything: when online you always get the latest push;
// the cache is refreshed in the background and used only as an offline fallback.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(freshRequest(e.request))
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
