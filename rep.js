/* =========================================================
   APAMUY — App del repartidor
   Registro con documentos → el admin aprueba → «Disponible» →
   el pedido le llega a todos → el primero que acepta lo lleva.
   Paga a Apamuy el % de lo que gana cada día; si no paga, se bloquea.
   ========================================================= */
let YO = null, REP = null, TAB = "pedidos", ACT = [], OFS = [], POS = null, PAGOS = [], GAN = { dias: [], deuda: [], hoy: null };
let ACTP = [], ACTE = [], ENVS = [], REPP = null, PRIV = {}, MISOF = store.get("am_misof", {});   // pedidos y envíos en curso, envíos libres, mi perfil público
const BUSQ_MIN = 10;
// Lo que ve el cliente del repartidor: foto aprobada, nombre corto, vehículo, placa y estrellas. Nunca DNI ni domicilio.
const pubRep = () => ({ uid: YO.uid, nombre: REP.nombre.split(" ").slice(0, 2).join(" "), celular: REP.celular, foto: (REPP && REPP.foto) || "", vehiculo: REP.vehiculo, marca: REP.marca || "", color: REP.color || "", placa: REP.placa || "",
  entregas: (REPP && REPP.entregas) || 0, estrellas: promEstrellas(REPP), nCal: (REPP && REPP.estrellasN) || 0 });
const colDe = x => x._t === "e" ? "envios" : "pedidos";
function juntarAct() { ACT = [...ACTP, ...ACTE].sort((a, b) => String(a.repartidor?.tomado || a.asignadoEn).localeCompare(b.repartidor?.tomado || b.asignadoEn)); despierto(true); gps(); syncRastreos(); if (TAB === "pedidos") pintarPedidos(true); }
// El enlace «Compartir ruta» del cliente se mantiene al día con el estado y el repartidor
function syncRastreos() { ACT.forEach(x => { if (!x.rastreo) return; const sig = x.estado + "|" + YO.uid, k = "am_rs_" + x.id; if (store.get(k, "") === sig) return; store.set(k, sig);
  DB.set("rastreo", x.rastreo, { estado: x.estado, repartidor: pubRep(), ...(POS ? { ubic: { ...POS, t: ahora() } } : {}) }).catch(e => console.warn("rastreo", e.code || e)); }); }
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
        <p class="muted sm">Entra con tu cuenta de Google. Si es tu primera vez, te pedimos tus datos para registrarte.</p><p class="l-err js-auth-err" id="eErr" role="alert"></p>`}</div></main>`;
  barraInstalar(); errorAuthGuardado($("#eErr"));
  if (DEMO) return $$("[data-demo]").forEach(b => b.onclick = () => Sesion._demo({ uid: b.dataset.demo, email: b.dataset.demo + "@demo.pe", nombre: "" }));
  $("#eG").onclick = async () => { $("#eErr").textContent = ""; $("#eG").disabled = true; $("#eG").lastChild.textContent = "Abriendo Google…";
    try { await Sesion.google(); } catch (e) { $("#eErr").textContent = errorAuth(e); } $("#eG").disabled = false; $("#eG").lastChild.textContent = "Entrar con Google"; };
}

