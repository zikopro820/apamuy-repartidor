/* =========================================================
   APAMUY — Núcleo común (el MISMO archivo en apamuy y apamuy-panel)
   Datos (Firebase o demo), sesión, fotos, mapas, distancias y horarios.
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
const CFG = window.FIREBASE_CONFIG || {}, DEMO = !CFG.apiKey || String(CFG.apiKey).startsWith("PEGA"), AP = window.APAMUY || {};
const S = n => "S/ " + (Math.round((+n || 0) * 100) / 100).toFixed(2);
const r2 = n => Math.round((+n || 0) * 100) / 100;
const isoD = d => { const z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 10); };
const HOY = () => isoD(new Date());
const addD = (iso, n) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return isoD(d); };
const fmtF = (iso, o) => iso ? new Date(String(iso).slice(0, 10) + "T12:00:00").toLocaleDateString("es-PE", o || { weekday: "short", day: "numeric", month: "short" }) : "";
const fmtFH = iso => iso ? new Date(iso).toLocaleString("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
const fmtH = iso => iso ? new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) : "";
const hace = iso => { const m = Math.round((Date.now() - new Date(iso)) / 60000); return m < 1 ? "ahora" : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : fmtF(iso); };
const minDesde = iso => Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
const codigo = (p = "AP") => p + "-" + Array.from(crypto.getRandomValues(new Uint8Array(6)), b => "23456789ABCDEFGHJKMNPQRSTUVWXYZ"[b % 31]).join("");
const slug = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const wa = (num, txt) => { let n = String(num || "").replace(/\D/g, ""); if (n.length === 9) n = "51" + n; return `https://wa.me/${n}${txt ? "?text=" + encodeURIComponent(txt) : ""}`; };
const abrirWA = (num, txt) => window.open(wa(num, txt), "_blank", "noopener");
function toast(m, bad) { let x = $("#toast"); if (!x) { x = document.createElement("div"); x.id = "toast"; x.setAttribute("role", "status"); document.body.appendChild(x); } x.textContent = m; x.className = "show" + (bad ? " bad" : ""); clearTimeout(x._t); x._t = setTimeout(() => x.className = "", 3500); }
function cargarScript(src) { return new Promise((ok, no) => { const ya = $(`script[src="${src}"]`); if (ya?.dataset.ok) return ok();
  if (ya) { ya.addEventListener("load", () => ok()); ya.addEventListener("error", no); return; }   // se está cargando: espera a la misma
  const s = document.createElement("script"); s.src = src; s.onload = () => { s.dataset.ok = 1; ok(); }; s.onerror = e => { s.remove(); no(e); }; document.head.appendChild(s); }); }   // si falla, se quita para poder reintentar
function cargarCSS(href) { if (!$(`link[href="${href}"]`)) document.head.insertAdjacentHTML("beforeend", `<link rel="stylesheet" href="${href}">`); }
function redimensionar(file, max = 1000, q = .78, tipo = "image/jpeg") { return new Promise((ok, no) => { const fr = new FileReader(); fr.onerror = no; fr.onload = () => { const im = new Image(); im.onerror = no; im.onload = () => {
  const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
  const g = c.getContext("2d"); if (tipo === "image/jpeg") { g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); } g.drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL(tipo, q)); }; im.src = fr.result; }; fr.readAsDataURL(file); }); }

/* ---------- Firebase (se carga solo cuando hace falta) ---------- */
const FB_V = "10.12.2"; let FBX = null;
async function fb() {
  if (FBX) return FBX;
  const base = `https://www.gstatic.com/firebasejs/${FB_V}/`;
  // Solo lo necesario para arrancar (base de datos + sesión). Las fotos (Storage) se cargan cuando se usan.
  const [app, fs, au] = await Promise.all(["app", "firestore", "auth"].map(m => import(base + `firebase-${m}.js`)));
  const a = app.getApps().length ? app.getApp() : app.initializeApp(CFG);
  FBX = { app: a, fs, au, db: fs.getFirestore(a), auth: au.getAuth(a) }; return FBX;
}
let FBST = null;
async function fbSt() {
  if (FBST) return FBST; const f = await fb(), st = await import(`https://www.gstatic.com/firebasejs/${FB_V}/firebase-storage.js`);
  FBST = { st, storage: st.getStorage(f.app) }; return FBST;
}
if (!DEMO) fb().catch(() => {});   // empieza a conectar apenas abre la página

