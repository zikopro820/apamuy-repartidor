/* =========================================================
   APAMUY — App del repartidor
   Registro con documentos → el admin aprueba → «Disponible» →
   el pedido le llega a todos → el primero que acepta lo lleva.
   Paga a Apamuy el % de lo que gana cada día; si no paga, se bloquea.
   ========================================================= */
let YO = null, REP = null, TAB = "pedidos", ACT = [], OFS = [], POS = null, PAGOS = [], GAN = { dias: [], deuda: [], hoy: null };
const MAX_ACT = 2;                  // pedidos a la vez
const ACTIVOS_R = ["nuevo", "cocina", "listo", "camino"];
const pctRep = () => +CONF.rep.comision || 0;
const ahora = () => new Date().toISOString();
const soatVencido = r => r && ["moto", "carro"].includes(r.vehiculo) && r.soatVence && r.soatVence < HOY();
const nav = (la, lo) => `https://www.google.com/maps/dir/?api=1&destination=${la},${lo}`;

/* ================= ARRANQUE ================= */
(async () => {
  await cargarConfig().catch(() => {}); await cargarRubros(true).catch(() => {});
  let ini = false;
  Sesion.alCambiar(async u => {
    if (ini) return location.reload(); ini = true; YO = u;
    if (!u) return pantallaEntrar();
    if (esAdmin(u)) { document.body.innerHTML = `<main class="centro"><img src="favicon.svg" width="64" height="64" alt=""><h1>Eres el administrador</h1><p>Revisa a los repartidores desde el panel.</p><a class="btn btn-pri btn-lg" href="${esc(AP.panel)}">Ir al panel</a><button class="btn-link" id="sx">Salir</button></main>`; $("#sx").onclick = () => Sesion.salir(); return; }
    REP = await DB.get("repartidores", u.uid).catch(() => null);
    if (!REP) return registro(null);
    if (REP.estado === "activo") return app();
    enRevision();
  });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();

/* ================= ENTRAR ================= */
function pantallaEntrar() {
  document.body.innerHTML = `<main class="entrar"><div class="e-top"><img src="favicon.svg" alt="" width="76" height="76"><h1>Reparte con Apamuy</h1><p>Gana dinero llevando pedidos de los negocios de tu ciudad. Tú eliges cuándo trabajas.</p></div>
    <ul class="e-l"><li><b>✅ Inscripción gratis</b><span>Solo pagas tu casaca Apamuy: <b>${S(CONF.rep.casaca)}</b>.</span></li><li><b>🛵 🚲 🚗 Moto, bici o carro</b><span>Con carro también llevas los pedidos grandes (ferreterías y talleres).</span></li>
      <li><b>💵 El delivery es tuyo</b><span>Lo cobras en la puerta. A Apamuy le pagas el <b>${pctRep()}%</b> de lo que ganes cada día.</span></li></ul>
    <div class="e-b">${DEMO ? `<div class="demo-n"><b>MODO DEMO</b> · elige con qué cuenta probar:</div>${[["rep-juan", "Juan · moto (activo)"], ["rep-carlos", "Carlos · carro (debe su 10 %)"], ["rep-ana", "Ana · bici (en revisión)"], ["rep-nuevo", "Repartidor nuevo (registrarse)"]].map(([u, t]) => `<button class="btn btn-light btn-lg" data-demo="${u}">${t}</button>`).join("")}`
      : `<button class="btn btn-google btn-lg" id="eG"><svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Entrar con Google</button>
        <p class="muted sm">Entra con tu cuenta de Google. Si es tu primera vez, te pedimos tus datos para registrarte.</p><p class="l-err" id="eErr" role="alert"></p>`}</div></main>`;
  if (DEMO) return $$("[data-demo]").forEach(b => b.onclick = () => Sesion._demo({ uid: b.dataset.demo, email: b.dataset.demo + "@demo.pe", nombre: "" }));
  $("#eG").onclick = async () => { $("#eErr").textContent = ""; try { await Sesion.google(); } catch (e) { $("#eErr").textContent = errorAuth(e); } };
}

/* ================= REGISTRO (7 pasos) ================= */
const PASOS_R = ["Tus datos", "Tu DNI", "Vehículo", "Antecedentes", "Domicilio", "Declaración", "Casaca"];
function registro(prev) {
  const R = prev ? JSON.parse(JSON.stringify(prev)) : { nombre: YO.nombre || "", celular: "", departamento: CONF.ciudadInicial.dep, provincia: CONF.ciudadInicial.prov, talla: "M", vehiculo: "moto", domicilio: null, casaca: {} };
  // Archivos: data:… (nuevo) o la ruta que ya estaba guardada
  const A = { foto: R.foto || "", dniFrente: R.dniFrente || "", dniReverso: R.dniReverso || "", licenciaFoto: R.licenciaFoto || "", soatFoto: R.soatFoto || "", vehiculoFoto: R.vehiculoFoto || "", antecedentes: R.antecedentes || "", casacaCap: (R.casaca || {}).captura || "" };
  let paso = 0, firma = null, MP = null;
  document.body.innerHTML = `<header class="r-h"><img src="favicon.svg" alt="" width="34" height="34"><div><b>Registro de repartidor</b><small id="rPaso"></small></div><button class="btn btn-light btn-sm" id="rSalir">Salir</button></header>
    <div class="r-prog"><i id="rBar"></i></div>${prev && prev.motivo ? `<div class="alert bad r-al">⚠️ <span><b>Corrige esto:</b> ${esc(prev.motivo)}</span></div>` : ""}
    <form id="rF" class="r-f" novalidate><div id="rC"></div><p class="l-err" id="rErr" role="alert"></p><div class="r-b"><button type="button" class="btn btn-light" id="rAtras">Atrás</button><button class="btn btn-pri" id="rSig">Siguiente</button></div></form>`;
  $("#rSalir").onclick = () => Sesion.salir();
  const F = $("#rF"), err = $("#rErr");
  const foto = (k, t, ayuda, cap = "environment", pdf) => { const v = A[k], es = String(v).startsWith("data:application/pdf") || /\.pdf$/i.test(v);
    return `<div class="up ${v ? "ok" : ""}" data-up="${k}"><span class="up-v" ${v && !es && String(v).startsWith("data:") ? `style="background-image:url('${esc(v)}')"` : ""}>${!v ? "📷" : es ? "📄" : String(v).startsWith("data:") ? "" : "✅"}</span><div><b>${t}</b><small>${ayuda}</small>
      <label class="btn btn-light btn-sm">${v ? "Cambiar" : pdf ? "Subir foto o PDF" : "Tomar / subir foto"}<input type="file" accept="image/*${pdf ? ",application/pdf" : ""}" ${pdf ? "" : `capture="${cap}"`} data-f="${k}" hidden></label></div></div>`; };
  const pintar = () => {
    $("#rPaso").textContent = `Paso ${paso + 1} de ${PASOS_R.length} · ${PASOS_R[paso]}`; $("#rBar").style.width = ((paso + 1) / PASOS_R.length * 100) + "%";
    $("#rAtras").hidden = !paso; $("#rSig").textContent = paso === PASOS_R.length - 1 ? (prev ? "Enviar corrección" : "Enviar mi registro") : "Siguiente"; err.textContent = "";
    const U = window.UBIGEO || {}, op = (l, v) => l.map(x => `<option ${x === v ? "selected" : ""}>${esc(x)}</option>`).join("");
    const C = $("#rC");
    if (paso === 0) C.innerHTML = `<h2>👤 Tus datos</h2><p class="muted">Escríbelos tal como están en tu DNI.</p><div class="g2">
      ${fld("nombre", "Nombres y apellidos", R.nombre, { req: true, full: true })}${fld("dni", "N° de DNI", R.dni || "", { req: true, extra: 'inputmode="numeric" maxlength="8"' })}${fld("nacimiento", "Fecha de nacimiento", R.nacimiento || "", { type: "date", req: true })}
      ${fld("celular", "Celular (WhatsApp)", R.celular, { type: "tel", req: true, extra: 'inputmode="numeric" maxlength="9"' })}${fld("talla", "Talla de tu casaca", R.talla, { opts: ["S", "M", "L", "XL", "XXL"] })}
      <label class="fld"><span>Departamento donde trabajarás</span><select name="departamento" id="rDep">${op(Object.keys(U).sort(), R.departamento)}</select></label><label class="fld"><span>Provincia (ciudad)</span><select name="provincia" id="rProv"></select></label></div>
      <p class="muted sm">Te llegan los pedidos de los negocios de esa ciudad.</p>`;
    if (paso === 1) C.innerHTML = `<h2>🪪 Verificamos que eres tú</h2><p class="muted">Fotos claras, con buena luz y sin reflejos. Solo el administrador de Apamuy las ve.</p>
      ${foto("foto", "Selfie (foto de tu cara)", "Sin lentes oscuros ni gorra.", "user")}${foto("dniFrente", "DNI · parte de adelante", "Que se lean tu nombre y número.")}${foto("dniReverso", "DNI · parte de atrás", "Que se lea tu dirección.")}`;
    if (paso === 2) C.innerHTML = `<h2>🛵 ¿Con qué vas a repartir?</h2><div class="veh">${Object.entries(VEHIC).map(([k, [e, t]]) => `<label class="veh-c"><input type="radio" name="vehiculo" value="${k}" ${R.vehiculo === k ? "checked" : ""}><span>${e}</span><b>${t}${k === "moto" ? " propia" : ""}</b><small>${{ moto: "Pedidos normales y pequeños de ferretería", bici: "Pedidos normales, distancias cortas", carro: "Pedidos normales y grandes (ferreterías y talleres)" }[k]}</small></label>`).join("")}</div>
      <div id="rMot"><div class="g2">${fld("placa", "Placa", R.placa || "", { req: true, ph: "Ej. 1234-4A" })}${fld("licencia", "N° de licencia de conducir", R.licencia || "", { req: true })}${fld("soatVence", "El SOAT vence el", R.soatVence || "", { type: "date", req: true })}</div>
        ${foto("soatFoto", "SOAT vigente", "Foto del certificado o de la página del SOAT electrónico.")}${foto("licenciaFoto", "Licencia de conducir", "La parte donde sale tu foto y la categoría.")}</div>
      ${foto("vehiculoFoto", "Foto de tu vehículo", "Que se vea completo (y la placa si tiene).")}`;
    if (paso === 3) C.innerHTML = `<h2>📄 Antecedentes policiales</h2><p class="muted">Sube tu <b>certificado de antecedentes policiales</b> vigente (foto o PDF). Lo revisamos antes de aprobarte.</p>${foto("antecedentes", "Certificado de antecedentes policiales", "Foto clara o el PDF que te dieron (máx. 4 MB).", "environment", true)}`;
    if (paso === 4) C.innerHTML = `<h2>🏠 ¿Dónde vives?</h2><p class="muted">Tu domicilio exacto. Lo ve solo el administrador.</p><button type="button" class="btn btn-acc" id="rGps">📍 Usar mi ubicación actual (GPS)</button>
      <div class="mapa" id="rMapa"></div><p class="muted sm">Mueve el pin hasta tu casa.</p><div class="g2">${fld("dir", "Dirección", (R.domicilio || {}).texto || "", { req: true, full: true, ph: "Calle, número, urbanización / APV" })}${fld("ref", "Referencia", (R.domicilio || {}).referencia || "", { full: true, ph: "Ej. frente al parque, puerta verde" })}</div>`;
    if (paso === 5) { const v = R.vehiculo, dom = R.domicilio || {};
      C.innerHTML = `<h2>✍️ Declaración jurada</h2><div class="dj"><p>Yo, <b>${esc(R.nombre)}</b>, identificado(a) con DNI N° <b>${esc(R.dni)}</b>, con domicilio en <b>${esc(dom.texto || "")}${dom.distrito ? ", " + esc(dom.distrito) : ""}</b>, declaro bajo juramento que:</p><ol>
        <li>Los datos y documentos que presento son verdaderos.</li><li>No tengo antecedentes policiales ni penales vigentes.</li>
        <li>${v === "bici" ? "Mi bicicleta está en buen estado y uso casco." : `Mi ${v === "carro" ? "carro" : "moto"} de placa <b>${esc(R.placa || "")}</b> tiene SOAT vigente y tengo licencia de conducir.`}</li>
        <li>Reparto de forma independiente: elijo mis horarios y acepto los pedidos que quiero.</li><li>Entregaré los pedidos completos y en buen estado, y trataré con respeto a clientes y negocios.</li>
        <li>Pagaré a Apamuy el <b>${pctRep()}%</b> de lo que gane cada día por delivery. Si no pago, mi cuenta se bloquea hasta ponerme al día.</li>
        <li>Si mis datos son falsos, Apamuy puede darme de baja, sin perjuicio de las acciones legales que correspondan.</li></ol><p class="muted sm">${fmtF(HOY(), { day: "numeric", month: "long", year: "numeric" })}</p></div>
        <span class="lbl">Firma aquí con tu dedo</span><div class="firma"><canvas id="rFirma"></canvas><button type="button" class="btn btn-light btn-sm" id="rBorrar">Borrar firma</button></div>
        ${fld("acepto", "Acepto esta declaración jurada", !!R.acepto, { type: "checkbox", full: true })}
        ${fld("consentimiento", "Autorizo a Apamuy a guardar mis datos personales y documentos solo para verificar mi identidad y gestionar mis repartos (Ley 29733). Solo el administrador puede verlos.", !!R.consentimiento, { type: "checkbox", full: true })}`; }
    if (paso === 6) { const c = CONF.cobro;
      C.innerHTML = `<h2>🧥 Tu casaca Apamuy</h2><div class="cas"><div><b>Inscripción: GRATIS</b><span>Solo pagas tu casaca (talla ${esc(R.talla)})</span></div><strong>${S(CONF.rep.casaca)}</strong></div>
        ${c.yape ? `<div class="yape">${c.qr ? `<img src="${esc(imgUrl(c.qr))}" alt="QR de Yape de Apamuy">` : ""}<div><small>Yapea a</small><b>${esc(c.yape)}</b><small>${esc(c.titular || "Apamuy")}</small></div></div>` : `<div class="alert warn">⚠️ <span>Pide el número de Yape de Apamuy${CONF.soporte ? ` por <a href="${esc(wa(CONF.soporte, "Hola, quiero pagar mi casaca de repartidor Apamuy"))}" target="_blank" rel="noopener">WhatsApp</a>` : ""}.</span></div>`}
        <div class="g2">${fld("operacion", "N° de operación del Yape", (R.casaca || {}).operacion || "", { req: true, extra: 'inputmode="numeric"' })}</div>${foto("casacaCap", "Captura del pago", "La pantalla de Yape que dice «¡Yapeaste!».", "environment")}
        <p class="muted sm">Cuando te aprobemos, coordinamos la entrega de tu casaca y ya puedes empezar a repartir.</p>`; }
    ligar();
  };
  const ligar = () => {
    $$("[data-f]", F).forEach(i => i.onchange = async e => { const f = e.target.files[0], k = e.target.dataset.f; if (!f) return;
      if (f.type === "application/pdf") { if (f.size > 4 * 1024 * 1024) return toast("El PDF pesa más de 4 MB", true); A[k] = await leerArchivo(f); }
      else A[k] = await redimensionar(f, k === "foto" ? 900 : 1400, .8);
      guardar(); pintar(); });
    if (paso === 0) { const U = window.UBIGEO || {}, dep = $("#rDep"), pv = () => { const ps = Object.keys(U[dep.value] || {}).sort(); $("#rProv").innerHTML = ps.map(x => `<option ${x === R.provincia ? "selected" : ""}>${esc(x)}</option>`).join(""); }; pv(); dep.onchange = pv; }
    if (paso === 2) { const v = () => { const r = ($("[name=vehiculo]:checked", F) || {}).value; $("#rMot").hidden = r === "bici"; $$("#rMot [required]").forEach(x => x.disabled = r === "bici"); }; $$("[name=vehiculo]", F).forEach(x => x.onchange = v); v(); }
    if (paso === 4) { const dom = R.domicilio || {};
      mapaPin($("#rMapa"), dom.lat != null ? dom : centroDe(R.departamento, R.provincia), q => R.domicilio = { ...(R.domicilio || {}), lat: q.lat, lng: q.lng }, { txt: "🏠" }).then(m => MP = m);
      $("#rGps").onclick = async () => { $("#rGps").disabled = true; try { const p = await miUbicacion(); MP && MP.mover(p); toast("Listo · revisa que el pin esté en tu casa"); } catch (e) { toast("Activa el GPS y da permiso de ubicación", true); } $("#rGps").disabled = false; }; }
    if (paso === 5) firma = padFirma($("#rFirma"), R.firmaData || "");
    if (paso === 5) $("#rBorrar").onclick = () => firma.borrar();
  };
  // Guarda lo escrito en R antes de cambiar de paso
  const guardar = () => { const d = datosForm(F);
    if (paso === 0) Object.assign(R, { nombre: d.nombre, dni: d.dni, nacimiento: d.nacimiento, celular: String(d.celular).replace(/\D/g, ""), talla: d.talla, departamento: d.departamento, provincia: d.provincia });
    if (paso === 2) Object.assign(R, { vehiculo: d.vehiculo || R.vehiculo, placa: (d.placa || "").toUpperCase(), licencia: (d.licencia || "").toUpperCase(), soatVence: d.soatVence });
    if (paso === 4) { R.domicilio = { ...(R.domicilio || {}), texto: d.dir, referencia: d.ref }; const c = R.domicilio.lat != null ? ciudadCercana(R.domicilio) : null; if (c) R.domicilio.distrito = c.dis; }
    if (paso === 5) { R.acepto = d.acepto; R.consentimiento = d.consentimiento; if (firma && !firma.vacia()) R.firmaData = firma.dato(); }
    if (paso === 6) R.casaca = { ...(R.casaca || {}), operacion: d.operacion };
  };
  const validar = () => {
    const req = $$("[required]:not(:disabled)", F).find(x => !String(x.value).trim()); if (req) { req.focus(); return "Completa: " + req.closest("label").querySelector("span").textContent.replace(" *", ""); }
    if (paso === 0) { if (!/^\d{8}$/.test(R.dni)) return "El DNI tiene 8 números."; if (R.celular.length !== 9) return "El celular tiene 9 números.";
      const ed = (Date.now() - new Date(R.nacimiento + "T12:00:00")) / 31557600000; if (!(ed >= 18)) return "Debes ser mayor de 18 años para repartir."; }
    if (paso === 1) { if (!A.foto) return "Falta tu selfie."; if (!A.dniFrente || !A.dniReverso) return "Faltan las fotos de tu DNI (adelante y atrás)."; }
    if (paso === 2) { if (R.vehiculo !== "bici") { if (!A.soatFoto) return "Falta la foto del SOAT."; if (!A.licenciaFoto) return "Falta la foto de tu licencia."; if (R.soatVence < HOY()) return "Tu SOAT está vencido. Necesitas un SOAT vigente."; } if (!A.vehiculoFoto) return "Falta la foto de tu vehículo."; }
    if (paso === 3 && !A.antecedentes) return "Falta tu certificado de antecedentes policiales.";
    if (paso === 4) { if (!R.domicilio || R.domicilio.lat == null) return "Mueve el pin (o usa el GPS) hasta tu casa."; }
    if (paso === 5) { if (!R.firmaData) return "Firma con tu dedo en el recuadro."; if (!R.acepto) return "Marca que aceptas la declaración jurada."; if (!R.consentimiento) return "Marca la autorización de tus datos personales."; }
    if (paso === 6) { if (!A.casacaCap) return "Sube la captura de tu pago."; }
    return "";
  };
  $("#rAtras").onclick = () => { guardar(); paso--; pintar(); scrollTo(0, 0); };
  F.onsubmit = async e => { e.preventDefault(); guardar(); const m = validar(); if (m) return err.textContent = m;
    if (paso < PASOS_R.length - 1) { paso++; pintar(); return scrollTo(0, 0); }
    const b = $("#rSig"); b.disabled = true; b.textContent = "Enviando… no cierres";
    try {
      const t = Date.now().toString(36), sub = (k, ext) => subirPrivado(`repartidores/${YO.uid}/${k}-${t}.${ext}`, A[k]), ext = k => String(A[k]).startsWith("data:application/pdf") ? "pdf" : "jpg";
      const up = {}; for (const k of ["foto", "dniFrente", "dniReverso", "vehiculoFoto", "antecedentes", ...(R.vehiculo !== "bici" ? ["soatFoto", "licenciaFoto"] : [])]) up[k] = await sub(k, ext(k));
      const firmaR = await subirPrivado(`repartidores/${YO.uid}/firma-${t}.png`, R.firmaData), cap = await sub("casacaCap", "jpg");
      const c = ciudadCercana(R.domicilio) || {};
      const data = { nombre: R.nombre, dni: R.dni, nacimiento: R.nacimiento, celular: R.celular, email: YO.email, talla: R.talla, departamento: R.departamento, provincia: R.provincia, prov: provKey(R.departamento, R.provincia),
        vehiculo: R.vehiculo, placa: R.vehiculo === "bici" ? "" : R.placa, licencia: R.vehiculo === "bici" ? "" : R.licencia, soatVence: R.vehiculo === "bici" ? "" : R.soatVence, ...up,
        domicilio: { texto: R.domicilio.texto, referencia: R.domicilio.referencia || "", lat: R.domicilio.lat, lng: R.domicilio.lng, distrito: R.domicilio.distrito || c.dis || "" },
        firma: firmaR, declaracion: { version: 1, fecha: ahora(), comision: pctRep() }, consentimiento: true, casaca: { monto: +CONF.rep.casaca, operacion: R.casaca.operacion, captura: cap, talla: R.talla },
        estado: "pendiente", disponible: false, actualizado: ahora() };
      if (!prev) data.creado = ahora();
      await DB.set("repartidores", YO.uid, data); toast("¡Registro enviado!"); location.reload();
    } catch (x) { console.error(x); b.disabled = false; b.textContent = "Enviar mi registro"; err.textContent = "No se pudo enviar: " + (x.code || x.message) + ". Revisa tu internet e inténtalo de nuevo."; }
  };
  pintar();
}
// Recuadro para firmar con el dedo
function padFirma(cv, previo) {
  const k = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; cv.width = w * k; cv.height = h * k; const g = cv.getContext("2d"); g.scale(k, k);
  g.lineWidth = 2.6; g.lineCap = g.lineJoin = "round"; g.strokeStyle = "#1A1430"; let pinta = false, vacia = true, ult = null;
  const fondo = () => { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); }; fondo();
  if (previo) { const im = new Image(); im.onload = () => { g.drawImage(im, 0, 0, w, h); vacia = false; }; im.src = previo; }
  const pt = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.onpointerdown = e => { pinta = true; ult = pt(e); cv.setPointerCapture(e.pointerId); };
  cv.onpointermove = e => { if (!pinta) return; const p = pt(e); g.beginPath(); g.moveTo(...ult); g.lineTo(...p); g.stroke(); ult = p; vacia = false; };
  cv.onpointerup = cv.onpointercancel = () => pinta = false;
  return { vacia: () => vacia, dato: () => cv.toDataURL("image/png"), borrar() { fondo(); vacia = true; } };
}

/* ================= EN REVISIÓN / RECHAZADO / SUSPENDIDO ================= */
function enRevision() {
  const e = REP.estado, sop = CONF.soporte ? `<a class="btn btn-wa btn-lg" href="${esc(wa(CONF.soporte, `Hola Apamuy, soy ${REP.nombre} (DNI ${REP.dni}), repartidor.`))}" target="_blank" rel="noopener">Escribir a Apamuy por WhatsApp</a>` : "";
  document.body.innerHTML = `<main class="centro">${{ pendiente: `<span class="big">⏳</span><h1>Estamos revisando tu registro</h1><p>Revisamos tus documentos y tu pago de la casaca (normalmente en menos de 24 horas). Esta pantalla cambia sola cuando te aprobemos.</p>`,
      rechazado: `<span class="big">⚠️</span><h1>Necesitamos que corrijas algo</h1><div class="alert bad">${esc(REP.motivo || "Revisa tus datos.")}</div><button class="btn btn-pri btn-lg" id="corr">Corregir mis datos</button>`,
      suspendido: `<span class="big">⛔</span><h1>Tu cuenta está suspendida</h1><div class="alert bad">${esc(REP.motivo || "Comunícate con Apamuy.")}</div><button class="btn btn-pri btn-lg" id="pagD">Ver lo que debo y pagar</button>` }[e] || `<h1>${esc(e)}</h1>`}
    ${sop}<button class="btn-link" id="sx">Salir</button></main>`;
  $("#sx").onclick = () => Sesion.salir(); $("#corr")?.addEventListener("click", () => registro(REP));
  $("#pagD")?.addEventListener("click", async () => { await cargarGanancias(); pagar(); });
  DB.escuchar("repartidores", YO.uid, r => { if (r && r.estado !== e) location.reload(); });
}

/* ================= APP (repartidor activo) ================= */
function app() {
  document.body.innerHTML = `<header class="a-h"><img src="favicon.svg" alt="" width="34" height="34"><div class="a-n"><b>${esc(REP.nombre.split(" ")[0])}</b><small>${vehTxt(REP.vehiculo)}${REP.placa ? " · " + esc(REP.placa) : ""}</small></div>
      <label class="disp"><input type="checkbox" id="disp" ${REP.disponible ? "checked" : ""}><i></i><span id="dispT"></span></label></header>
    <div id="aviso"></div><main id="v" class="a-v"></main>
    <nav class="a-nav">${[["pedidos", "🛵", "Pedidos"], ["ganancias", "💵", "Ganancias"], ["perfil", "👤", "Perfil"]].map(([k, e, t]) => `<button data-t="${k}"><span>${e}</span>${t}</button>`).join("")}</nav>`;
  $(".a-nav").onclick = e => { const b = e.target.closest("[data-t]"); if (b) { TAB = b.dataset.t; pintarTab(); } };
  $("#disp").onchange = e => cambiarDisp(e.target.checked);
  DB.escuchar("repartidores", YO.uid, r => { if (!r) return; if (r.estado !== "activo") return location.reload(); REP = r; });
  // Mis pedidos en curso
  let antes = null;
  DB.escucharLista("pedidos", [["repUid", "==", YO.uid], ["estado", "in", ACTIVOS_R]], l => {
    if (antes) antes.filter(a => !l.find(p => p.id === a.id)).forEach(a => DB.get("pedidos", a.id).then(p => { if (p && p.estado === "anulado") { avisar("Pedido anulado", `${p.negocio.nombre} anuló el pedido ${p.codigo}.`); } }).catch(() => {}));
    antes = l; ACT = l.sort((a, b) => String(a.repartidor?.tomado).localeCompare(b.repartidor?.tomado)); despierto(true); gps(); if (TAB === "pedidos") pintarPedidos(true);
  });
  cargarGanancias().then(() => { estadoDisp(); pintarTab(); });
  pintarTab(); estadoDisp();
  document.addEventListener("visibilitychange", () => { if (!document.hidden && (REP.disponible || ACT.length)) despierto(true); });
  setInterval(() => { if (TAB === "pedidos") pintarPedidos(true); }, 30000);   // refresca los "hace X min"
}
const bloqueado = () => GAN.deuda.length > 0;
function estadoDisp() {
  const ch = $("#disp"); if (!ch) return; const on = !!REP.disponible && !bloqueado() && !soatVencido(REP);
  ch.checked = on; $("#dispT").textContent = on ? "Disponible" : "Desconectado"; $(".disp").classList.toggle("on", on);
  if (REP.disponible && !on) DB.set("repartidores", YO.uid, { disponible: false }).catch(() => {});
  $("#aviso").innerHTML = bloqueado() ? `<div class="alert bad">🔒 <span><b>Cuenta bloqueada:</b> debes ${S(GAN.deuda.reduce((a, d) => a + d.com, 0))} a Apamuy (${pctRep()}% de tu ganancia de ${GAN.deuda.map(d => fmtF(d.dia)).join(", ")}).</span><button class="btn btn-pri btn-sm" id="avP">Pagar ahora</button></div>`
    : soatVencido(REP) ? `<div class="alert bad">⚠️ <span><b>Tu SOAT venció.</b> Actualízalo en «Perfil» para seguir repartiendo.</span></div>` : "";
  $("#avP")?.addEventListener("click", pagar);
  escucharOfertas(on); gps();
}
async function cambiarDisp(on) {
  if (on && bloqueado()) { estadoDisp(); return pagar(); }
  if (on && soatVencido(REP)) { estadoDisp(); TAB = "perfil"; return pintarTab(); }
  if (on && "Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
  if (on) { try { POS = await miUbicacion(); } catch (e) { toast("Activa el GPS para recibir pedidos cerca de ti", true); } }
  REP.disponible = on; await DB.set("repartidores", YO.uid, { disponible: on, ...(POS ? { ubic: { ...POS, t: ahora() } } : {}) });
  despierto(on || ACT.length > 0); estadoDisp(); toast(on ? "🟢 Estás disponible: te avisaremos de los pedidos" : "Desconectado"); pintarTab();
}

/* ---------- Ofertas: pedidos libres de mi ciudad ---------- */
let PARAR_OF = null, VISTOS = null;
function escucharOfertas(on) {
  if (!on) { if (PARAR_OF) { PARAR_OF(); PARAR_OF = null; } OFS = []; VISTOS = null; return; }
  if (PARAR_OF) return;
  PARAR_OF = DB.escucharLista("ofertas", [["prov", "==", REP.prov], ["estado", "==", "libre"]], l => {
    const lim = Date.now() - 3 * 3600e3;
    OFS = l.filter(o => puedeLlevar(o, REP.vehiculo) && new Date(o.creado) > lim);
    const nuevas = VISTOS ? OFS.filter(o => !VISTOS.has(o.id)) : []; VISTOS = new Set(OFS.map(o => o.id));
    if (nuevas.length && ACT.length < MAX_ACT) avisar("🛵 ¡Nuevo pedido!", `${nuevas[0].negocio.nombre} · ganas ${S(nuevas[0].envio)}`);
    if (TAB === "pedidos") pintarPedidos(true);
  });
}
function avisar(t, cuerpo) {
  beep(3); navigator.vibrate?.([300, 120, 300]); toast(t + " · " + cuerpo);
  if (document.hidden && "Notification" in window && Notification.permission === "granted") navigator.serviceWorker?.ready.then(r => r.showNotification(t, { body: cuerpo, icon: "img/icon-192.png", badge: "img/icon-192.png", tag: "apamuy", renotify: true, vibrate: [300, 120, 300] })).catch(() => {});
}

/* ---------- GPS en vivo y pantalla encendida ---------- */
let WATCH = null, ULT_ENV = 0, ULT_POS = null, ULT_REP = 0, WL = null;
function gps() {
  const on = (REP.disponible && !bloqueado()) || ACT.length > 0;
  if (on && WATCH == null && navigator.geolocation) WATCH = navigator.geolocation.watchPosition(p => { POS = { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) }; enviarUbic(); MAPAS.forEach(m => m.mio && m.mio(POS)); },
    e => { if (e.code === 1) toast("Da permiso de ubicación para que el cliente te vea en el mapa", true); }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
  if (!on && WATCH != null) { navigator.geolocation.clearWatch(WATCH); WATCH = null; }
}
function enviarUbic() {
  const t = Date.now(), u = { ...POS, t: ahora() };
  // Al cliente: cada 10 s si me moví más de 20 m
  if (ACT.length && t - ULT_ENV > 10000 && (!ULT_POS || distanciaKm(ULT_POS, POS) > .026)) { ULT_ENV = t; ULT_POS = POS; DB.batch(ACT.map(p => ({ op: "set", col: "pedidos", id: p.id, data: { repartidor: { ubic: u } } }))).catch(e => console.warn(e)); }
  if (REP.disponible && t - ULT_REP > 60000) { ULT_REP = t; DB.set("repartidores", YO.uid, { ubic: u }).catch(() => {}); }
}
async function despierto(on) { try { if (on && !WL && navigator.wakeLock && !document.hidden) { WL = await navigator.wakeLock.request("screen"); WL.addEventListener("release", () => WL = null); } if (!on && WL) { await WL.release(); WL = null; } } catch (e) {} }

/* ================= PESTAÑAS ================= */
function pintarTab() { $$(".a-nav button").forEach(b => b.classList.toggle("on", b.dataset.t === TAB)); ({ pedidos: () => pintarPedidos(), ganancias: pintarGanancias, perfil: pintarPerfil })[TAB](); }

/* ---------- Pedidos ---------- */
let MAPAS = [];
function pintarPedidos(silencioso) {
  const V = $("#v"); if (!V || TAB !== "pedidos") return; if (silencioso && $("#modal.open")) return;
  const on = REP.disponible && !bloqueado() && !soatVencido(REP);
  const dist = o => POS && o.negocio.ubic ? distanciaKm(POS, o.negocio.ubic) : null;
  const ofs = OFS.slice().sort((a, b) => (dist(a) ?? 99) - (dist(b) ?? 99));
  const html = `${ACT.map(tarjetaActiva).join("")}
    ${on ? `<h2 class="a-t">Pedidos cerca de ti ${ofs.length ? `<b>${ofs.length}</b>` : ""}</h2>${ACT.length >= MAX_ACT ? `<div class="alert">ℹ️ <span>Ya llevas ${MAX_ACT} pedidos. Entrega uno para tomar otro.</span></div>` : ""}
      ${ofs.map(o => { const d = dist(o); return `<article class="of ${o.vehiculo === "carro" ? "grande" : ""}"><div class="of-h"><b>${esc(o.negocio.nombre)}</b><strong>${S(o.envio)}</strong></div>
        <p>🏪 ${esc(o.negocio.direccion || "")}${d != null ? ` · <b>a ${d.toFixed(1)} km de ti</b>` : ""}</p><p>🏠 Zona: <b>${esc(o.zona || "—")}</b> · ${o.km ?? "?"} km del negocio al cliente</p>
        <div class="tags">${o.vehiculo === "carro" ? `<span class="st warn">🚗 Envío grande</span>` : o.vehiculo === "moto" ? `<span class="st">🛵 Envío pequeño</span>` : ""}${o.pago === "Efectivo" ? `<span class="st">💵 Efectivo</span>` : `<span class="st ok">Comida pagada (${esc(o.pago)})</span>`}${o.tiempo ? `<span class="st">⏱ Listo en ~${esc(o.tiempo)} min</span>` : ""}<span class="st mute">${hace(o.creado)}</span></div>
        <button class="btn btn-pri btn-lg" data-tomar="${esc(o.id)}" ${ACT.length >= MAX_ACT ? "disabled" : ""}>Aceptar pedido</button></article>`; }).join("") || `<div class="vacio"><span class="radar"></span><p>Esperando pedidos… te avisaremos con sonido.</p><small>Deja esta pantalla abierta.</small></div>`}`
    : !ACT.length ? `<div class="vacio"><span class="big">😴</span><p><b>Estás desconectado</b></p><small>Activa «Disponible» arriba para recibir pedidos.</small></div>` : ""}`;
  if (silencioso && V.dataset.h === html) return;
  V.innerHTML = html; V.dataset.h = html; MAPAS = [];
  ACT.forEach(p => { const el = $(`#m-${CSS.escape(p.id)}`); if (!el) return; const pts = () => [p.negocio.ubic && { ...p.negocio.ubic, color: "#E63946", txt: "🏪" }, p.destino && { ...p.destino, color: "#1A1430", txt: "🏠" }, POS && { ...POS, color: "#FFC21A", txt: VEHIC[REP.vehiculo]?.[0] || "🛵" }];
    mapaPuntos(el, pts()).then(m => { if (m) MAPAS.push({ mio: () => m.pintar(pts()) }); }); });
  V.onclick = async e => { const t = e.target.closest("[data-tomar]"), a = e.target.closest("[data-acc]");
    if (t) return tomar(OFS.find(o => o.id === t.dataset.tomar), t);
    if (a) { const [acc, id] = a.dataset.acc.split("|"); accion(acc, ACT.find(p => p.id === id)); } };
}
function tarjetaActiva(p) {
  const r = p.repartidor || {}, recogido = p.estado === "camino", ef = p.pago === "Efectivo" && !p.pagado, cobrar = ef ? p.total : p.envio;
  const B = (a, t, c = "btn-light") => `<button class="btn ${c}" data-acc="${a}|${esc(p.id)}">${t}</button>`;
  return `<article class="act"><div class="act-h"><span class="st ${recogido ? "info" : "fire"}">${recogido ? "🛵 En camino al cliente" : p.estado === "listo" ? "✅ Listo para recoger" : `🔥 Preparando${p.tiempo ? ` (~${esc(p.tiempo)} min)` : ""}`}</span><span class="mono">${esc(p.codigo)}</span></div>
    <div class="mapa act-m" id="m-${esc(p.id)}"></div>
    <div class="act-b">${recogido ? `<h3>🏠 ${esc(p.cliente.nombre)}</h3><p>${esc(p.destino?.texto || "")}${p.destino?.referencia ? `<br><small>${esc(p.destino.referencia)}</small>` : ""}</p>
        <div class="acts">${p.destino ? `<a class="btn btn-acc" href="${nav(p.destino.lat, p.destino.lng)}" target="_blank" rel="noopener">🧭 Cómo llegar</a>` : ""}<a class="btn btn-light" href="tel:${esc(p.cliente.celular)}">📞 Llamar</a><a class="btn btn-wa" href="${esc(wa(p.cliente.celular, `Hola ${p.cliente.nombre.split(" ")[0]} 👋 soy ${REP.nombre.split(" ")[0]}, tu repartidor de Apamuy. Ya estoy en camino con tu pedido de ${p.negocio.nombre}.`))}" target="_blank" rel="noopener">WhatsApp</a></div>`
      : `<h3>🏪 ${esc(p.negocio.nombre)}</h3><p>${esc(p.negocio.direccion || "")}</p><div class="acts">${p.negocio.ubic ? `<a class="btn btn-acc" href="${nav(p.negocio.ubic.lat, p.negocio.ubic.lng)}" target="_blank" rel="noopener">🧭 Ir al negocio</a>` : ""}${p.negocio.telefono ? `<a class="btn btn-light" href="tel:${esc(p.negocio.telefono)}">📞 Negocio</a>` : ""}</div>
        <p class="muted sm">Cliente: <b>${esc(p.cliente.nombre)}</b> · ${esc(p.destino?.texto || "")}</p>`}
      <details><summary>Ver el pedido (${(p.items || []).reduce((a, i) => a + i.cant, 0)} producto/s)</summary><ul class="it">${(p.items || []).map(i => `<li><b>${i.cant}×</b> ${esc(i.n)}${detItem(i).map(d => `<small>${esc(d)}</small>`).join("")}</li>`).join("")}</ul>${p.nota ? `<p class="muted sm">📝 ${esc(p.nota)}</p>` : ""}</details>
      <div class="cobro ${ef ? "ef" : ""}">${ef ? `💵 <b>Cobra al cliente ${S(p.total)}</b><small>Comida ${S(p.subtotal)} (es del negocio) + tu delivery ${S(p.envio)}.${p.pagaCon ? ` Paga con ${S(p.pagaCon)}: lleva <b>${S(p.pagaCon - p.total)}</b> de vuelto.` : ""}${recogido ? "" : `<br>Al recoger, paga la comida al negocio (o como acuerden con ellos).`}</small>`
        : `✅ <b>La comida ya está pagada.</b><small>Cobra solo tu delivery: <b>${S(p.envio)}</b> (efectivo o a tu Yape).</small>`}</div>
      ${p.mayorEdad ? `<div class="alert warn sm">🔞 Pide el DNI: solo se entrega a mayores de 18.</div>` : ""}
      <div class="acts">${recogido ? B("entregar", `✅ Entregado · cobré ${S(cobrar)}`, "btn-pri btn-lg") : B("recoger", "📦 Ya recogí el pedido", "btn-pri btn-lg") + B("soltar", "No puedo llevarlo")}</div></div></article>`;
}
async function tomar(o, btn) {
  if (!o) return; if (ACT.length >= MAX_ACT) return toast(`Entrega uno de tus ${MAX_ACT} pedidos primero`, true);
  btn.disabled = true; btn.textContent = "Aceptando…";
  try {
    const ok = await DB.transaccion(async (get, set) => {
      const x = await get("ofertas", o.id); if (!x || x.estado !== "libre") return false;
      set("ofertas", o.id, { estado: "tomado", tomadoPor: YO.uid, tomado: ahora() });
      set("pedidos", o.id, { repUid: YO.uid, repartidor: { uid: YO.uid, nombre: REP.nombre, celular: REP.celular, vehiculo: REP.vehiculo, placa: REP.placa || "", etapa: "yendo", tomado: ahora(), ...(POS ? { ubic: { ...POS, t: ahora() } } : {}) }, actualizado: ahora() });
      return true;
    });
    if (!ok) { toast("Otro repartidor lo tomó primero 😅", true); OFS = OFS.filter(x => x.id !== o.id); return pintarPedidos(); }
    beep(1); toast("✅ ¡Es tuyo! Ve al negocio"); scrollTo(0, 0);
  } catch (e) { console.error(e); toast("No se pudo aceptar: " + (e.code || e.message), true); btn.disabled = false; btn.textContent = "Aceptar pedido"; }
}
async function accion(a, p) {
  if (!p) return; const upd = d => DB.set("pedidos", p.id, { ...d, actualizado: ahora() });
  if (a === "recoger") {
    const ef = p.pago === "Efectivo" && !p.pagado;
    return modal("¿Ya tienes el pedido?", `<p>Revisa que esté <b>completo</b> (${(p.items || []).map(i => `${i.cant}× ${esc(i.n)}`).join(", ")}).</p>${p.estado === "cocina" ? `<div class="alert warn sm">El negocio aún lo marca como «preparando». Recógelo solo si ya te lo entregaron.</div>` : ""}
      ${ef ? `<div class="alert sm">💵 Recuerda: cobras al cliente <b>${S(p.total)}</b>. La comida (${S(p.subtotal)}) es del negocio.</div>` : ""}`, async () => {
      await upd({ estado: "camino", despachado: ahora(), repartidor: { etapa: "camino", recogido: ahora() } }); toast("🛵 ¡En camino! El cliente te ve en el mapa"); }, "Sí, voy al cliente");
  }
  if (a === "entregar") { const ef = p.pago === "Efectivo" && !p.pagado;
    return modal("¿Entregaste el pedido?", `<p>Confirma que el cliente recibió su pedido y que cobraste <b>${S(ef ? p.total : p.envio)}</b>${ef ? " (comida + delivery)" : " (tu delivery)"}.</p>`, async () => {
      await upd({ estado: "entregado", entregado: ahora(), repartidor: { etapa: "entregado", entregado: ahora() } }); toast(`🎉 ¡Bien! Ganaste ${S(p.envio)}`); cargarGanancias(); }, "Sí, entregado"); }
  if (a === "soltar") return modal("¿No puedes llevarlo?", `<p>El pedido vuelve a la lista para que otro repartidor lo tome. Hazlo solo si de verdad no puedes.</p>`, async () => {
    await DB.batch([{ op: "set", col: "ofertas", id: p.id, data: { estado: "libre", tomadoPor: null, soltadoPor: YO.uid } }, { op: "set", col: "pedidos", id: p.id, data: { repUid: null, repartidor: null, actualizado: ahora() }, merge: true }]);
    toast("Pedido liberado"); }, "Soltar pedido");
}

/* ---------- Ganancias y pago del % a Apamuy ---------- */
async function cargarGanancias() {
  const m = HOY().slice(0, 7), mp = addD(m + "-01", -1).slice(0, 7);
  const [a, b, pg] = await Promise.all([DB.list("pedidos", ["repUid", "==", YO.uid], ["mes", "==", m]), DB.list("pedidos", ["repUid", "==", YO.uid], ["mes", "==", mp]), DB.list("pagosRep", ["uid", "==", YO.uid])]).catch(e => { console.warn(e); return [[], [], []]; });
  PAGOS = pg.sort((x, y) => String(y.creado).localeCompare(x.creado));
  const cub = {}; PAGOS.filter(x => x.estado !== "rechazado").forEach(x => (x.dias || []).forEach(d => cub[d] = x.estado));
  const D = {}; [...a, ...b].filter(p => p.estado === "entregado").forEach(p => { const r = D[p.dia] || (D[p.dia] = { dia: p.dia, n: 0, gan: 0 }); r.n++; r.gan += +p.envio || 0; });
  GAN.dias = Object.values(D).map(r => ({ ...r, gan: r2(r.gan), com: r2(r.gan * pctRep() / 100), pago: cub[r.dia] || null })).sort((x, y) => y.dia.localeCompare(x.dia));
  GAN.deuda = GAN.dias.filter(r => r.dia < HOY() && r.com > 0 && !r.pago);
  GAN.hoy = GAN.dias.find(r => r.dia === HOY()) || { dia: HOY(), n: 0, gan: 0, com: 0 };
  if ($("#disp")) estadoDisp(); if (TAB === "ganancias" && $("#v")) pintarGanancias();
}
function pintarGanancias() {
  const lun = addD(HOY(), -((new Date(HOY() + "T12:00:00").getDay() + 6) % 7)), sum = (l, k) => r2(l.reduce((a, r) => a + r[k], 0));
  const sem = GAN.dias.filter(r => r.dia >= lun), mes = GAN.dias.filter(r => r.dia.startsWith(HOY().slice(0, 7))), debe = sum(GAN.deuda, "com");
  const est = r => r.pago === "aprobado" ? `<span class="st ok">Pagado</span>` : r.pago === "pendiente" ? `<span class="st warn">En revisión</span>` : r.dia === HOY() ? `<span class="st">Hoy</span>` : r.com > 0 ? `<span class="st bad">Debes</span>` : "";
  $("#v").innerHTML = `<div class="kpis"><div class="kpi big"><span>Hoy</span><b>${S(GAN.hoy.gan)}</b><small>${GAN.hoy.n} entrega(s) · ${pctRep()}% Apamuy: ${S(GAN.hoy.com)}</small></div>
      <div class="kpi"><span>Esta semana</span><b>${S(sum(sem, "gan"))}</b><small>${sum(sem, "n")} entregas</small></div><div class="kpi"><span>Este mes</span><b>${S(sum(mes, "gan"))}</b><small>${sum(mes, "n")} entregas</small></div></div>
    <section class="card ${debe ? "debe" : ""}"><h2>Lo que pagas a Apamuy</h2><p class="muted">Pagas el <b>${pctRep()}%</b> de lo que ganas cada día. Págalo antes de empezar el día siguiente: si no, tu cuenta se bloquea hasta que pagues.</p>
      ${debe ? `<p class="debe-t">Debes <b>${S(debe)}</b></p><button class="btn btn-pri btn-lg" id="gPag">Pagar ${S(debe)} por Yape</button>` : GAN.hoy.com > 0 ? `<p>✅ Estás al día. Lo de hoy (${S(GAN.hoy.com)}) lo puedes pagar al terminar.</p><button class="btn btn-light" id="gPag">Pagar lo de hoy</button>` : `<p>✅ Estás al día.</p>`}</section>
    <section class="card"><h2>Día por día</h2><table class="tbl"><thead><tr><th>Día</th><th>Entregas</th><th class="r">Ganaste</th><th class="r">${pctRep()}%</th><th></th></tr></thead><tbody>
      ${GAN.dias.map(r => `<tr><td>${fmtF(r.dia)}</td><td>${r.n}</td><td class="r">${S(r.gan)}</td><td class="r">${S(r.com)}</td><td>${est(r)}</td></tr>`).join("") || `<tr><td colspan="5" class="muted">Aún no tienes entregas.</td></tr>`}</tbody></table>
      ${PAGOS.length ? `<h3>Tus pagos</h3><ul class="lst">${PAGOS.slice(0, 10).map(x => `<li><div><b>${S(x.monto)}</b><small>${fmtFH(x.creado)} · op. ${esc(x.operacion || "")}${x.motivo ? " · " + esc(x.motivo) : ""}</small></div>${{ aprobado: `<span class="st ok">Aprobado</span>`, pendiente: `<span class="st warn">En revisión</span>`, rechazado: `<span class="st bad">Rechazado</span>` }[x.estado] || ""}</li>`).join("")}</ul>` : ""}</section>`;
  $("#gPag")?.addEventListener("click", pagar);
}
function pagar() {
  const dias = GAN.deuda.slice(), incluyeHoy = GAN.hoy && GAN.hoy.com > 0 && !GAN.hoy.pago, c = CONF.cobro; let CAP = "";
  const monto = hoy => r2(dias.reduce((a, d) => a + d.com, 0) + (hoy ? GAN.hoy.com : 0));
  if (!dias.length && !incluyeHoy) return toast("No debes nada 👍");
  modal("Pagar a Apamuy", `<p class="monto">Total: <b id="pM">${S(monto(!dias.length))}</b></p><ul class="lst sm">${dias.map(d => `<li><span>${fmtF(d.dia)} · ganaste ${S(d.gan)}</span><b>${S(d.com)}</b></li>`).join("")}</ul>
    ${incluyeHoy ? fld("hoy", `Incluir lo de hoy (${S(GAN.hoy.com)})`, !dias.length, { type: "checkbox" }) : ""}
    ${c.yape ? `<div class="yape">${c.qr ? `<img src="${esc(imgUrl(c.qr))}" alt="QR de Yape de Apamuy">` : ""}<div><small>Yapea a</small><b>${esc(c.yape)}</b><small>${esc(c.titular || "Apamuy")}</small></div></div>` : `<div class="alert warn sm">Pide el número de Yape de Apamuy al administrador.</div>`}
    ${fld("operacion", "N° de operación", "", { req: true, extra: 'inputmode="numeric"' })}<div class="up" data-up="cap"><span class="up-v" id="pCapV">📷</span><div><b>Captura del Yape</b><small>La pantalla de «¡Yapeaste!».</small><label class="btn btn-light btn-sm">Subir captura<input type="file" accept="image/*" id="pCap" hidden></label></div></div>`, async d => {
    if (!CAP) { toast("Sube la captura del pago", true); return false; }
    const ds = [...dias.map(x => x.dia), ...(d.hoy || (!dias.length && incluyeHoy) ? [HOY()] : [])], id = codigo("PR");
    const captura = await subirPrivado(`pagosrep/${YO.uid}/${id}.jpg`, CAP);
    await DB.set("pagosRep", id, { uid: YO.uid, nombre: REP.nombre, celular: REP.celular, dias: ds, monto: monto(ds.includes(HOY())), operacion: d.operacion, captura, estado: "pendiente", creado: ahora() });
    toast("✅ Pago enviado. Ya puedes seguir repartiendo"); await cargarGanancias(); if ($("#v") && TAB === "ganancias") pintarGanancias();
    if (REP.estado === "suspendido") toast("Enviado. Apamuy revisará tu pago para reactivar tu cuenta");
  }, "Enviar pago", { alAbrir: F => {
    $("#pCap").onchange = async e => { const f = e.target.files[0]; if (!f) return; CAP = await redimensionar(f, 1200, .8); $("#pCapV").textContent = ""; $("#pCapV").style.backgroundImage = `url('${CAP}')`; };
    $("[name=hoy]", F)?.addEventListener("change", e => $("#pM").textContent = S(monto(e.target.checked))); } });
}

/* ---------- Perfil ---------- */
async function pintarPerfil() {
  const r = REP, ios = /iphone|ipad|ipod/i.test(navigator.userAgent), app = matchMedia("(display-mode: standalone)").matches;
  $("#v").innerHTML = `<section class="card perfil"><span class="pf-f" id="pfF">👤</span><div><h2>${esc(r.nombre)}</h2><p class="muted">DNI ${esc(r.dni)} · ${esc(r.celular)}<br>${esc(r.provincia)} (${esc(r.departamento)})</p></div></section>
    <section class="card"><h2>${vehTxt(r.vehiculo)}</h2><dl class="dl">${r.placa ? `<dt>Placa</dt><dd>${esc(r.placa)}</dd><dt>Licencia</dt><dd>${esc(r.licencia || "")}</dd><dt>SOAT</dt><dd>${soatVencido(r) ? `<span class="st bad">Vencido</span>` : "vence"} ${fmtF(r.soatVence, { day: "numeric", month: "short", year: "numeric" })}</dd>` : `<dt>Tipo</dt><dd>Bicicleta</dd>`}</dl>
      ${r.placa ? `<button class="btn btn-light" id="pfSoat">Actualizar mi SOAT</button>` : ""}</section>
    <section class="card"><h2>📲 Para no perder pedidos</h2><ul class="tips"><li>${app ? "✅ Ya usas la app instalada." : ios ? "Instálala: toca <b>Compartir</b> ⬆️ → <b>Agregar a inicio</b>." : "Instálala: menú ⋮ de Chrome → <b>Instalar app</b> (o «Agregar a la pantalla principal»)."}</li>
      <li>Mientras estés disponible, <b>deja la app abierta</b> (la pantalla no se apaga sola).</li><li>Activa el <b>GPS</b> y el <b>volumen</b>.</li></ul>
      ${"Notification" in window && Notification.permission !== "granted" ? `<button class="btn btn-light" id="pfNot">🔔 Activar notificaciones</button>` : ""}</section>
    ${CONF.soporte ? `<a class="btn btn-wa btn-lg" href="${esc(wa(CONF.soporte, `Hola Apamuy, soy ${r.nombre}, repartidor.`))}" target="_blank" rel="noopener">Ayuda por WhatsApp</a>` : ""}
    <button class="btn btn-light btn-lg" id="pfSalir">Cerrar sesión</button>`;
  $("#pfSalir").onclick = async () => { if (REP.disponible) await DB.set("repartidores", YO.uid, { disponible: false }).catch(() => {}); Sesion.salir(); };
  $("#pfNot")?.addEventListener("click", async () => { const p = await Notification.requestPermission(); toast(p === "granted" ? "🔔 Notificaciones activadas" : "No diste permiso", p !== "granted"); pintarPerfil(); });
  $("#pfSoat")?.addEventListener("click", () => { let F2 = "";
    modal("Actualizar SOAT", `${fld("soatVence", "El nuevo SOAT vence el", "", { type: "date", req: true })}<div class="up"><span class="up-v" id="sV">📷</span><div><b>Foto del SOAT nuevo</b><label class="btn btn-light btn-sm">Subir foto<input type="file" accept="image/*" id="sF" hidden></label></div></div>`, async d => {
      if (!F2) { toast("Sube la foto del SOAT", true); return false; } if (d.soatVence < HOY()) { toast("Ese SOAT ya venció", true); return false; }
      const soatFoto = await subirPrivado(`repartidores/${YO.uid}/soatFoto-${Date.now().toString(36)}.jpg`, F2);
      await DB.set("repartidores", YO.uid, { soatVence: d.soatVence, soatFoto, soatActualizado: ahora() }); REP = { ...REP, soatVence: d.soatVence }; toast("SOAT actualizado"); estadoDisp(); pintarPerfil(); }, "Guardar", { alAbrir: () => {
      $("#sF").onchange = async e => { const f = e.target.files[0]; if (!f) return; F2 = await redimensionar(f, 1400, .8); $("#sV").textContent = ""; $("#sV").style.backgroundImage = `url('${F2}')`; }; } }); });
  verPrivado(r.foto).then(u => { if (u && $("#pfF")) { $("#pfF").textContent = ""; $("#pfF").style.backgroundImage = `url('${u}')`; } }).catch(() => {});
}
