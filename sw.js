/* App instalable del repartidor. Los pedidos siempre se piden en vivo (Firebase). */
const V = "apamuy-rep-v2";
const CASCARA = ["./", "index.html", "rep.css", "rep.js", "nucleo.js", "ui.js", "demo.js", "semilla.js", "ubigeo.js", "firebase-config.js", "favicon.svg", "img/icon-192.png", "manifest.webmanifest"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(CASCARA)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
// Al tocar la notificación, vuelve a abrir la app
self.addEventListener("notificationclick", e => { e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(l => l.length ? l[0].focus() : self.clients.openWindow("./index.html"))); });