/* ---------- Memoria rápida: muestra al instante lo de la última visita y lo actualiza por detrás ---------- */
const MEM = {
  get(k) { try { const x = JSON.parse(localStorage.getItem("am_c_" + k)); return x ? x.v : undefined; } catch (e) { return undefined; } },
  set(k, v) { try { localStorage.setItem("am_c_" + k, JSON.stringify({ t: Date.now(), v })); } catch (e) {} }
};
// Devuelve lo guardado al instante (si hay) y trae lo nuevo por detrás; si cambió, avisa con alCambiar(nuevo)
async function rapido(k, traer, alCambiar) {
  if (DEMO || window.ES_PANEL) return traer();   // el panel siempre trae lo último (ahí se edita)
  const viejo = MEM.get(k);
  const nuevo = traer().then(v => { MEM.set(k, v); if (viejo !== undefined && JSON.stringify(v) !== JSON.stringify(viejo) && alCambiar) alCambiar(v); return v; });
  if (viejo !== undefined) { nuevo.catch(() => {}); return viejo; }
  return nuevo;
}

/* ---------- Base de datos (Firebase o demo en este navegador) ---------- */
const LDB = { get() { let d = store.get("am_db", null); if (!d) { d = window.AM_DEMO ? window.AM_DEMO() : {}; store.set("am_db", d); } return d; }, save(d) { store.set("am_db", d); } };
const OPS = { "==": (a, b) => a === b, "!=": (a, b) => a !== b, ">=": (a, b) => a >= b, "<=": (a, b) => a <= b, ">": (a, b) => a > b, "<": (a, b) => a < b, "in": (a, b) => b.includes(a), "array-contains": (a, b) => (a || []).includes(b) };
const ESCUCHAS = new Set();
const DB = {
  async list(col, ...conds) {
    if (DEMO) return Object.entries(LDB.get()[col] || {}).map(([id, v]) => ({ ...v, id })).filter(x => conds.every(([f, o, v]) => OPS[o](x[f], v)));
    const { fs, db } = await fb();
    const q = conds.length ? fs.query(fs.collection(db, col), ...conds.map(([f, o, v]) => fs.where(f, o, v))) : fs.collection(db, col);
    return (await fs.getDocs(q)).docs.map(x => ({ ...x.data(), id: x.id }));
  },
  async get(col, id) {
    if (DEMO) { const v = (LDB.get()[col] || {})[id]; return v ? { ...v, id } : null; }
    const { fs, db } = await fb(), x = await fs.getDoc(fs.doc(db, col, id)); return x.exists() ? { ...x.data(), id: x.id } : null;
  },
  async set(col, id, data, merge = true) { return DB.batch([{ op: "set", col, id, data, merge }]); },
  async del(col, id) { return DB.batch([{ op: "del", col, id }]); },
  async batch(ops) {
    ops = ops.map(o => o.data ? { ...o, data: limpiar(o.data) } : o);
    if (DEMO) { const d = LDB.get(); ops.forEach(o => { d[o.col] = d[o.col] || {}; if (o.op === "del") delete d[o.col][o.id]; else d[o.col][o.id] = o.merge === false ? o.data : mezclar(d[o.col][o.id] || {}, o.data); }); LDB.save(d); ESCUCHAS.forEach(f => f()); return; }
    const { fs, db } = await fb();
    for (let i = 0; i < ops.length; i += 450) { const b = fs.writeBatch(db); ops.slice(i, i + 450).forEach(o => o.op === "del" ? b.delete(fs.doc(db, o.col, o.id)) : b.set(fs.doc(db, o.col, o.id), o.data, { merge: o.merge !== false })); await b.commit(); }
  },
  // Transacción: fn(get, set). Si dos personas lo hacen a la vez, solo una gana (ej. tomar un pedido).
  async transaccion(fn) {
    if (DEMO) { const d = LDB.get(), ops = []; const r = await fn(async (col, id) => { const v = (d[col] || {})[id]; return v ? { ...v, id } : null; }, (col, id, data) => ops.push({ op: "set", col, id, data })); await DB.batch(ops); return r; }
    const { fs, db } = await fb();
    return fs.runTransaction(db, t => fn(async (col, id) => { const x = await t.get(fs.doc(db, col, id)); return x.exists() ? { ...x.data(), id: x.id } : null; }, (col, id, data) => t.set(fs.doc(db, col, id), limpiar(data), { merge: true })));
  },
  // Escucha en vivo un documento: cb(doc|null). Devuelve la función para dejar de escuchar.
  escuchar(col, id, cb) {
    if (DEMO) { const f = async () => cb(await DB.get(col, id)); f(); const t = setInterval(f, 3000); ESCUCHAS.add(f); return () => { clearInterval(t); ESCUCHAS.delete(f); }; }
    let stop = () => {}, vivo = true;
    fb().then(({ fs, db }) => { if (vivo) stop = fs.onSnapshot(fs.doc(db, col, id), x => cb(x.exists() ? { ...x.data(), id: x.id } : null), e => console.warn("escuchar", e.code)); });
    return () => { vivo = false; stop(); };
  },
  // Escucha en vivo una lista con filtros: cb(lista)
  escucharLista(col, conds, cb) {
    if (DEMO) { const f = async () => cb(await DB.list(col, ...conds)); f(); const t = setInterval(f, 4000); ESCUCHAS.add(f); return () => { clearInterval(t); ESCUCHAS.delete(f); }; }
    let stop = () => {}, vivo = true;
    fb().then(({ fs, db }) => { if (!vivo) return; const q = fs.query(fs.collection(db, col), ...conds.map(([f, o, v]) => fs.where(f, o, v)));
      stop = fs.onSnapshot(q, s => cb(s.docs.map(x => ({ ...x.data(), id: x.id }))), e => console.warn("escucharLista", e.code)); });
    return () => { vivo = false; stop(); };
  }
};
// Igual que Firebase con merge: los objetos se combinan por dentro; listas y valores se reemplazan
function mezclar(a, b) { const r = { ...a }; for (const k in b) { const v = b[k]; r[k] = v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k]) ? mezclar(a[k], v) : v; } return r; }
function limpiar(o) { if (Array.isArray(o)) return o.map(limpiar); if (o && typeof o === "object") { const r = {}; for (const k in o) if (o[k] !== undefined) r[k] = limpiar(o[k]); return r; } return o; }