/* ================= REGISTRO (7 pasos) ================= */
const PASOS_R = ["Tus datos", "Tu DNI", "Vehículo", "Antecedentes", "Domicilio", "Declaración", "Casaca"];
function registro(prev) {
  const R = prev ? JSON.parse(JSON.stringify(prev)) : { nombre: YO.nombre || "", celular: "", departamento: CONF.ciudadInicial.dep, provincia: CONF.ciudadInicial.prov, talla: "M", vehiculo: "moto", domicilio: null, casaca: {} };
  // Archivos: data:… (nuevo) o la ruta que ya estaba guardada
  const A = { fotoPerfil: R.fotoPerfil || "", dniFrente: R.dniFrente || "", dniReverso: R.dniReverso || "", licenciaFoto: R.licenciaFoto || "", soatFoto: R.soatFoto || "", vehiculoFoto: R.vehiculoFoto || "", antecedentes: R.antecedentes || "", casacaCap: (R.casaca || {}).captura || "" };
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
      <div class="fld full dni-v"><span>N° de DNI *</span><div class="dni-r"><input name="dni" required inputmode="numeric" maxlength="8" value="${esc(R.dni || "")}" placeholder="8 números">${CONF.verificarDni ? `<button type="button" class="btn btn-pri" id="dniV">${R.dniVerificado === R.dni && R.dni ? "✓ Verificado" : "Verificar"}</button>` : ""}</div>${CONF.verificarDni ? `<small id="dniM" class="${R.dniVerificado === R.dni && R.dni ? "ok-t" : ""}">${R.dniVerificado === R.dni && R.dni ? "✓ DNI verificado con RENIEC" : "Toca «Verificar» y tu nombre se llena solo."}</small>` : ""}</div>
      ${fld("nombre", "Nombres y apellidos", R.nombre, { req: true, full: true })}${fld("nacimiento", "Fecha de nacimiento", R.nacimiento || "", { type: "date", req: true })}
      ${fld("celular", "Celular (WhatsApp)", R.celular, { type: "tel", req: true, extra: 'inputmode="numeric" maxlength="9"' })}${fld("talla", "Talla de tu casaca", R.talla, { opts: ["S", "M", "L", "XL", "XXL"] })}
      <label class="fld"><span>Departamento donde trabajarás</span><select name="departamento" id="rDep">${op(Object.keys(U).sort(), R.departamento)}</select></label><label class="fld"><span>Provincia (ciudad)</span><select name="provincia" id="rProv"></select></label></div>
      <p class="muted sm">Te llegan los pedidos de los negocios de esa ciudad.</p>`;
    if (paso === 1) C.innerHTML = `<h2>🪪 Tu foto y tu DNI</h2><p class="muted">Fotos claras, con buena luz y sin reflejos.</p>
      ${foto("fotoPerfil", "Foto de perfil · la verán los clientes", "De frente, con buena luz, sin lentes oscuros ni gorra. Así te reconocen al entregar.", "user")}
      <p class="muted sm">🔒 Las fotos de tu DNI solo las ve el administrador de Apamuy.</p>${foto("dniFrente", "DNI · parte de adelante", "Que se lean tu nombre y número.")}${foto("dniReverso", "DNI · parte de atrás", "Que se lea tu dirección.")}`;
    if (paso === 2) C.innerHTML = `<h2>🛵 ¿Con qué vas a repartir?</h2><div class="veh">${Object.entries(VEHIC).map(([k, [e, t]]) => `<label class="veh-c"><input type="radio" name="vehiculo" value="${k}" ${R.vehiculo === k ? "checked" : ""}><span>${e}</span><b>${t}${k === "moto" ? " propia" : ""}</b><small>${{ moto: "Pedidos normales y pequeños de ferretería", bici: "Pedidos normales, distancias cortas", carro: "Pedidos normales y grandes (ferreterías y talleres)" }[k]}</small></label>`).join("")}</div>
      <div class="g2">${fld("marca", "Marca y modelo", R.marca || "", { ph: "Ej. Honda CB 125" })}${fld("color", "Color", R.color || "", { req: true, ph: "Ej. Rojo" })}</div>
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
      else A[k] = await redimensionar(f, k === "fotoPerfil" ? 700 : 1400, .8);
      guardar(); pintar(); });
    // Verificar DNI con RENIEC (lo consulta el servidor; la clave del proveedor nunca llega al celular)
    if (paso === 0 && $("#dniV")) { const inp = $("[name=dni]", F), b = $("#dniV"), m = $("#dniM");
      inp.oninput = () => { inp.value = inp.value.replace(/\D/g, "").slice(0, 8); if (R.dniVerificado && inp.value !== R.dniVerificado) { b.textContent = "Verificar"; m.className = ""; m.textContent = "Toca «Verificar» y tu nombre se llena solo."; } };
      b.onclick = async () => { const dni = inp.value; if (!/^\d{8}$/.test(dni)) { m.className = "err"; m.textContent = "El DNI tiene 8 números."; return; }
        b.disabled = true; b.textContent = "Consultando…"; m.className = ""; m.textContent = "Consultando en RENIEC…";
        try { const r = await llamarServidor("verificarDni", { dni }); R.dniVerificado = dni; R.dni = dni; R.nombre = r.nombre; $("[name=nombre]", F).value = r.nombre;
          b.textContent = "✓ Verificado"; m.className = "ok-t"; m.textContent = `✓ ${r.nombre} · verificado con RENIEC`; }
        catch (e) { b.textContent = "Verificar"; m.className = "err"; const c = String(e.code || ""); if (!c.includes("not-found") && !c.includes("invalid")) R.dniSinVerificar = dni;   // si el servicio falla, puede seguir (el admin lo ve «sin verificar»)
          m.textContent = c.includes("not-found") ? "No encontramos ese DNI. Revisa el número." : c.includes("resource-exhausted") ? "Hiciste muchas consultas hoy. Puedes seguir: lo revisaremos a mano." : c.includes("unauthenticated") ? "Vuelve a entrar con tu cuenta de Google." : "No se pudo consultar ahora. Puedes seguir: lo revisaremos a mano."; }
        b.disabled = false; }; }
    if (paso === 0) { const U = window.UBIGEO || {}, dep = $("#rDep"), pv = () => { const ps = Object.keys(U[dep.value] || {}).sort(); $("#rProv").innerHTML = ps.map(x => `<option ${x === R.provincia ? "selected" : ""}>${esc(x)}</option>`).join(""); }; pv(); dep.onchange = pv; }
    if (paso === 2) { const v = () => { const r = ($("[name=vehiculo]:checked", F) || {}).value; $("#rMot").hidden = r === "bici"; $$("#rMot [required]").forEach(x => x.disabled = r === "bici"); $("[name=marca]", F).closest("label").hidden = r === "bici"; }; $$("[name=vehiculo]", F).forEach(x => x.onchange = v); v(); }
    if (paso === 4) { const dom = R.domicilio || {};
      mapaPin($("#rMapa"), dom.lat != null ? dom : centroDe(R.departamento, R.provincia), q => R.domicilio = { ...(R.domicilio || {}), lat: q.lat, lng: q.lng }, { txt: "🏠" }).then(m => MP = m);
      $("#rGps").onclick = async () => { $("#rGps").disabled = true; try { const p = await miUbicacion(); MP && MP.mover(p); toast("Listo · revisa que el pin esté en tu casa"); } catch (e) { avisarUbicacion(e); } $("#rGps").disabled = false; }; }
    if (paso === 5) firma = padFirma($("#rFirma"), R.firmaData || "");
    if (paso === 5) $("#rBorrar").onclick = () => firma.borrar();
  };
  // Guarda lo escrito en R antes de cambiar de paso
  const guardar = () => { const d = datosForm(F);
    if (paso === 0) Object.assign(R, { nombre: d.nombre, dni: String(d.dni).replace(/\D/g, ""), nacimiento: d.nacimiento, celular: String(d.celular).replace(/\D/g, ""), talla: d.talla, departamento: d.departamento, provincia: d.provincia });
    if (paso === 2) Object.assign(R, { marca: d.vehiculo === "bici" ? "" : d.marca, color: d.color, vehiculo: d.vehiculo || R.vehiculo, placa: (d.placa || "").toUpperCase(), licencia: (d.licencia || "").toUpperCase(), soatVence: d.soatVence });
    if (paso === 4) { R.domicilio = { ...(R.domicilio || {}), texto: d.dir, referencia: d.ref }; const c = R.domicilio.lat != null ? ciudadCercana(R.domicilio) : null; if (c) R.domicilio.distrito = c.dis; }
    if (paso === 5) { R.acepto = d.acepto; R.consentimiento = d.consentimiento; if (firma && !firma.vacia()) R.firmaData = firma.dato(); }
    if (paso === 6) R.casaca = { ...(R.casaca || {}), operacion: d.operacion };
  };
  const validar = () => {
    const req = $$("[required]:not(:disabled)", F).find(x => !String(x.value).trim()); if (req) { req.focus(); return "Completa: " + req.closest("label").querySelector("span").textContent.replace(" *", ""); }
    if (paso === 0) { if (!/^\d{8}$/.test(R.dni)) return "El DNI tiene 8 números."; if (CONF.verificarDni && R.dniVerificado !== R.dni && R.dniSinVerificar !== R.dni) return "Toca «Verificar» para validar tu DNI."; if (R.celular.length !== 9) return "El celular tiene 9 números.";
      const ed = (Date.now() - new Date(R.nacimiento + "T12:00:00")) / 31557600000; if (!(ed >= 18)) return "Debes ser mayor de 18 años para repartir."; }
    if (paso === 1) { if (!A.fotoPerfil) return "Falta tu foto de perfil."; if (!A.dniFrente || !A.dniReverso) return "Faltan las fotos de tu DNI (adelante y atrás)."; }
    if (paso === 2) { if (R.vehiculo !== "bici" && !R.marca) return "Escribe la marca de tu vehículo."; if (R.vehiculo !== "bici") { if (!A.soatFoto) return "Falta la foto del SOAT."; if (!A.licenciaFoto) return "Falta la foto de tu licencia."; if (R.soatVence < HOY()) return "Tu SOAT está vencido. Necesitas un SOAT vigente."; } if (!A.vehiculoFoto) return "Falta la foto de tu vehículo."; }
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
      const up = {}; for (const k of ["dniFrente", "dniReverso", "vehiculoFoto", "antecedentes", ...(R.vehiculo !== "bici" ? ["soatFoto", "licenciaFoto"] : [])]) up[k] = await sub(k, ext(k));
      const fotoPerfil = await subirFoto(`perfiles/${YO.uid}/foto-${t}.jpg`, A.fotoPerfil);
      const firmaR = await subirPrivado(`repartidores/${YO.uid}/firma-${t}.png`, R.firmaData), cap = await sub("casacaCap", "jpg");
      const c = ciudadCercana(R.domicilio) || {};
      const data = { nombre: R.nombre, dni: R.dni, ...(R.dniVerificado === R.dni ? { dniVerificado: R.dni } : {}), nacimiento: R.nacimiento, celular: R.celular, email: YO.email, talla: R.talla, departamento: R.departamento, provincia: R.provincia, prov: provKey(R.departamento, R.provincia),
        vehiculo: R.vehiculo, marca: R.marca || "", color: R.color || "", fotoPerfil, placa: R.vehiculo === "bici" ? "" : R.placa, licencia: R.vehiculo === "bici" ? "" : R.licencia, soatVence: R.vehiculo === "bici" ? "" : R.soatVence, ...up,
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
    ${sop}<button class="btn-link" id="sx">Salir</button></main>`; barraInstalar();
  $("#sx").onclick = () => Sesion.salir(); $("#corr")?.addEventListener("click", () => registro(REP));
  $("#pagD")?.addEventListener("click", async () => { await cargarGanancias(); pagar(); });
  DB.escuchar("repartidores", YO.uid, r => { if (r && r.estado !== e) location.reload(); });
}

/* ================= APP (repartidor activo) ================= */
function app() {
  document.body.innerHTML = `<header class="a-h"><img src="favicon.svg" alt="" width="34" height="34"><div class="a-n"><b>${esc(REP.nombre.split(" ")[0])}</b><small>${vehTxt(REP.vehiculo)}${REP.placa ? " · " + esc(REP.placa) : ""}</small></div>
      <label class="disp"><input type="checkbox" id="disp" ${REP.disponible ? "checked" : ""}><i></i><span id="dispT"></span></label></header>
    <div id="aviso"></div><main id="v" class="a-v"></main>
    <nav class="a-nav">${[["pedidos", '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h3l-3 11.5M5.5 17.5 9 10h7M12 6h2"/>', "Pedidos"], ["ganancias", '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>', "Ganancias"], ["perfil", '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', "Perfil"]].map(([k, e, t]) => `<button data-t="${k}"><span><svg class="iw" viewBox="0 0 24 24" aria-hidden="true">${e}</svg></span>${t}</button>`).join("")}</nav>`;
  if (window.Notification?.permission === "granted") activarAvisos("rep", true);
  barraInstalar(); if (!REP.fotoPerfil && !REP.fotoNueva) $("#aviso").insertAdjacentHTML("afterend", `<div class="alert warn a-foto">📸 <span><b>Sube tu foto de perfil</b>: los clientes la ven al recibir su pedido.</span><button class="btn btn-light btn-sm" id="avFoto">Subir</button></div>`);
  $("#avFoto")?.addEventListener("click", cambiarFoto);
  $(".a-nav").onclick = e => { const b = e.target.closest("[data-t]"); if (b) { TAB = b.dataset.t; pintarTab(); } };
  $("#disp").onchange = e => cambiarDisp(e.target.checked);
  DB.escuchar("repartidores", YO.uid, r => { if (!r) return; if (r.estado !== "activo") return location.reload(); REP = r; });
  DB.escuchar("repPublico", YO.uid, r => { REPP = r; });
  // Mis envíos de paquetes en curso
  DB.escucharLista("envios", [["repUid", "==", YO.uid], ["estado", "in", ["asignado", "camino"]]], async l => {
    for (const e of l) if (!PRIV[e.id]) PRIV[e.id] = await DB.get(`envios/${e.id}/priv`, "datos").catch(() => null);
    const nuevos = l.filter(e => !ACTE.find(x => x.id === e.id) && e.estado === "asignado" && MISOF[e.id]);
    if (nuevos.length) avisar("✅ ¡Te eligieron!", `Envío ${nuevos[0].codigo} por ${S(nuevos[0].precio)}`);
    ACTE = l.map(e => ({ ...e, _t: "e" })); juntarAct();
  });
  // Mis pedidos en curso
  let antes = null;
  DB.escucharLista("pedidos", [["repUid", "==", YO.uid], ["estado", "in", ACTIVOS_R]], l => {
    if (antes) antes.filter(a => !l.find(p => p.id === a.id)).forEach(a => DB.get("pedidos", a.id).then(p => { if (p && p.estado === "anulado") { avisar("Pedido anulado", `${p.negocio.nombre} anuló el pedido ${p.codigo}.`); } }).catch(() => {}));
    antes = l; ACTP = l; juntarAct();
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
  if (on && estadoAvisos() !== "ok") activarAvisos("rep").then(r => { if (r !== "ok" && r !== "demo") toast(textoAvisos(r), true); pintarTab(); });
  if (on) { try { POS = await miUbicacion(); } catch (e) { avisarUbicacion(e); } }
  REP.disponible = on; await DB.set("repartidores", YO.uid, { disponible: on, ...(POS ? { ubic: { ...POS, t: ahora() } } : {}) });
  despierto(on || ACT.length > 0); estadoDisp(); toast(on ? "🟢 Estás disponible: te avisaremos de los pedidos" : "Desconectado"); pintarTab();
}

/* ---------- Ofertas: pedidos libres de mi ciudad ---------- */
let PARAR_OF = null, VISTOS = null;
let PARAR_EN = null, VISTOS_E = null;
// Aviso por distancia: primero los repartidores cerca del negocio (5 km → 10 km; ferretería/talleres 10 → 25 km),
// cada 3 minutos se amplía y al final toda la provincia. Sin GPS, se ven todos.
let OFS_T = [], ENVS_T = [], ANILLO_INT = null;
const enRadio = (o, punto) => { const r = radioAviso(o); return r === Infinity || !POS || !punto || punto.lat == null || distanciaKm(POS, punto) <= r; };
function filtrarOfertas() {
  ENVS = ENVS_T.filter(e => enRadio(e, e.origen));
  const nuevasE = VISTOS_E ? ENVS.filter(e => !VISTOS_E.has(e.id + e.oferta)) : []; VISTOS_E = new Set([...(VISTOS_E || []), ...ENVS.map(e => e.id + e.oferta)]);
  if (nuevasE.length && ACT.length < MAX_ACT) avisar("📦 Envío de paquete", `${nuevasE[0].origen.dis} → ${nuevasE[0].destino.dis} · ofrecen ${S(nuevasE[0].oferta)}`);
  OFS = OFS_T.filter(o => enRadio(o, o.negocio && o.negocio.ubic));
  const nuevas = VISTOS ? OFS.filter(o => !VISTOS.has(o.id + o.creado)) : []; VISTOS = new Set([...(VISTOS || []), ...OFS.map(o => o.id + o.creado)]);
  if (nuevas.length && ACT.length < MAX_ACT) avisar("🛵 ¡Nuevo pedido!", `${nuevas[0].negocio.nombre} · ganas ${S(nuevas[0].envio)}`);
}
function escucharOfertas(on) {
  if (!on) { if (PARAR_OF) { PARAR_OF(); PARAR_OF = null; } if (PARAR_EN) { PARAR_EN(); PARAR_EN = null; } clearInterval(ANILLO_INT); ANILLO_INT = null; OFS = []; ENVS = []; OFS_T = []; ENVS_T = []; VISTOS = VISTOS_E = null; return; }
  if (PARAR_OF) return;
  let listoE = false, listoO = false;
  PARAR_EN = DB.escucharLista("envios", [["prov", "==", REP.prov], ["estado", "==", "buscando"]], l => {
    const lim = Date.now() - BUSQ_MIN * 60e3;
    ENVS_T = l.filter(e => puedeEnvio(e, REP.vehiculo) && new Date(e.buscadoEn) > lim);
    if (!listoE) { listoE = true; VISTOS_E = new Set(ENVS_T.filter(e => enRadio(e, e.origen)).map(e => e.id + e.oferta)); }
    filtrarOfertas(); if (TAB === "pedidos") pintarPedidos(true);
  });
  PARAR_OF = DB.escucharLista("ofertas", [["prov", "==", REP.prov], ["estado", "==", "libre"]], l => {
    const lim = Date.now() - 3 * 3600e3;
    OFS_T = l.filter(o => puedeLlevar(o, REP.vehiculo) && new Date(o.creado) > lim);
    if (!listoO) { listoO = true; VISTOS = new Set(OFS_T.filter(o => enRadio(o, o.negocio && o.negocio.ubic)).map(o => o.id + o.creado)); }
    filtrarOfertas(); if (TAB === "pedidos") pintarPedidos(true);
  });
  // Cada 20 s: si el aviso se amplió y ahora me alcanza, aparece (y suena)
  ANILLO_INT = setInterval(() => { const a = OFS.length + ":" + ENVS.length; filtrarOfertas(); if (a !== OFS.length + ":" + ENVS.length && TAB === "pedidos") pintarPedidos(true); }, 20000);
}
function avisar(t, cuerpo) {
  beep(3); navigator.vibrate?.([300, 120, 300]); toast(t + " · " + cuerpo);
  // Si los avisos del servidor están activos, la notificación la pone el servidor (evita duplicados)
  if (document.hidden && estadoAvisos() !== "ok" && "Notification" in window && Notification.permission === "granted") navigator.serviceWorker?.ready.then(r => r.showNotification(t, { body: cuerpo, icon: "img/icon-192.png", badge: "img/icon-192.png", tag: "apamuy", renotify: true, vibrate: [300, 120, 300] })).catch(() => {});
}

/* ---------- GPS en vivo y pantalla encendida ---------- */
let WATCH = null, ULT_ENV = 0, ULT_POS = null, ULT_REP = 0, WL = null;
function gps() {
  const on = (REP.disponible && !bloqueado()) || ACT.length > 0;
  if (on && WATCH == null && navigator.geolocation) WATCH = navigator.geolocation.watchPosition(p => { POS = { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) }; enviarUbic(); MAPAS.forEach(m => m.mio && m.mio(POS)); espYo(); },
    e => { if (e.code === 1) toast("Da permiso de ubicación para que el cliente te vea en el mapa", true); }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
  if (!on && WATCH != null) { navigator.geolocation.clearWatch(WATCH); WATCH = null; }
}
function enviarUbic() {
  const t = Date.now(), u = { ...POS, t: ahora() };
  // Al cliente: cada 10 s si me moví más de 20 m
  if (ACT.length && t - ULT_ENV > 10000 && (!ULT_POS || distanciaKm(ULT_POS, POS) > .026)) { ULT_ENV = t; ULT_POS = POS; DB.batch([...ACT.map(p => ({ op: "set", col: colDe(p), id: p.id, data: { repartidor: { ubic: u } } })), ...ACT.filter(p => p.rastreo).map(p => ({ op: "set", col: "rastreo", id: p.rastreo, data: { ubic: u } }))]).catch(e => console.warn(e)); }
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
  const dE = e => POS ? distanciaKm(POS, e.origen) : null, envs = ENVS.slice().sort((a, b) => (dE(a) ?? 99) - (dE(b) ?? 99));
  const htmlEnv = on && envs.length ? `<h2 class="a-t">📦 Envíos de paquetes <b>${envs.length}</b></h2>${envs.map(e => { const d = dE(e), mio = MISOF[e.id];
      return `<article class="of env ${ESP.sel === "e:" + e.id ? "sel" : ""}" data-sel="e:${esc(e.id)}"><div class="of-h"><b>${esc(TAM[e.tamano]?.[0] || "Paquete")}</b><strong>${S(e.oferta)}</strong></div>
        <p><span class="lg a">A</span> ${esc(e.origen.dis)}${d != null ? ` · <b>~${d.toFixed(1)} km de ti</b> <small class="muted">en línea recta</small>` : ""}</p><p><span class="lg b">B</span> ${esc(e.destino.dis)}${e.interprov ? `, ${esc(e.destino.provincia)}` : ""} · ${e.km} km de viaje</p>
        <div class="tags">${e.interprov ? `<span class="st warn">🚩 Interprovincial</span>` : ""}<span class="st">${esc(e.contenido)}</span><span class="st">${e.paga === "recibe" ? "Paga quien recibe" : "Pagan al recoger"}</span><span class="st mute">${hace(e.buscadoEn)}</span></div>
        ${mio ? `<div class="alert sm">⏳ Enviaste <b>${S(mio)}</b>. El cliente ve tu distancia y elige: si te elige, te avisamos con sonido.</div>` : ""}
        <div class="of-b">${mio === e.oferta ? `<button class="btn btn-pri" disabled>Esperando al cliente…</button>` : `<button class="btn btn-pri" data-tomarE="${esc(e.id)}" ${ACT.length >= MAX_ACT ? "disabled" : ""}>Aceptar ${S(e.oferta)}</button>`}<button class="btn btn-light" data-contra="${esc(e.id)}" ${ACT.length >= MAX_ACT ? "disabled" : ""}>${mio ? "Cambiar precio" : "Contraofertar"}</button></div></article>`; }).join("")}` : "";
  const html = `${ACT.map(tarjetaActiva).join("")}${htmlEnv}
    ${on ? `<h2 class="a-t">Pedidos cerca de ti ${ofs.length ? `<b>${ofs.length}</b>` : ""}</h2>${OFS_T.length + ENVS_T.length > OFS.length + ENVS.length ? `<p class="muted sm lejos-h">📡 Hay ${OFS_T.length + ENVS_T.length - OFS.length - ENVS.length} pedido(s) más lejos en tu provincia. Primero se avisa a los más cercanos; si nadie lo toma, en unos minutos te aparece.</p>` : ""}
      ${ACT.length >= MAX_ACT ? `<div class="alert">ℹ️ <span>Ya llevas ${MAX_ACT} pedidos. Entrega uno para tomar otro.</span></div>` : ""}
      ${ofs.map(o => { const d = dist(o); return `<article class="of ${o.vehiculo === "carro" ? "grande" : ""} ${ESP.sel === "o:" + o.id ? "sel" : ""}" data-sel="o:${esc(o.id)}"><div class="of-h"><b>${esc(o.negocio.nombre)}</b><strong>${S(o.envio)}</strong></div>
        <p>🏪 ${esc(o.negocio.direccion || "")}${d != null ? ` · <b>~${d.toFixed(1)} km de ti</b> <small class="muted">en línea recta</small>` : ""}</p><p>🏠 Zona: <b>${esc(o.zona || "—")}</b> · ${o.km ?? "?"} km del negocio al cliente</p>
        <div class="tags">${o.vehiculo === "carro" ? `<span class="st warn">🚗 Envío grande</span>` : o.vehiculo === "moto" ? `<span class="st">🛵 Envío pequeño</span>` : ""}${o.pago === "Efectivo" ? `<span class="st">💵 Efectivo</span>` : `<span class="st ok">Comida pagada (${esc(o.pago)})</span>`}${o.tiempo ? `<span class="st">⏱ Listo en ~${esc(o.tiempo)} min</span>` : ""}<span class="st mute">${hace(o.creado)}</span></div>
        <button class="btn btn-pri btn-lg" data-tomar="${esc(o.id)}" ${ACT.length >= MAX_ACT ? "disabled" : ""}>Aceptar pedido</button></article>`; }).join("") || (envs.length ? `<p class="muted sm">Por ahora no hay pedidos de comida.</p>` : `<div class="vacio esp-v"><p>Esperando pedidos… te avisaremos con sonido.</p><small>${estadoAvisos() === "ok" ? "Puedes cerrar la app: te llegará el aviso." : "Activa los avisos en Perfil para recibirlos con la app cerrada."}</small></div>`)}`
    : !ACT.length ? `<div class="vacio"><span class="big">😴</span><p><b>Estás desconectado</b></p><small>Activa «Disponible» arriba para recibir pedidos.</small></div>` : ""}`;
  // Mapa de espera (solo cuando está disponible y no lleva pedidos): se crea una vez y no se redibuja
  if (!$("#vl", V)) { V.innerHTML = `<section id="espW" class="esp" hidden><div id="espMapa" class="mapa esp-m"></div><div id="espInfo" class="esp-i"></div></section><div id="vl"></div>`; ESP.m = null; }
  const espera = on && !ACT.length; $("#espW").hidden = !espera;
  if (espera) { espIniciar($("#espMapa")); espItems(ofs, envs); }
  const VL = $("#vl");
  if (silencioso && VL.dataset.h === html) return;
  VL.innerHTML = html; VL.dataset.h = html; MAPAS = [];
  ACT.forEach(p => { const el = $(`#m-${CSS.escape(p.id)}`); if (!el) return; const yo = () => POS && { ...POS, color: "#FFC21A", txt: VEHIC[REP.vehiculo]?.[0] || "🛵" };
    const pts = () => p._t === "e" ? [{ ...p.origen, color: "#E63946", txt: "A" }, { ...p.destino, color: "#1A1430", txt: "B" }, yo()] : [p.negocio.ubic && { ...p.negocio.ubic, color: "#E63946", txt: "🏪" }, p.destino && { ...p.destino, color: "#1A1430", txt: "🏠" }, yo()];
    mapaPuntos(el, pts()).then(m => { if (m) MAPAS.push({ mio: () => m.pintar(pts()) }); }); });
  V.onclick = async e => { const t = e.target.closest("[data-tomar]"), a = e.target.closest("[data-acc]"), te = e.target.closest("[data-tomarE]"), co = e.target.closest("[data-contra]");
    if (t) return tomar(OFS.find(o => o.id === t.dataset.tomar), t);
    if (te) return tomarEnvio(ENVS.find(x => x.id === te.dataset.tomare), te);
    if (co) return contraofertar(ENVS.find(x => x.id === co.dataset.contra));
    if (a) { const [acc, id] = a.dataset.acc.split("|"); return accion(acc, ACT.find(p => p.id === id)); }
    const sl = e.target.closest("[data-sel]"); if (sl && !e.target.closest("button, a")) { espSel(sl.dataset.sel); $("#espW")?.scrollIntoView({ behavior: "smooth", block: "start" }); } };
}
function tarjetaActiva(p) {
  if (p._t === "e") return tarjetaEnvio(p);
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
      set("pedidos", o.id, { repUid: YO.uid, repartidor: { ...pubRep(), etapa: "yendo", tomado: ahora(), ...(POS ? { ubic: { ...POS, t: ahora() } } : {}) }, actualizado: ahora() });
      return true;
    });
    if (!ok) { toast("Otro repartidor lo tomó primero 😅", true); OFS = OFS.filter(x => x.id !== o.id); OFS_T = OFS_T.filter(x => x.id !== o.id); return pintarPedidos(); }
    beep(1); toast("✅ ¡Es tuyo! Ve al negocio"); scrollTo(0, 0);
  } catch (e) { console.error(e); toast("No se pudo aceptar: " + (e.code || e.message), true); btn.disabled = false; btn.textContent = "Aceptar pedido"; }
}
async function accion(a, p) {
  if (!p) return; if (p._t === "e") return accionEnvio(a, p); const upd = d => DB.set("pedidos", p.id, { ...d, actualizado: ahora() });
  if (a === "recoger") {
    const ef = p.pago === "Efectivo" && !p.pagado;
    return modal("¿Ya tienes el pedido?", `<p>Revisa que esté <b>completo</b> (${(p.items || []).map(i => `${i.cant}× ${esc(i.n)}`).join(", ")}).</p>${p.estado === "cocina" ? `<div class="alert warn sm">El negocio aún lo marca como «preparando». Recógelo solo si ya te lo entregaron.</div>` : ""}
      ${ef ? `<div class="alert sm">💵 Recuerda: cobras al cliente <b>${S(p.total)}</b>. La comida (${S(p.subtotal)}) es del negocio.</div>` : ""}`, async () => {
      await upd({ estado: "camino", despachado: ahora(), repartidor: { etapa: "camino", recogido: ahora() } }); toast("🛵 ¡En camino! El cliente te ve en el mapa"); }, "Sí, voy al cliente");
  }
  if (a === "entregar") { const ef = p.pago === "Efectivo" && !p.pagado;
    return modal("¿Entregaste el pedido?", `<p>Confirma que el cliente recibió su pedido y que cobraste <b>${S(ef ? p.total : p.envio)}</b>${ef ? " (comida + delivery)" : " (tu delivery)"}.</p>`, async () => {
      await upd({ estado: "entregado", entregado: ahora(), repartidor: { etapa: "entregado", entregado: ahora() } }); sumarEntrega(); toast(`🎉 ¡Bien! Ganaste ${S(p.envio)}`); cargarGanancias(); }, "Sí, entregado"); }
  if (a === "soltar") return modal("¿No puedes llevarlo?", `<p>El pedido vuelve a la lista para que otro repartidor lo tome. Hazlo solo si de verdad no puedes.</p>`, async () => {
    await DB.batch([{ op: "set", col: "ofertas", id: p.id, data: { estado: "libre", tomadoPor: null, soltadoPor: YO.uid } }, { op: "set", col: "pedidos", id: p.id, data: { repUid: null, repartidor: null, actualizado: ahora() }, merge: true }]);
    toast("Pedido liberado"); }, "Soltar pedido");
}

