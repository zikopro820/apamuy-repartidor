/* =========================================================
   APAMUY — Datos de MODO DEMO (solo si apiKey empieza con "PEGA")
   Usa los mismos ejemplos que el admin carga en Firebase (semilla.js).
   ========================================================= */
window.AM_DEMO = function () {
  const s = window.AM_SEMILLA(), ahora = new Date().toISOString();
  const db = { config: { general: { comision: 10, delivery: { base: 4, porKm: 1, maxKm: 15, maxKmGrande: 50 }, ciudadInicial: { dep: "Cusco", prov: "Cusco" } } }, usuarios: {}, pedidos: {}, ...s };
  db.negocios["neg-jugos"] = { owner: "neg-jugos", email: "jugos@demo.pe", estado: "pendiente", rubro: "comida", tipo: "Jugos", nombre: "Juguería La Fresca", descripcion: "Jugos y sánguches.", departamento: "Cusco", provincia: "Cusco", distrito: "Cusco", prov: "Cusco|Cusco",
    direccion: "Mercado San Pedro, puesto 12", ubic: { lat: -13.521, lng: -71.984 }, abre: "07:00", cierra: "19:00", dias: [0, 1, 2, 3, 4, 5, 6], telefono: "984555666", delivery: true, recojo: true, pagoYape: true, yapeNum: "984555666", contraEntrega: true, creado: ahora,
    documento: { tipo: "DNI", numero: "12345678", nombre: "Rosa Quispe" } };
  // Solo en modo demo: un taller para probar «Solicitar servicio»
  db.negocios["neg-taller"] = { owner: "neg-taller", email: "taller@demo.pe", estado: "activo", rubro: "talleres", tipo: "Motos", nombre: "Taller MotoFix", descripcion: "Mecánica de motos y llantería.", departamento: "Cusco", provincia: "Cusco", distrito: "Santiago", prov: "Cusco|Cusco",
    direccion: "Av. Grau 300", ubic: { lat: -13.528, lng: -71.975 }, abre: "08:00", cierra: "20:00", dias: [1, 2, 3, 4, 5, 6], estadoManual: "abierto", telefono: "984000111", creado: ahora };
  db["negocios/neg-taller/categorias"] = { s: { nombre: "Servicios", orden: 0 } };
  db["negocios/neg-taller/productos"] = { aceite: { cat: "s", nombre: "Cambio de aceite", precio: 35, desc: "Incluye aceite 20W-50.", activo: true, destacado: true, orden: 0 }, parche: { cat: "s", nombre: "Parchado de llanta", precio: 10, activo: true, orden: 1 } };
  db.negocios["neg-ferre"] = { owner: "neg-ferre", email: "ferre@demo.pe", estado: "activo", rubro: "ferreteria", tipo: "Ferretería", nombre: "Ferretería El Constructor", descripcion: "Materiales, herramientas y repuestos.", departamento: "Cusco", provincia: "Cusco", distrito: "Wanchaq", prov: "Cusco|Cusco",
    direccion: "Av. Huayruropata 850", ubic: { lat: -13.53, lng: -71.962 }, abre: "08:00", cierra: "20:00", dias: [0, 1, 2, 3, 4, 5, 6], estadoManual: "abierto", telefono: "984222333", delivery: true, recojo: true, contraEntrega: true, creado: ahora };
  db["negocios/neg-ferre/categorias"] = { m: { nombre: "Materiales", orden: 0 } };
  db["negocios/neg-ferre/productos"] = { cem: { cat: "m", nombre: "Cemento Sol 42.5 kg", precio: 29.9, activo: true, destacado: true, orden: 0 }, cla: { cat: "m", nombre: "Clavos 3\" (1 kg)", precio: 6.5, activo: true, orden: 1 } };
  Object.values(db.negocios).forEach(n => { if (String(n.owner).startsWith("demo-")) n.estadoManual = "abierto"; });
  // Repartidores de prueba (los "documentos" son dibujos de ejemplo)
  const doc = t => "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" rx="14" fill="#f1e9db"/><text x="160" y="108" font-family="sans-serif" font-size="22" text-anchor="middle" fill="#625C73">${t}</text></svg>`);
  const dia = n => { const d = new Date(Date.now() - 5 * 3600e3 - n * 864e5); return d.toISOString().slice(0, 10); };
  const docs = { foto: doc("Selfie"), dniFrente: doc("DNI frente"), dniReverso: doc("DNI reverso"), antecedentes: doc("Antecedentes"), firma: doc("Firma"), vehiculoFoto: doc("Vehículo") };
  const rep = (uid, d) => db.repartidores[uid] = { email: uid + "@demo.pe", departamento: "Cusco", provincia: "Cusco", prov: "Cusco|Cusco", nacimiento: "1995-05-10", talla: "M", consentimiento: true,
    domicilio: { texto: "Av. de la Cultura 1200", referencia: "", lat: -13.53, lng: -71.955, distrito: "Wanchaq" }, declaracion: { version: 1, fecha: ahora }, casaca: { monto: 40, operacion: "123456" }, creado: ahora, ...docs, ...d };
  db.repartidores = {};
  rep("rep-juan", { nombre: "Juan Mamani Quispe", dni: "45678912", celular: "984111222", vehiculo: "moto", placa: "1234-4A", licencia: "Q45678912", soatVence: dia(-200), soatFoto: doc("SOAT"), licenciaFoto: doc("Licencia"), estado: "activo", aprobado: ahora });
  rep("rep-carlos", { nombre: "Carlos Huamán Ccori", dni: "41234567", celular: "984333444", vehiculo: "carro", placa: "X1Y-234", licencia: "Q41234567", soatVence: dia(-100), soatFoto: doc("SOAT"), licenciaFoto: doc("Licencia"), estado: "activo", aprobado: ahora });
  rep("rep-ana", { nombre: "Ana Condori Puma", dni: "47788990", celular: "984555777", vehiculo: "bici", estado: "pendiente" });
  // Carlos repartió ayer y no pagó su 10 % → la app lo bloquea hasta que pague
  [["AP-DEMO01", 6], ["AP-DEMO02", 7.5]].forEach(([c, envio]) => db.pedidos[c] = { codigo: c, negocioId: "demo-pollon", negocio: { nombre: "Pollería El Pollón (ejemplo)" }, clienteUid: "cli-demo", cliente: { nombre: "Cliente Demo", celular: "999888777" },
    items: [{ n: "1/4 de pollo", cant: 1, precio: 18 }], subtotal: 18, envio, km: 3, total: 18 + envio, entrega: "delivery", pago: "Efectivo", estado: "entregado", dia: dia(1), mes: dia(1).slice(0, 7), creado: ahora, repUid: "rep-carlos", repartidor: { uid: "rep-carlos", nombre: "Carlos Huamán Ccori", vehiculo: "carro" } });
  // Perfil público (lo que ve el cliente) y foto de perfil de ejemplo
  const cara = (c, l) => "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="${c}"/><circle cx="60" cy="46" r="22" fill="#fff" opacity=".9"/><path d="M20 112a40 34 0 0 1 80 0" fill="#fff" opacity=".9"/><text x="60" y="54" font-family="sans-serif" font-size="20" font-weight="700" text-anchor="middle" fill="${c}">${l}</text></svg>`);
  Object.assign(db.repartidores["rep-juan"], { fotoPerfil: cara("#3a2c6b", "J"), marca: "Honda CB 125", color: "Roja" });
  Object.assign(db.repartidores["rep-carlos"], { fotoPerfil: cara("#157347", "C"), marca: "Toyota Yaris", color: "Plata" });
  db.repPublico = { "rep-juan": { nombre: "Juan Mamani", foto: cara("#3a2c6b", "J"), vehiculo: "moto", marca: "Honda CB 125", color: "Roja", placa: "1234-4A", prov: "Cusco|Cusco", entregas: 37, estrellasSum: 176, estrellasN: 37 },
    "rep-carlos": { nombre: "Carlos Huamán", foto: cara("#157347", "C"), vehiculo: "carro", marca: "Toyota Yaris", color: "Plata", placa: "X1Y-234", prov: "Cusco|Cusco", entregas: 12, estrellasSum: 55, estrellasN: 12 } };
  db.pagosRep = {};
  db.config.general.cobro = { yape: "984 000 000", titular: "Apamuy (ejemplo)", qr: "" };
  return db;
};