/* ---------- Fotos: se suben a Firebase Storage y se guarda solo el enlace ---------- */
async function subirFoto(ruta, dataURL) {
  if (!dataURL || !String(dataURL).startsWith("data:")) return dataURL || "";
  if (DEMO) return dataURL;
  const { st, storage } = await fbSt(), r = st.ref(storage, ruta);
  await st.uploadString(r, dataURL, "data_url"); return st.getDownloadURL(r);
}

// Documentos privados (DNI, antecedentes, capturas): se guarda la RUTA, no un enlace público.
// Solo el dueño y el admin pueden abrirlos (reglas de Storage).
async function subirPrivado(ruta, dataURL) {
  if (!dataURL || !String(dataURL).startsWith("data:")) return dataURL || "";
  if (DEMO) return dataURL;
  const { st, storage } = await fbSt(); await st.uploadString(st.ref(storage, ruta), dataURL, "data_url"); return ruta;
}
async function verPrivado(ruta) {
  if (!ruta || /^(data:|https?:|blob:)/.test(ruta)) return ruta || "";
  const { st, storage } = await fbSt(); return st.getDownloadURL(st.ref(storage, ruta));
}
const leerArchivo = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(f); });

/* ---------- Avisos al celular (notificaciones push), aunque la app esté cerrada ---------- */
// app: "web" (clientes) · "panel" (negocios y admin) · "rep" (repartidores)
function estadoAvisos() {
  if (DEMO) return "demo";
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent), app = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return ios && !app ? "ios" : "nosoporta";
  if (Notification.permission === "denied") return "bloqueado";
  return Notification.permission === "granted" && store.get("am_fcm_ok", 0) ? "ok" : "pendiente";
}
async function activarAvisos(app, silencioso) {
  const e = estadoAvisos(); if (["demo", "nosoporta", "ios", "bloqueado"].includes(e)) return e;
  const vapid = CONF.vapid || AP.vapid; if (!vapid) return "sinclave";
  const per = Notification.permission === "granted" ? "granted" : silencioso ? "default" : await Notification.requestPermission();
  if (per !== "granted") return per === "denied" ? "bloqueado" : "pendiente";
  try {
    const reg = await navigator.serviceWorker.register("sw.js"); await navigator.serviceWorker.ready;
    const f = await fb(), ms = await import(`https://www.gstatic.com/firebasejs/${FB_V}/firebase-messaging.js`);
    const token = await ms.getToken(ms.getMessaging(f.app), { vapidKey: vapid, serviceWorkerRegistration: reg });
    const u = f.auth.currentUser; if (!token || !u) return "error";
    if (!silencioso || store.get("am_fcm_tok", "") !== token || store.get("am_fcm_app", "") !== app)
      await DB.set("fcm", token, { uid: u.uid, app, ...(u.email ? { email: u.email } : {}), ua: navigator.userAgent.slice(0, 120), actualizado: new Date().toISOString() });
    store.set("am_fcm_ok", 1); store.set("am_fcm_tok", token); store.set("am_fcm_app", app); return "ok";
  } catch (x) { console.warn("avisos", x); return "error"; }
}
// Mensaje para la persona según cómo quedó
function textoAvisos(r) {
  return { ok: "🔔 ¡Listo! Te avisaremos aunque cierres la app.", bloqueado: "Las notificaciones están bloqueadas. Toca el candado 🔒 junto a la dirección → Permisos → Notificaciones → Permitir.",
    ios: "En iPhone, primero instala la app: Compartir ⬆️ → «Agregar a inicio», ábrela desde el ícono y activa los avisos ahí.", nosoporta: "Este navegador no permite avisos. Usa Chrome.",
    sinclave: "Falta configurar los avisos en el panel (clave VAPID).", pendiente: "No diste permiso para los avisos.", error: "No se pudieron activar los avisos. Inténtalo de nuevo.", demo: "En modo demo no hay avisos." }[r] || r;
}
// Si la app está abierta y llega un aviso, se muestra adentro (no como notificación)
if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", e => { const d = e.data || {}; if (d.tipo === "aviso") { toast(d.titulo + (d.cuerpo ? " · " + d.cuerpo : "")); window.alAviso && window.alAviso(d); } });