/* ---------- Ganancias y pago del % a Apamuy ---------- */
async function cargarGanancias() {
  const m = HOY().slice(0, 7), mp = addD(m + "-01", -1).slice(0, 7);
  const [a, b, pg, ea, eb] = await Promise.all([DB.list("pedidos", ["repUid", "==", YO.uid], ["mes", "==", m]), DB.list("pedidos", ["repUid", "==", YO.uid], ["mes", "==", mp]), DB.list("pagosRep", ["uid", "==", YO.uid]),
    DB.list("envios", ["repUid", "==", YO.uid], ["mes", "==", m]).catch(() => []), DB.list("envios", ["repUid", "==", YO.uid], ["mes", "==", mp]).catch(() => [])]).catch(e => { console.warn(e); return [[], [], [], [], []]; });
  PAGOS = pg.sort((x, y) => String(y.creado).localeCompare(x.creado));
  const cub = {}; PAGOS.filter(x => x.estado !== "rechazado").forEach(x => (x.dias || []).forEach(d => cub[d] = x.estado));
  const D = {}; [...a, ...b, ...[...ea, ...eb].map(e => ({ ...e, envio: e.precio }))].filter(p => p.estado === "entregado").forEach(p => { const r = D[p.dia] || (D[p.dia] = { dia: p.dia, n: 0, gan: 0 }); r.n++; r.gan += +p.envio || 0; });
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
  const pub = pubRep(), prom = promEstrellas(REPP);
  $("#v").innerHTML = `<section class="card perfil"><span class="pf-f" style="${pub.foto ? `background-image:url('${esc(pub.foto)}')` : ""}">${pub.foto ? "" : "👤"}</span><div><h2>${esc(r.nombre)}</h2><p class="muted">DNI ${esc(r.dni)} · ${esc(r.celular)}<br>${esc(r.provincia)} (${esc(r.departamento)})</p></div></section>
    <section class="card pub"><h2>Así te ven los clientes</h2><div class="pub-c"><span class="pf-f sm" style="${pub.foto ? `background-image:url('${esc(pub.foto)}')` : ""}">${pub.foto ? "" : esc(pub.nombre[0])}</span><div><b>${esc(pub.nombre)}</b><span>${prom ? `<em>★ ${prom.toFixed(1)}</em> (${REPP.estrellasN})` : `<em>Nuevo</em>`} · ${pub.entregas} entregas</span><small>${esc([vehTxt(r.vehiculo), r.marca, r.color].filter(Boolean).join(" · "))}</small></div>${r.placa ? `<span class="placa">${esc(r.placa)}</span>` : ""}</div>
      ${r.fotoNueva ? `<div class="alert warn sm">⏳ Tu foto nueva está en revisión. La verán los clientes cuando la aprobemos.</div>` : ""}<button class="btn btn-light" id="pfFoto">📸 ${pub.foto ? "Cambiar mi foto" : "Subir mi foto de perfil"}</button></section>
    <section class="card"><h2>${vehTxt(r.vehiculo)}</h2><dl class="dl">${r.placa ? `<dt>Placa</dt><dd>${esc(r.placa)}</dd><dt>Licencia</dt><dd>${esc(r.licencia || "")}</dd><dt>SOAT</dt><dd>${soatVencido(r) ? `<span class="st bad">Vencido</span>` : "vence"} ${fmtF(r.soatVence, { day: "numeric", month: "short", year: "numeric" })}</dd>` : `<dt>Tipo</dt><dd>Bicicleta</dd>`}</dl>
      ${r.placa ? `<button class="btn btn-light" id="pfSoat">Actualizar mi SOAT</button>` : ""}</section>
    <section class="card"><h2>📲 Para no perder pedidos</h2><ul class="tips"><li>${app ? "✅ Ya usas la app instalada." : ios ? "Instálala: toca <b>Compartir</b> ⬆️ → <b>Agregar a inicio</b>." : "Instálala: menú ⋮ de Chrome → <b>Instalar app</b> (o «Agregar a la pantalla principal»)."}</li>
      <li>Activa los <b>avisos</b>: te sonará cada pedido aunque cierres la app o bloquees el celular.</li><li>Activa el <b>GPS</b> y el <b>volumen</b>. Mientras llevas un pedido, deja la app abierta para que el cliente te vea en el mapa.</li></ul>
      ${estadoAvisos() === "ok" ? `<p class="av-ok">🔔 Avisos activados: te sonará cada pedido aunque cierres la app.</p>` : `<button class="btn btn-pri" id="pfNot">🔔 Activar avisos de pedidos</button>${estadoAvisos() === "bloqueado" ? `<p class="muted sm">${textoAvisos("bloqueado")}</p>` : ""}`}</section>
    ${CONF.soporte ? `<a class="btn btn-wa btn-lg" href="${esc(wa(CONF.soporte, `Hola Apamuy, soy ${r.nombre}, repartidor.`))}" target="_blank" rel="noopener">Ayuda por WhatsApp</a>` : ""}
    <button class="btn btn-light btn-lg" id="pfSalir">Cerrar sesión</button>`;
  $("#pfSalir").onclick = async () => { if (REP.disponible) await DB.set("repartidores", YO.uid, { disponible: false }).catch(() => {}); Sesion.salir(); };
  $("#pfNot")?.addEventListener("click", async () => { const r = await activarAvisos("rep"); toast(textoAvisos(r), r !== "ok"); pintarPerfil(); });
  $("#pfSoat")?.addEventListener("click", () => { let F2 = "";
    modal("Actualizar SOAT", `${fld("soatVence", "El nuevo SOAT vence el", "", { type: "date", req: true })}<div class="up"><span class="up-v" id="sV">📷</span><div><b>Foto del SOAT nuevo</b><label class="btn btn-light btn-sm">Subir foto<input type="file" accept="image/*" id="sF" hidden></label></div></div>`, async d => {
      if (!F2) { toast("Sube la foto del SOAT", true); return false; } if (d.soatVence < HOY()) { toast("Ese SOAT ya venció", true); return false; }
      const soatFoto = await subirPrivado(`repartidores/${YO.uid}/soatFoto-${Date.now().toString(36)}.jpg`, F2);
      await DB.set("repartidores", YO.uid, { soatVence: d.soatVence, soatFoto, soatActualizado: ahora() }); REP = { ...REP, soatVence: d.soatVence }; toast("SOAT actualizado"); estadoDisp(); pintarPerfil(); }, "Guardar", { alAbrir: () => {
      $("#sF").onchange = async e => { const f = e.target.files[0]; if (!f) return; F2 = await redimensionar(f, 1400, .8); $("#sV").textContent = ""; $("#sV").style.backgroundImage = `url('${F2}')`; }; } }); });
  $("#pfFoto").onclick = cambiarFoto;
}

