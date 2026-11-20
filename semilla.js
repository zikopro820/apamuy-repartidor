/* =========================================================
   APAMUY — Datos de ejemplo: rubros, banners y 4 negocios de comida en Cusco.
   El admin los carga desde el panel (Página web → Cargar ejemplos). Se pueden borrar.
   ========================================================= */
window.AM_SEMILLA = function () {
  const F = (f, w = 640) => "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(f) + "?width=" + w;
  const ahora = new Date().toISOString(), R = {};
  const rubro = (id, nombre, orden, d = {}) => R[id] = { nombre, imagen: `img/rubros/${id}.svg`, orden, activo: true, modo: "productos", mayorEdad: false, requiereRegistro: "", aviso: "", tipos: [], color: "#FFF1E6", ...d };
  rubro("comida", "Comida", 0, { color: "#FFF1E6", tipos: ["Pollería", "Pizzería", "Chifa", "Cevichería", "Comida criolla", "Parrillas", "Hamburguesas", "Postres y cafés", "Jugos", "Otros"] });
  rubro("super", "Súper y bodegas", 1, { color: "#E3F6F1", tipos: ["Minimarket", "Bodega", "Frutas y verduras", "Panadería", "Otros"] });
  rubro("farmacia", "Farmacia", 2, { color: "#E6F7EE", tipos: ["Farmacia", "Botica"], requiereRegistro: "N° de registro DIGEMID", aviso: "Solo productos sin receta médica. Los medicamentos con receta se compran en la farmacia." });
  rubro("licoreria", "Licorería", 3, { color: "#F4ECF7", tipos: ["Licorería", "Cervecería"], mayorEdad: true, aviso: "Venta solo a mayores de 18 años. Tomar bebidas alcohólicas en exceso es dañino." });
  rubro("ferreteria", "Ferretería", 4, { color: "#FDF2E2", tipos: ["Ferretería", "Materiales de construcción", "Pinturas", "Electricidad"], envioGrande: true });
  rubro("repuestos", "Repuestos", 5, { color: "#EAF0F6", tipos: ["Autos", "Motos", "Bicicletas", "Llantas"] });
  rubro("talleres", "Talleres", 6, { color: "#FDECEC", modo: "servicios", tipos: ["Mecánica", "Llantería", "Electricidad automotriz", "Motos", "Planchado y pintura"], envioGrande: true });

  const B = {
    b1: { titulo: "Pollo a la brasa a tu puerta", texto: "Los mejores de Cusco, calientitos y con delivery.", boton: "Pedir ahora", enlace: "rubro:comida", imagen: F("Pollo_a_la_brasa_peruano.jpg", 600), color: "#E63946", prov: "", orden: 0, activo: true },
    b2: { titulo: "¿Tienes un negocio?", texto: "Véndelo en Apamuy y llega a toda tu ciudad.", boton: "Registrarme", enlace: "panel", imagen: "", color: "#1A1430", prov: "", orden: 1, activo: true }
  };

  const N = {}, P = {}, C = {};
  const base = { estado: "activo", demo: true, rubro: "comida", departamento: "Cusco", provincia: "Cusco", prov: "Cusco|Cusco", abre: "10:00", cierra: "23:00", dias: [0, 1, 2, 3, 4, 5, 6], delivery: true, recojo: true, pedidoMinimo: 15,
    pagoYape: true, pagoPlin: true, contraEntrega: true, yapeNum: "999 999 999", yapeTitular: "Tienda de ejemplo", plinNum: "999 999 999", plinTitular: "Tienda de ejemplo", telefono: "", whatsapp: "", creado: ahora, aprobado: ahora,
    documento: { tipo: "RUC", numero: "00000000000", nombre: "Tienda de ejemplo" } };
  const neg = (id, d, cats, prods) => { N[id] = { ...base, owner: id, email: "", ...d };
    C[`negocios/${id}/categorias`] = Object.fromEntries(cats.map(([cid, nombre], i) => [cid, { nombre, orden: i }]));
    P[`negocios/${id}/productos`] = Object.fromEntries(prods.map((p, i) => [p.id, { activo: true, agotado: false, orden: i, opciones: [], desc: "", ...p, id: undefined }])); };
  const tam = { titulo: "Tamaño", tipo: "uno", req: true, items: [{ n: "Personal 500 ml" }, { n: "1 litro", p: 3 }, { n: "1.5 litros", p: 5 }] };
  const beb = [{ id: "inca", cat: "bebidas", nombre: "Inca Kola", precio: 4, foto: F("IncaKolaBottleGlass.jpg"), opciones: [tam] }, { id: "coca", cat: "bebidas", nombre: "Coca-Cola", precio: 4, foto: F("Coca-Cola_Bottle.jpeg"), opciones: [tam] },
    { id: "chicha", cat: "bebidas", nombre: "Chicha morada", precio: 7, desc: "Jarra de 1 litro, hecha en casa.", foto: F("Chicha_Morada_2017.jpg") }];
  const parte = { titulo: "Parte del pollo", tipo: "uno", req: true, items: [{ n: "Pecho" }, { n: "Pierna" }] };
  const acomp = { titulo: "Acompañamiento", tipo: "uno", req: true, items: [{ n: "Papas fritas" }, { n: "Papas sancochadas" }, { n: "Arroz chaufa", p: 3 }] };

  neg("demo-pollon", { nombre: "Pollería El Pollón", tipo: "Pollería", descripcion: "Pollo a la brasa al carbón, como debe ser.", tiempo: "30-40 min", distrito: "Wanchaq", direccion: "Av. de la Cultura 1020", ubic: { lat: -13.5245, lng: -71.9585 },
    portada: F("Pollo_a_la_brasa_peruano.jpg", 900), logo: F("Un_cuarto_de_Pollo_a_la_Brasa.JPG", 200), extrasGratis: ["Mayonesa", "Ají de la casa", "Huancaína", "Ketchup", "Mostaza"] },
    [["pollos", "Pollos a la brasa"], ["combos", "Combos"], ["bebidas", "Bebidas"]],
    [{ id: "p14", cat: "pollos", nombre: "1/4 de pollo a la brasa", precio: 18.9, desc: "Con papas fritas y ensalada fresca.", foto: F("Un_cuarto_de_Pollo_a_la_Brasa.JPG"), opciones: [parte, acomp], extrasGratis: true, sugerirBebida: true, destacado: true },
     { id: "p12", cat: "pollos", nombre: "1/2 pollo a la brasa", precio: 34.9, desc: "Papas familiares y ensalada.", foto: F("Pollo_a_la_brasa_pierna_con_papas.JPG"), opciones: [acomp], extrasGratis: true, sugerirBebida: true, destacado: true },
     { id: "p1", cat: "pollos", nombre: "1 pollo a la brasa", precio: 62.9, desc: "Para 4 personas, con papas y ensalada.", foto: F("Pollo_a_la_brasa_para_llevar.JPG"), opciones: [acomp], extrasGratis: true, sugerirBebida: true },
     { id: "cfam", cat: "combos", nombre: "Combo familiar", precio: 79.9, desc: "1 pollo + papas + ensalada + gaseosa 1.5 L.", foto: F("Pollo_a_la_brasa_Lima_Peru.jpg"), extrasGratis: true }, ...beb]);

  neg("demo-napoli", { nombre: "Pizzería Bella Napoli", tipo: "Pizzería", descripcion: "Pizzas al horno de leña en el centro de Cusco.", tiempo: "35-45 min", distrito: "Cusco", direccion: "Calle Tecsecocha 210", ubic: { lat: -13.5155, lng: -71.9812 },
    portada: F("Closeup_of_a_pepperoni_pizza.jpg", 900), logo: F("Pepperoni_pizza.jpg", 200) },
    [["pizzas", "Pizzas"], ["bebidas", "Bebidas"]],
    [{ id: "pep", cat: "pizzas", nombre: "Pizza pepperoni", precio: 32, desc: "Mozzarella y pepperoni.", foto: F("Pepperoni_pizza.jpg"), opciones: [{ titulo: "Tamaño", tipo: "uno", req: true, items: [{ n: "Mediana (6 tajadas)" }, { n: "Familiar (8 tajadas)", p: 10 }] }], sugerirBebida: true, destacado: true },
     { id: "haw", cat: "pizzas", nombre: "Pizza hawaiana", precio: 30, desc: "Jamón, piña y mozzarella.", foto: F("Hawaiian_pizza_1.jpg"), opciones: [{ titulo: "Tamaño", tipo: "uno", req: true, items: [{ n: "Mediana (6 tajadas)" }, { n: "Familiar (8 tajadas)", p: 10 }] }], sugerirBebida: true, destacado: true },
     { id: "amer", cat: "pizzas", nombre: "Pizza americana", precio: 28, desc: "Jamón y mozzarella.", foto: F("Closeup_of_a_pepperoni_pizza.jpg"), sugerirBebida: true },
     { id: "supr", cat: "pizzas", nombre: "Pizza suprema", precio: 38, desc: "Carnes, pimientos, aceitunas y más.", foto: F("Pizza.JPG"), sugerirBebida: true }, ...beb.slice(0, 2)]);

  neg("demo-dragon", { nombre: "Chifa Dragón de Oro", tipo: "Chifa", descripcion: "Chaufa, tallarines y wantanes al wok.", tiempo: "30-40 min", distrito: "Cusco", direccion: "Av. El Sol 520", ubic: { lat: -13.5225, lng: -71.9745 },
    portada: F("Tallarin_Saltado_Peru.jpg", 900), logo: F("Arroz_chaufa.JPG", 200) },
    [["platos", "Platos de fondo"], ["sopas", "Sopas"], ["bebidas", "Bebidas"]],
    [{ id: "chaufa", cat: "platos", nombre: "Arroz chaufa de pollo", precio: 18, foto: F("Arroz_chaufa.JPG"), opciones: [{ titulo: "Elige", tipo: "uno", req: true, items: [{ n: "Pollo" }, { n: "Carne", p: 4 }, { n: "Mixto", p: 6 }] }], sugerirBebida: true, destacado: true },
     { id: "tallarin", cat: "platos", nombre: "Tallarín saltado", precio: 20, foto: F("Tallarin_Saltado_Peru.jpg"), sugerirBebida: true, destacado: true },
     { id: "aeropuerto", cat: "platos", nombre: "Aeropuerto", precio: 22, desc: "Chaufa y tallarín saltado mezclados, con tortilla.", foto: F("Aeropuerto-Chifa.JPG"), sugerirBebida: true },
     { id: "kamlu", cat: "platos", nombre: "Kam lu wantán", precio: 26, foto: F("Kam_lu_wantan.JPG"), sugerirBebida: true },
     { id: "sopa", cat: "sopas", nombre: "Sopa wantán", precio: 16, foto: F("Sopa_wantan.JPG") }, ...beb.slice(0, 2)]);

  neg("demo-muelle", { nombre: "Cevichería El Muelle", tipo: "Cevichería", descripcion: "Ceviches y platos marinos frescos.", tiempo: "30-40 min", distrito: "Wanchaq", direccion: "Av. Manco Cápac 410", ubic: { lat: -13.5250, lng: -71.9650 },
    portada: F("Ceviche_de_pescado_(La_Punta,_Callao).jpg", 900), logo: F("Ceviche_peruano.jpg", 200), cierra: "17:00", abre: "10:00" },
    [["ceviches", "Ceviches"], ["fondos", "Platos de fondo"], ["bebidas", "Bebidas"]],
    [{ id: "cev", cat: "ceviches", nombre: "Ceviche de pescado", precio: 28, desc: "Con camote, choclo y cancha.", foto: F("Ceviche_peruano.jpg"), opciones: [{ titulo: "Picante", tipo: "uno", req: true, items: [{ n: "Sin picante" }, { n: "Poco picante" }, { n: "Bien picante" }] }], sugerirBebida: true, destacado: true },
     { id: "trucha", cat: "ceviches", nombre: "Ceviche de trucha", precio: 25, desc: "Trucha andina fresca.", foto: F("Ceviche_de_trucha_(Peru).JPG"), sugerirBebida: true, destacado: true },
     { id: "lomo", cat: "fondos", nombre: "Lomo saltado", precio: 30, desc: "Con papas fritas y arroz.", foto: F("Lomo_saltado_peruano.jpg"), sugerirBebida: true },
     { id: "mixto", cat: "ceviches", nombre: "Ceviche mixto", precio: 34, foto: F("Ceviche_at_Peru.jpg"), sugerirBebida: true }, ...beb]);
  return { rubros: R, banners: B, negocios: N, ...C, ...P };
};