/* ---------- Sesión ---------- */
const Sesion = {
  usuario: null,
  // cb(usuario|null) cada vez que cambia la sesión
  async alCambiar(cb) {
    if (DEMO) { Sesion.usuario = store.get("am_sesion", null); cb(Sesion.usuario); return; }
    const { au, auth } = await fb();
    // Volviendo de la página de Google: si algo falló, lo dejamos escrito en pantalla
    const pend = sessionStorage.getItem("am_auth_pend"); sessionStorage.removeItem("am_auth_pend");
    au.getRedirectResult(auth).then(r => { if (pend && !r && !auth.currentUser) avisarErrorAuth("Volviste de Google, pero el navegador no guardó la sesión. Ábrelo en Chrome o Safari (no dentro de WhatsApp o Facebook) y vuelve a intentar."); })
      .catch(e => avisarErrorAuth(errorAuth(e)));
    au.onAuthStateChanged(auth, u => { Sesion.usuario = u ? { uid: u.uid, email: (u.email || "").toLowerCase(), nombre: u.displayName || "", foto: u.photoURL || "" } : null; cb(Sesion.usuario); });
  },
  async google() {
    if (DEMO) return Sesion._demo({ uid: "cli-demo", email: "cliente@demo.pe", nombre: "Cliente Demo", foto: "" });
    const { au, auth } = await fb(), p = new au.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
    const redirigir = () => { sessionStorage.setItem("am_auth_pend", "1"); return au.signInWithRedirect(auth, p); };
    // En celular o con la app instalada la ventanita emergente falla a menudo: vamos a Google y volvemos en la misma pestaña
    const movil = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) || matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    if (movil) return redirigir();
    try { await au.signInWithPopup(auth, p); }
    catch (e) { if (/popup-blocked|operation-not-supported|cancelled-popup/.test(e.code || "")) return redirigir(); if (!/popup-closed/.test(e.code || "")) throw e; }
  },
  async correo(email, pass) { if (DEMO) return Sesion._demo({ uid: "u-" + slug(email), email, nombre: "" }); const { au, auth } = await fb(); await au.signInWithEmailAndPassword(auth, email, pass); },
  async crear(email, pass) { if (DEMO) return Sesion._demo({ uid: "u-" + slug(email), email, nombre: "" }); const { au, auth } = await fb(); await au.createUserWithEmailAndPassword(auth, email, pass); },
  async recuperar(email) { if (DEMO) return; const { au, auth } = await fb(); await au.sendPasswordResetEmail(auth, email); },
  async salir() { if (DEMO) { store.del("am_sesion"); location.reload(); return; } const { au, auth } = await fb(); await au.signOut(auth); location.reload(); },
  _demo(u) { store.set("am_sesion", u); location.reload(); }
};
// Error al entrar con Google: queda escrito en la pantalla de entrada (no solo un aviso que desaparece)
function avisarErrorAuth(m) { try { sessionStorage.setItem("am_auth_err", m); } catch (e) {} $$(".js-auth-err").forEach(x => x.textContent = m); toast(m, true); }
function errorAuthGuardado(el) { const m = sessionStorage.getItem("am_auth_err"); if (m && el) { el.textContent = m; sessionStorage.removeItem("am_auth_err"); } }
const esAdmin = u => !!u && (AP.admins || []).map(x => x.toLowerCase()).includes(String(u.email || "").toLowerCase());
const errorAuth = e => ({ "auth/invalid-credential": "Correo o contraseña incorrectos.", "auth/wrong-password": "Correo o contraseña incorrectos.", "auth/user-not-found": "No existe una cuenta con ese correo.",
  "auth/email-already-in-use": "Ese correo ya tiene cuenta. Entra con «Ya tengo cuenta».", "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.", "auth/invalid-email": "El correo no es válido.",
  "auth/unauthorized-domain": "Falta autorizar este dominio en Firebase → Authentication → Dominios autorizados.", "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.",
  "auth/network-request-failed": "Sin conexión a internet. Revisa tu señal e inténtalo de nuevo.", "auth/web-storage-unsupported": "Tu navegador bloquea el inicio de sesión. Ábrelo en Chrome o Safari.",
  "auth/internal-error": "Google no respondió. Inténtalo de nuevo en unos segundos.", "auth/operation-not-allowed": "El inicio con Google no está activado en Firebase → Authentication." }[e.code] || ("No se pudo: " + (e.code || e.message)));