/* ---------- Envíos de paquetes: aceptar, contraofertar y llevar ---------- */
// Como inDrive: aceptar el precio NO asigna al instante. Se envía como respuesta y el cliente elige (ve la distancia en su mapa).
const ubicAprox = () => POS ? { lat: Math.round(POS.lat * 1000) / 1000, lng: Math.round(POS.lng * 1000) / 1000 } : null;   // ~100 m, por privacidad
async function tomarEnvio(e, btn) {
  if (!e) return; if (ACT.length >= MAX_ACT) return toast(`Entrega uno de tus ${MAX_ACT} pedidos primero`, true);
  btn.disabled = true; btn.textContent = "Enviando…";
  try {
    await DB.set(`envios/${e.id}/ofertas`, YO.uid, { repUid: YO.uid, precio: e.oferta, acepta: true, rep: pubRep(), ubic: ubicAprox(), dist: POS ? r2(distanciaKm(POS, e.origen)) : null, creado: ahora() }, false);
    MISOF[e.id] = e.oferta; store.set("am_misof", MISOF); beep(1);
    toast(`Aceptaste ${S(e.oferta)}. El cliente elige entre los repartidores cercanos: si te elige, te avisamos con sonido`); pintarPedidos();
  } catch (x) { console.error(x); toast(x.code === "permission-denied" ? "Este envío ya tiene repartidor" : "No se pudo enviar: " + (x.code || x.message), true); btn.disabled = false; btn.textContent = `Aceptar ${S(e.oferta)}`; }
}
function contraofertar(e) {
  if (!e) return; const base = e.oferta, sug = Math.max(base, sugerirEnvio(e.km, e.tamano, tarifaProv(e.prov).envio));
  modal("Tu precio para este envío", `<p>El cliente ofrece <b>${S(base)}</b> por ${e.km} km${e.interprov ? " (interprovincial)" : ""}. Propón tu precio: el cliente ve tu foto, tus estrellas y tu vehículo, y elige.</p>
    <div class="chips-p">${[...new Set([base + 1, base + 2, base + 3, base + 5, sug].map(r2))].sort((a, b) => a - b).map(v => `<button type="button" class="btn btn-light" data-pv="${v}">${S(v)}</button>`).join("")}</div>
    ${fld("precio", "Mi precio (S/)", MISOF[e.id] || r2(base + 2), { type: "number", req: true, extra: `min="${CONF.envio.minimo}" step="0.5" inputmode="decimal"` })}`, async d => {
    const pr = r2(d.precio); if (!(pr >= CONF.envio.minimo)) { toast(`Mínimo ${S(CONF.envio.minimo)}`, true); return false; } if (pr > 3000) { toast("Ese precio es muy alto", true); return false; }
    await DB.set(`envios/${e.id}/ofertas`, YO.uid, { repUid: YO.uid, precio: pr, acepta: pr === base, rep: pubRep(), ubic: ubicAprox(), dist: POS ? r2(distanciaKm(POS, e.origen)) : null, creado: ahora() }, false);
    MISOF[e.id] = pr; store.set("am_misof", MISOF); toast(`💬 Enviaste ${S(pr)}. Si te elige, te avisamos con sonido`); pintarPedidos(); }, "Enviar mi precio", { alAbrir: F => {
    F.onclick = ev => { const b = ev.target.closest("[data-pv]"); if (b) $("[name=precio]", F).value = b.dataset.pv; }; } });
}
function tarjetaEnvio(e) {
  const pv = PRIV[e.id] || {}, cli = pv.cliente || {}, rec = pv.receptor || {}, rec2 = e.estado === "camino", B = (a, t, c = "btn-light") => `<button class="btn ${c}" data-acc="${a}|${esc(e.id)}">${t}</button>`;
  const cobraAqui = (e.paga === "recibe") === rec2, P = rec2 ? e.destino : e.origen, quien = rec2 ? rec : cli;
  return `<article class="act env"><div class="act-h"><span class="st ${rec2 ? "info" : "fire"}">${rec2 ? "📦 Llevando el paquete" : "📍 Ve a recoger el paquete"}</span><span class="mono">${esc(e.codigo)}</span></div>
    <div class="mapa act-m" id="m-${esc(e.id)}"></div>
    <div class="act-b"><h3><span class="lg ${rec2 ? "b" : "a"}">${rec2 ? "B" : "A"}</span> ${rec2 ? "Entregar a" : "Recoger de"} ${esc(quien.nombre || "")}</h3><p>${esc(P.texto)}${P.referencia ? `<br><small>${esc(P.referencia)}</small>` : ""}<br><small>${esc(P.dis)}, ${esc(P.provincia)}</small></p>
      <div class="acts"><a class="btn btn-acc" href="${nav(P.lat, P.lng)}" target="_blank" rel="noopener">🧭 Cómo llegar</a>${quien.celular ? `<a class="btn btn-light" href="tel:${esc(quien.celular)}">📞 Llamar</a><a class="btn btn-wa" href="${esc(wa(quien.celular, `Hola ${(quien.nombre || "").split(" ")[0]} 👋 soy ${REP.nombre.split(" ")[0]}, repartidor de Apamuy. ${rec2 ? "Estoy en camino con tu paquete." : "Voy a recoger el paquete."}`))}" target="_blank" rel="noopener">WhatsApp</a>` : ""}</div>
      <p class="muted sm">📦 ${esc(e.contenido)} · ${esc(TAM[e.tamano]?.[0] || "")}${e.interprov ? " · 🚩 interprovincial" : ""}${!rec2 ? ` · entrega en ${esc(e.destino.dis)} (${esc(rec.nombre || "")})` : ""}</p>
      <div class="cobro ${cobraAqui ? "ef" : ""}">${cobraAqui ? `💵 <b>Cobra ${S(e.precio)} ${rec2 ? "al entregar" : "al recoger"}</b><small>En efectivo o a tu Yape.</small>` : `✅ <b>${rec2 ? "Ya cobraste al recoger." : `Cobras ${S(e.precio)} al entregar.`}</b><small>${rec2 ? "Solo entrega el paquete." : "Paga quien recibe."}</small>`}</div>
      <div class="acts">${rec2 ? B("entregarE", `✅ Entregado · ${S(e.precio)}`, "btn-pri btn-lg") : B("recogerE", "📦 Ya recogí el paquete", "btn-pri btn-lg") + B("soltarE", "No puedo llevarlo")}</div></div></article>`;
}
async function accionEnvio(a, e) {
  const upd = d => DB.set("envios", e.id, { ...d, actualizado: ahora() });
  if (a === "recogerE") return modal("¿Ya tienes el paquete?", `<p>Revisa que sea <b>${esc(e.contenido)}</b> y que esté bien cerrado.${e.paga === "envia" ? ` Cobra <b>${S(e.precio)}</b> ahora.` : ""}</p>`, async () => {
    await upd({ estado: "camino", recogido: ahora(), repartidor: { etapa: "camino" } }); toast("📦 ¡En camino! Quien recibe te ve en el mapa"); }, "Sí, voy a entregar");
  if (a === "entregarE") return modal("¿Entregaste el paquete?", `<p>Confirma que <b>${esc((PRIV[e.id]?.receptor || {}).nombre || "quien recibe")}</b> recibió el paquete${e.paga === "recibe" ? ` y te pagó <b>${S(e.precio)}</b>` : ""}.</p>`, async () => {
    await upd({ estado: "entregado", entregado: ahora(), repartidor: { etapa: "entregado" } }); sumarEntrega(); delete MISOF[e.id]; store.set("am_misof", MISOF); toast(`🎉 ¡Bien! Ganaste ${S(e.precio)}`); cargarGanancias(); }, "Sí, entregado");
  if (a === "soltarE") return modal("¿No puedes llevarlo?", `<p>El envío vuelve a la lista para que otro repartidor lo tome.</p>`, async () => {
    await DB.set("envios", e.id, { estado: "buscando", repUid: null, repartidor: null, precio: null, buscadoEn: ahora(), actualizado: ahora() }); toast("Envío liberado"); }, "Soltar envío");
}
// Suma 1 a mis entregas (se ve en mi tarjeta pública)
function sumarEntrega() { if (REPP) DB.set("repPublico", YO.uid, { entregas: (+REPP.entregas || 0) + 1 }).catch(() => {}); }

