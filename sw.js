/* App instalable del repartidor. Los pedidos siempre se piden en vivo (Firebase). */
const V = "apamuy-rep-v19";
const CASCARA = ["./", "index.html", "rep.css", "rep.js", "nucleo.js", "ui.js", "demo.js", "semilla.js", "ubigeo.js", "firebase-config.js", "favicon.svg", "img/icon-192.png", "manifest.webmanifest"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(CASCARA)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});

// ===== Avisos (notificaciones) que manda apamuy-servidor =====
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) {}
  const m = d.data || d, fuerte = m.fuerte === "1";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    // Si la app está abierta y a la vista, el aviso se muestra adentro (la app ya suena)
    const vista = cs.filter(c => c.visibilityState === "visible");
    if (vista.length) { vista.forEach(c => c.postMessage({ tipo: "aviso", ...m })); return; }
    return self.registration.showNotification(m.titulo || "Apamuy", { body: m.cuerpo || "", icon: "img/icon-192.png", badge: "img/icon-192.png", tag: m.tag || "apamuy", renotify: true,
      requireInteraction: fuerte, vibrate: fuerte ? [600, 200, 600, 200, 600, 200, 600] : [200, 100, 200], data: { url: m.url || "./" } });
  }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close(); const url = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => { const c = cs[0]; if (c) { c.focus(); return c.navigate ? c.navigate(url).catch(() => {}) : null; } return self.clients.openWindow(url); }));
});