/* ---------- Configuración general de la plataforma ---------- */
const WEB_BASE = { titulo: "¿Qué quieres hoy?", subtitulo: "Pide a los negocios de tu ciudad. Te lo traemos a tu puerta.", buscador: "Busca comida, farmacia, ferretería…", anuncio: "",
  mostrarBanners: true, mostrarDestacados: true, tituloDestacados: "Lo más recomendado", tituloNegocios: "Negocios en tu ciudad", pie: "Te lo traemos. Pide a los negocios de tu ciudad.", facebook: "", instagram: "", tiktok: "" };
// rep: lo que paga el repartidor (casaca y % de su ganancia del día). cobro: Yape de Apamuy donde le pagan.
const CONFIG_BASE = { comision: 10, delivery: { base: 4, porKm: 1, maxKm: 15, maxKmGrande: 50 }, centro: AP.centro || { lat: -13.5226, lng: -71.9673 }, soporte: "", ciudadInicial: { dep: "Cusco", prov: "Cusco" }, web: WEB_BASE, tipos: [],
  rep: { comision: 10, casaca: 40 }, cobro: { yape: "", titular: "", qr: "" },
  envio: { minimo: 5, base: 5, porKm: 1.2, factorGrande: 1.5, maxKm: 300 } };
let CONF = { ...CONFIG_BASE };
function aplicarConfig(c) { c = c || {};
  CONF = { ...CONFIG_BASE, ...c, delivery: { ...CONFIG_BASE.delivery, ...(c.delivery || {}) }, web: { ...WEB_BASE, ...(c.web || {}) }, rep: { ...CONFIG_BASE.rep, ...(c.rep || {}) }, cobro: { ...CONFIG_BASE.cobro, ...(c.cobro || {}) }, envio: { ...CONFIG_BASE.envio, ...(c.envio || {}) }, tipos: c.tipos || [], tarifas: c.tarifas || [] }; return CONF; }
// alCambiar: si la configuración cambió desde la última visita (se avisa después de mostrar la guardada)
async function cargarConfig(alCambiar) { return aplicarConfig(await rapido("config", () => DB.get("config", "general").then(c => c || {}), c => { aplicarConfig(c); alCambiar && alCambiar(); })); }