/* ---------- Barra «Descargar app» ---------- */
let INST = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); INST = e; barraInstalar(); });
const esApp = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone;
function barraInstalar() {
  if (esApp() || $("#instB") || store.get("am_noinst", 0) > Date.now()) return;
  document.body.insertAdjacentHTML("afterbegin", `<div class="inst" id="instB"><img src="img/icon-192.png" alt="" width="40" height="40"><div><b>Apamuy Reparto</b><small>Descarga la app: más fácil y no te pierdes pedidos</small></div><button class="btn btn-acc btn-sm" id="instOk">Descargar app</button><button class="inst-x" id="instX" aria-label="Cerrar">×</button></div>`);
  $("#instX").onclick = () => { $("#instB").remove(); store.set("am_noinst", Date.now() + 3 * 864e5); };
  $("#instOk").onclick = instalarApp;
}
async function instalarApp() {
  if (INST) { INST.prompt(); const r = await INST.userChoice; INST = null; if (r.outcome === "accepted") $("#instB")?.remove(); return; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  modal("Descargar la app", ios ? `<ol class="pasos-i"><li>Abre esta página en <b>Safari</b>.</li><li>Toca <b>Compartir</b> (el cuadrado con la flecha ↑).</li><li>Elige <b>«Agregar a inicio»</b> → <b>Agregar</b>.</li><li>Abre <b>Apamuy Reparto</b> desde el ícono nuevo.</li></ol>`
    : `<ol class="pasos-i"><li>Abre esta página en <b>Chrome</b>.</li><li>Toca el menú <b>⋮</b> arriba a la derecha.</li><li>Elige <b>«Instalar app»</b> o «Agregar a la pantalla principal».</li><li>Abre <b>Apamuy Reparto</b> desde el ícono nuevo.</li></ol>`, null);
}

// Foto de perfil nueva: queda en revisión hasta que el admin la apruebe
function cambiarFoto() { let F2 = "";
  modal("Tu foto de perfil", `<p class="muted">De frente, con buena luz, sin lentes oscuros ni gorra. La revisamos antes de que la vean los clientes.</p><div class="up"><span class="up-v" id="cfV">📷</span><div><b>Foto de perfil</b><label class="btn btn-light btn-sm">Tomar / subir foto<input type="file" accept="image/*" capture="user" id="cfF" hidden></label></div></div>`, async () => {
    if (!F2) { toast("Elige una foto", true); return false; }
    const u = await subirFoto(`perfiles/${YO.uid}/foto-${Date.now().toString(36)}.jpg`, F2);
    await DB.set("repartidores", YO.uid, { fotoNueva: u, fotoNuevaEn: ahora() }); REP.fotoNueva = u; $(".a-foto")?.remove(); toast("📸 Foto enviada para revisión"); if (TAB === "perfil") pintarPerfil(); }, "Enviar foto", { alAbrir: () => {
    $("#cfF").onchange = async e => { const f = e.target.files[0]; if (!f) return; F2 = await redimensionar(f, 700, .8); $("#cfV").textContent = ""; $("#cfV").style.backgroundImage = `url('${F2}')`; }; } });
}

/* ---------- Mapa de espera: mi ubicación, pedidos con su precio y la ruta hasta el que elijo ---------- */
const ESP = { m: null, L: null, yo: null, pins: null, ruta: null, sel: null, items: [], mano: false, rutaDesde: null, cache: {} };
async function espIniciar(el) {
  if (ESP.m || ESP.cargando) return; ESP.cargando = true;
  let L; try { L = await cargarLeaflet(); } catch (e) { ESP.cargando = false; mapaFallo(el, () => espIniciar(el)); return; }
  ESP.cargando = false; if (!document.body.contains(el)) return;
  const c = POS || centroDe(REP.departamento, REP.provincia) || CONF.centro; el.innerHTML = "";
  ESP.L = L; ESP.m = L.map(el, { zoomControl: false, attributionControl: true }).setView([c.lat, c.lng], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(ESP.m);
  ESP.ruta = L.layerGroup().addTo(ESP.m); ESP.pins = L.layerGroup().addTo(ESP.m); ESP.yo = null; ESP.mano = false;
  ESP.m.on("dragstart", () => ESP.mano = true);
  espYo(); espPintar();
}
function espYo() {
  if (!ESP.m || !POS) return; const L = ESP.L;
  if (!ESP.yo) ESP.yo = L.marker([POS.lat, POS.lng], { icon: L.divIcon({ className: "yo-pin", html: `<span>${VEHIC[REP.vehiculo]?.[0] || "🛵"}</span>`, iconSize: [40, 40], iconAnchor: [20, 20] }), zIndexOffset: 1000 }).addTo(ESP.m);
  else ESP.yo.setLatLng([POS.lat, POS.lng]);
  if (!ESP.sel && !ESP.mano) ESP.m.setView([POS.lat, POS.lng], Math.max(ESP.m.getZoom(), 15));
  // Si me moví más de 150 m, recalculo la ruta hasta el pedido elegido
  if (ESP.sel && ESP.rutaDesde && distanciaKm(ESP.rutaDesde, POS) > .15) espRuta();
}
// Lista de pedidos para el mapa (pedidos de comida y envíos de paquetes)
function espItems(ofs, envs) {
  const it = [...ofs.filter(o => o.negocio.ubic).map(o => ({ k: "o:" + o.id, tipo: "o", nombre: o.negocio.nombre, precio: o.envio, pick: o.negocio.ubic, zona: o.zonaUbic || null, zonaTxt: o.zona, km: o.km })),
    ...envs.map(e => ({ k: "e:" + e.id, tipo: "e", nombre: TAM[e.tamano]?.[0] || "Paquete", precio: e.oferta, pick: e.origen, zona: e.destino, zonaTxt: e.destino.dis + (e.interprov ? ", " + e.destino.provincia : ""), km: e.km }))];
  const firma = JSON.stringify(it.map(x => [x.k, x.precio]));
  if (firma === ESP.firma) return; ESP.firma = firma; ESP.items = it; espPintar();
}
function espPintar() {
  if (!ESP.m) return; const L = ESP.L; ESP.pins.clearLayers();
  if (!ESP.items.find(x => x.k === ESP.sel)) ESP.sel = ESP.items[0] ? ESP.items[0].k : null;   // el más cercano
  ESP.items.forEach(x => L.marker([x.pick.lat, x.pick.lng], { icon: L.divIcon({ className: "pr-pin", html: `<div class="pr ${x.k === ESP.sel ? "on" : ""} ${x.tipo === "e" ? "env" : ""}"><i>${x.tipo === "e" ? "📦" : "🏪"}</i><b>${S(x.precio)}</b></div>`, iconSize: [96, 40], iconAnchor: [48, 40] }), zIndexOffset: x.k === ESP.sel ? 500 : 0 })
    .on("click", () => espSel(x.k)).addTo(ESP.pins));
  espRuta();
}
function espSel(k) { if (!ESP.items.find(x => x.k === k)) return; ESP.sel = k; ESP.mano = false; espPintar(); $$("#vl [data-sel]").forEach(a => a.classList.toggle("sel", a.dataset.sel === k)); }
// Ruta por calles con el servicio público OSRM; si falla, línea recta punteada
async function rutaCalles(a, b) {
  const key = [a.lat, a.lng, b.lat, b.lng].map(v => (+v).toFixed(4)).join(",");
  if (ESP.cache[key]) return ESP.cache[key];
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 7000);
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`, { signal: ctl.signal }).then(x => x.json()); clearTimeout(t);
    const rt = r.routes && r.routes[0]; if (!rt) throw 0;
    return ESP.cache[key] = { pts: rt.geometry.coordinates.map(([lng, lat]) => [lat, lng]), km: rt.distance / 1000, min: Math.max(1, Math.round(rt.duration / 60)) };
  } catch (e) { return { pts: [[a.lat, a.lng], [b.lat, b.lng]], km: distanciaKm(a, b), min: null, recta: true }; }
}
async function espRuta() {
  if (!ESP.m) return; const L = ESP.L, it = ESP.items.find(x => x.k === ESP.sel), info = $("#espInfo"); ESP.ruta.clearLayers();
  if (!it) { ESP.rutaDesde = null; info.innerHTML = `<div class="esp-esp"><span class="radar sm"></span><div><b>Esperando pedidos…</b><small>${estadoAvisos() === "ok" ? "Te avisaremos aunque cierres la app." : "Te avisaremos con sonido. Deja esta pantalla abierta."}</small></div></div>`; if (POS && !ESP.mano) ESP.m.setView([POS.lat, POS.lng], 15); return; }
  // Del recojo a la zona de entrega: línea punteada (la dirección exacta se ve al aceptar)
  if (it.zona) { L.polyline([[it.pick.lat, it.pick.lng], [it.zona.lat, it.zona.lng]], { color: "#1A1430", weight: 3, dashArray: "6 8", opacity: .7 }).addTo(ESP.ruta);
    if (it.tipo === "o") L.circle([it.zona.lat, it.zona.lng], { radius: 600, color: "#1A1430", weight: 1.5, fillOpacity: .08 }).addTo(ESP.ruta);
    else L.marker([it.zona.lat, it.zona.lng], { icon: pinIcono(L, "#1A1430", "B") }).addTo(ESP.ruta); }
  const pinta = r => {
    info.innerHTML = `<div class="esp-sel"><div><b>${it.tipo === "e" ? "📦" : "🏪"} ${esc(it.nombre)}</b><small>${r ? `🛵 a <b>${r.km.toFixed(1)} km</b>${r.min ? ` · ${r.min} min` : ""} de ti${r.recta ? " (aprox.)" : ""}` : "Activa tu GPS para ver la ruta"} · 🏠 ${esc(it.zonaTxt || "")}${it.km != null ? ` · ${it.km} km al cliente` : ""}</small></div><strong>${S(it.precio)}</strong></div>`;
    const b = [[it.pick.lat, it.pick.lng]]; if (POS) b.push([POS.lat, POS.lng]); if (it.zona) b.push([it.zona.lat, it.zona.lng]);
    if (!ESP.mano) ESP.m.fitBounds(b, { padding: [36, 36], maxZoom: 16 });
  };
  if (!POS) return pinta(null);
  ESP.rutaDesde = { ...POS }; const k = ESP.sel, r = await rutaCalles(POS, it.pick);
  if (ESP.sel !== k) return;
  L.polyline(r.pts, { color: "#E63946", weight: 5, opacity: .9, dashArray: r.recta ? "8 8" : null }).addTo(ESP.ruta); pinta(r);
}
