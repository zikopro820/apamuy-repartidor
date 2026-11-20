/* =========================================================
   APAMUY — Configuración (es el MISMO archivo en apamuy, apamuy-panel y apamuy-repartidor)
   Si apiKey empieza con "PEGA", todo funciona en MODO DEMO (datos solo en ese navegador).
   ========================================================= */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCnwCNXLZ-xTm37LgkeQ28ast_c7G6-m5w",
  authDomain: "apamuy.app",
  projectId: "apamuy-faf7a",
  storageBucket: "apamuy-faf7a.firebasestorage.app",
  messagingSenderId: "461554598984",
  appId: "1:461554598984:web:eb301a7bb49d7d8d19847d"
};

window.APAMUY = {
  nombre: "Apamuy",
  lema: "Te lo traemos.",
  web: "https://apamuy.app",                             // app de clientes
  panel: "https://panel.apamuy.app",                     // panel de negocios y admin
  reparto: "https://reparto.apamuy.app",                 // app de repartidores
  // Correos con permiso de ADMINISTRADOR GENERAL (usa los MISMOS en firestore.rules y storage.rules)
  admins: ["admin@apamuy.com"],
  // Punto de inicio de los mapas (Cusco). Se puede cambiar en el panel → Configuración.
  centro: { lat: -13.5226, lng: -71.9673 }
};