/* ---------- Rubros (Comida, Farmacia, Talleres…) que crea el admin ---------- */
let RUBROS = [];
function aplicarRubros(l, todos) { RUBROS = (l || []).filter(r => todos || r.activo !== false).sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99)); return RUBROS; }
async function cargarRubros(todos, alCambiar) { return aplicarRubros(await rapido("rubros", () => DB.list("rubros"), l => { aplicarRubros(l, todos); alCambiar && alCambiar(); }).catch(() => []), todos); }
const rubroDe = id => RUBROS.find(r => r.id === id) || { id, nombre: id || "", tipos: [], modo: "productos" };
// Rubros de envío grande (Ferretería y Talleres): van en carro; si el pedido es pequeño, solo en moto
const envioGrande = id => { const r = rubroDe(id); return r.envioGrande ?? ["ferreteria", "talleres"].includes(id); };
// Rubros que reciben «Buscar repuesto» (Ferretería, Talleres y los que marque el admin, ej. Repuestos)
const recibeBusq = id => { const r = rubroDe(id); return r.buscaRepuestos ?? ["ferreteria", "talleres", "repuestos"].includes(id); };
const rubrosBusq = () => { const l = RUBROS.filter(r => recibeBusq(r.id)).map(r => r.id); return l.length ? l.slice(0, 10) : ["ferreteria", "talleres"]; };
// Las imágenes de ejemplo viven en la web de clientes (img/rubros/…). El panel las pide desde ahí.
const imgUrl = src => !src ? "" : /^(https?:|data:|blob:)/.test(src) ? src : (window.ES_PANEL ? String(AP.web || "").replace(/\/$/, "") + "/" : "") + src;

/* ---------- Ciudad (provincia) del cliente y del negocio ---------- */
const provKey = (dep, prov) => `${dep}|${prov}`;
// Distrito más cercano a un punto (con la lista oficial de distritos del Perú)
function ciudadCercana(p) {
  if (!p || !window.UBIGEO) return null; let best = null, bd = 1e9;
  for (const [dep, provs] of Object.entries(UBIGEO)) for (const [prov, dis] of Object.entries(provs)) for (const [d, la, lo] of dis) { if (la == null) continue; const x = (la - p.lat) ** 2 + (lo - p.lng) ** 2; if (x < bd) { bd = x; best = { dep, prov, dis: d }; } }
  return best;
}
const centroDe = (dep, prov, dis) => { const l = ((window.UBIGEO || {})[dep] || {})[prov] || []; const x = (dis && l.find(d => d[0] === dis)) || l.find(d => d[0] === prov) || l[0]; return x && x[1] != null ? { lat: x[1], lng: x[2] } : null; };

/* ---------- Distancia y costo del delivery ---------- */
function distanciaKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371, rad = x => x * Math.PI / 180, dLa = rad(b.lat - a.lat), dLo = rad(b.lng - a.lng);
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h)) * 1.3;   // ×1.3: las calles no van en línea recta
}
// Lo que cobra el repartidor: base + por km, redondeado a 0.50
function costoDelivery(km, d = CONF.delivery) { if (km == null) return null; if (km > d.maxKm) return -1; return Math.ceil((d.base + Math.max(0, km - 1) * d.porKm) * 2) / 2; }

/* ---------- Zona de delivery: máximo del admin, radio de cada negocio y tarifa por provincia ---------- */
// Tarifa de una provincia ("Dep|Prov"). Si el admin no le puso una, se usa la general.
function tarifaProv(prov) {
  const t = (CONF.tarifas || []).find(x => x.prov === prov) || {}, n = v => v === "" || v == null || isNaN(+v) ? null : +v;
  return { delivery: { ...CONF.delivery, ...(n(t.base) != null ? { base: n(t.base) } : {}), ...(n(t.porKm) != null ? { porKm: n(t.porKm) } : {}) },
    envio: { ...CONF.envio, ...(n(t.eBase) != null ? { base: n(t.eBase) } : {}), ...(n(t.ePorKm) != null ? { porKm: n(t.ePorKm) } : {}), ...(n(t.eMin) != null ? { minimo: n(t.eMin) } : {}) }, propia: !!t.prov };
}
// Máximo del admin: comida y tiendas (15 km) · ferreterías y talleres (50 km)
const maxKmRubro = rubro => envioGrande(rubro || "comida") ? (+CONF.delivery.maxKmGrande || 50) : (+CONF.delivery.maxKm || 15);
// Radio del negocio: lo que él puso, sin pasar el máximo del admin
const radioNeg = n => { const m = maxKmRubro(n && n.rubro), r = +(n && n.radioKm) || 0; return r > 0 ? Math.min(r, m) : m; };
// Costo del delivery de ESTE negocio hasta el cliente (-1 = no llega)
const costoNeg = (n, km) => costoDelivery(km, { ...tarifaProv(n && n.prov).delivery, maxKm: radioNeg(n) });
// ¿Le llega el delivery? true / false / null (aún no sabemos la dirección)
const llegaDelivery = (n, km) => n.delivery === false ? false : km == null ? null : km <= radioNeg(n);
// Tiempo estimado: el tiempo del negocio + lo que tarda el repartidor (~2.5 min por km después de los primeros 3 km)
function tiempoEst(n, km) {
  const m = String(n.tiempo || "").match(/\d+/g) || ["30", "40"]; let a = +m[0], b = m[1] ? +m[1] : a + 10;
  if (km != null && km > 3) { const x = Math.round((km - 3) * 2.5 / 5) * 5; a += x; b += x; }
  return b >= 120 ? `${Math.round(a / 60 * 2) / 2}-${Math.round(b / 60 * 2) / 2} h` : `${a}-${b} min`;
}
// A qué repartidores se avisa primero: cada 3 min se amplía (km desde el negocio). Después: toda la provincia.
const anillosDe = rubro => envioGrande(rubro || "comida") ? [10, 25] : [5, 10];
const PASO_ANILLO = 3 * 60e3;
// Hasta dónde llega el aviso ahora mismo (Infinity = toda la provincia)
function radioAviso(o, ahora = Date.now()) { const an = o.anillos || [5, 10], t = new Date(o.creado || o.buscadoEn || 0).getTime(), i = Math.floor(Math.max(0, ahora - t) / PASO_ANILLO); return i < an.length ? an[i] : Infinity; }

