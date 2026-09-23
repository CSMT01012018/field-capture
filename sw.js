const CACHE = "field-capture-v4-1";
const ASSETS = [
  "./",
  "./index.html",
  "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = e.request.url;
  // Ne jamais mettre en cache les appels API Dropbox
  if (url.includes("dropboxapi.com") || url.includes("dropbox.com")) return;
  // Page principale : réseau d'abord (pour recevoir les mises à jour), cache si hors ligne
  if (e.request.mode === "navigate" || url.endsWith("/index.html") || url.endsWith("/field-capture/")) {
    e.respondWith(
      fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put("./index.html", clone));
        return resp;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }
  // Autres fichiers : cache d'abord
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      if (e.request.method === "GET" && resp.status === 200 && url.startsWith(self.location.origin)) {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return resp;
    }).catch(() => caches.match("./index.html")))
  );
});