/* ---------- Horario del negocio (hora de Lima) ---------- */
function estaAbierto(n) {
  if (!n) return false; if (n.estadoManual === "abierto") return true; if (n.estadoManual === "cerrado") return false;
  const d = new Date(Date.now() - 5 * 3600e3), dia = d.getUTCDay(), min = d.getUTCHours() * 60 + d.getUTCMinutes(), aMin = h => { const [x, y] = String(h || "0:0").split(":"); return (+x || 0) * 60 + (+y || 0); };
  const a = aMin(n.abre || "11:00"), c = aMin(n.cierra || "22:00"), dias = n.dias || [0, 1, 2, 3, 4, 5, 6];
  if (c > a) return dias.includes(dia) && min >= a && min < c;
  return (dias.includes(dia) && min >= a) || (dias.includes((dia + 6) % 7) && min < c);
}

/* ---------- Mapas (OpenStreetMap, gratis) ---------- */
// Leaflet 1.9.4 va dentro de cada web (carpeta lib/): el mapa no depende de servidores externos
const LEAF = "lib/leaflet", LEAF_CDN = "https://unpkg.com/leaflet@1.9.4/dist/leaflet";
async function cargarLeaflet() {   // (no se llama «leaflet»: la librería pisa window.leaflet al cargar)
  if (window.L && window.L.map) return window.L;
  cargarCSS(LEAF + ".css");
  try { await cargarScript(LEAF + ".js"); } catch (e) { cargarCSS(LEAF_CDN + ".css"); await cargarScript(LEAF_CDN + ".js"); }   // respaldo
  return window.L;
}
// Si el mapa no carga (sin señal), deja un botón para reintentar
function mapaFallo(el, reintentar) { el.innerHTML = `<div class="mapa-err"><p>No se pudo cargar el mapa. Revisa tu señal.</p><button type="button" class="btn btn-light btn-sm">Reintentar</button></div>`; el.querySelector("button").onclick = reintentar; }
const pinIcono = (L, color, txt) => L.divIcon({ className: "am-pin", html: `<span style="--c:${color}"><i>${txt || ""}</i></span>`, iconSize: [34, 42], iconAnchor: [17, 40] });
// Mapa con un pin que se puede mover. onMover({lat,lng}) cada vez que cambia.
async function mapaPin(el, pos, onMover, opts = {}) {
  let L; try { L = await cargarLeaflet(); } catch (e) { mapaFallo(el, () => mapaPin(el, pos, onMover, opts)); return null; }
  const p = pos && pos.lat != null ? pos : CONF.centro;
  const m = L.map(el, { zoomControl: true, attributionControl: true }).setView([p.lat, p.lng], pos && pos.lat != null ? 17 : 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(m);
  const mk = L.marker([p.lat, p.lng], { draggable: !opts.fijo, icon: pinIcono(L, opts.color || "#E63946", opts.txt || "") }).addTo(m);
  const avisar = () => { const ll = mk.getLatLng(); onMover && onMover({ lat: +ll.lat.toFixed(6), lng: +ll.lng.toFixed(6) }); };
  if (!opts.fijo) { mk.on("dragend", avisar); m.on("click", e => { mk.setLatLng(e.latlng); avisar(); }); }
  setTimeout(() => m.invalidateSize(), 200);
  return { mapa: m, marcador: mk, mover(q) { mk.setLatLng([q.lat, q.lng]); m.setView([q.lat, q.lng], 17); avisar(); } };
}
// Mapa de seguimiento con varios puntos: [{lat,lng,color,txt}]
async function mapaPuntos(el, puntos) {
  let L; try { L = await cargarLeaflet(); } catch (e) { console.warn("mapa", e); mapaFallo(el, () => mapaPuntos(el, puntos)); return null; }
  el.innerHTML = "";
  const m = L.map(el, { zoomControl: false }); L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(m);
  const capa = L.layerGroup().addTo(m);
  const pintar = ps => { capa.clearLayers(); const ok = ps.filter(x => x && x.lat != null); ok.forEach(x => L.marker([x.lat, x.lng], { icon: pinIcono(L, x.color, x.txt) }).addTo(capa));
    if (ok.length > 1) m.fitBounds(ok.map(x => [x.lat, x.lng]), { padding: [40, 40], maxZoom: 16 }); else if (ok[0]) m.setView([ok[0].lat, ok[0].lng], 16); };
  pintar(puntos); setTimeout(() => m.invalidateSize(), 200);
  return { mapa: m, pintar };
}
function miUbicacion() { return new Promise((ok, no) => { if (!navigator.geolocation) return no(new Error("sin GPS")); navigator.geolocation.getCurrentPosition(p => ok({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) }), no, { enableHighAccuracy: true, timeout: 15000 }); }); }

/* ---------- Pedidos ---------- */
const EST_P = { "por-validar": ["Pago por validar", "warn"], nuevo: ["Nuevo", "pri"], cocina: ["Preparando", "fire"], listo: ["Listo", "info"], camino: ["En camino", "info"], entregado: ["Entregado", "ok"], rechazado: ["Pago rechazado", "bad"], anulado: ["Anulado", "bad"] };
const VEHIC = { moto: ["🛵", "Moto"], bici: ["🚲", "Bici"], carro: ["🚗", "Carro"] };
const vehTxt = v => (VEHIC[v] || ["🛵", v || ""]).join(" ");
// ¿Este repartidor puede llevar esta oferta? todos | carro (envío grande) | moto (envío pequeño de ferretería/taller)
const puedeLlevar = (oferta, veh) => !oferta.vehiculo || oferta.vehiculo === "todos" || oferta.vehiculo === veh;
/* ---------- Envíos de paquetes (el cliente pone el precio, estilo inDrive) ---------- */
const TAM = { sobre: ["Sobre o documentos", "Cartas, papeles, llaves"], pequeno: ["Paquete pequeño", "Cabe en una mochila"], grande: ["Paquete grande", "Solo en carro: cajas, bultos"] };
const EST_E = { buscando: ["Buscando repartidor", "warn"], asignado: ["Repartidor en camino al recojo", "info"], camino: ["En camino a la entrega", "info"], entregado: ["Entregado", "ok"], cancelado: ["Cancelado", "bad"] };
// Precio sugerido (solo guía: el cliente decide). Redondeado a 0.50 y nunca menos del mínimo.
function sugerirEnvio(km, tam, e = CONF.envio) { if (km == null) return e.minimo; const v = (e.base + Math.max(0, km - 1) * e.porKm) * (tam === "grande" ? e.factorGrande : 1); return Math.max(e.minimo, Math.ceil(v * 2) / 2); }
// ¿Un repartidor puede llevar este envío? Grande = solo carro. Bici: hasta 15 km y en la misma ciudad.
const puedeEnvio = (en, veh) => (en.tamano !== "grande" || veh === "carro") && (veh !== "bici" || (!en.interprov && (en.km || 0) <= 15));
// Estrellas del repartidor: ★ 4.8 (12)
const promEstrellas = r => r && r.estrellasN ? Math.round(r.estrellasSum / r.estrellasN * 10) / 10 : null;
const estrellasTxt = (prom, n) => prom ? `★ ${prom.toFixed(1)}${n ? ` (${n})` : ""}` : "Nuevo";
const tokenRastreo = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => "abcdefghijkmnopqrstuvwxyz23456789"[b % 33]).join("");
const detItem = i => [i.opts, i.extras ? "Extras: " + i.extras : "", i.nota ? "Nota: " + i.nota : ""].filter(Boolean);
