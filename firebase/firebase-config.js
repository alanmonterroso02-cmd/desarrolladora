// ============================================================
//  FIREBASE - CONFIGURACIÓN
//  Asociación Tecnológica Monterroso
// ============================================================
//
//  ⚠️ IMPORTANTE: reemplaza los valores de abajo con los de TU
//  propio proyecto de Firebase. Los encuentras en:
//  Firebase Console > (tu proyecto) > ⚙️ Configuración del proyecto
//  > "Tus apps" > app web > "SDK setup and configuration".
//
//  Sigue el paso a paso de GUIA_FIREBASE.md (en la raíz del proyecto).
//
//  Mientras no reemplaces estos valores, la tienda mostrará un aviso
//  de que Firebase no está configurado.
// ============================================================

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import { getFirestore } from
  "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// El SDK de Auth (login) NO se carga aquí: solo lo importa
// firebase/firebase-auth.js, y eso solo en el checkout y el panel.
// Así la tienda y el catálogo no descargan ~50 KB de más.

const firebaseConfig = {
  apiKey: "AIzaSyBpYQLQDU4Z3hJ0PJ1pjo_wegqMiSFeyuM",
  authDomain: "atmgt-5d3a9.firebaseapp.com",
  projectId: "atmgt-5d3a9",
  storageBucket: "atmgt-5d3a9.firebasestorage.app",
  messagingSenderId: "173659756275",
  appId: "1:173659756275:web:caf5db0371ecd258fec986",
};

// Detecta si todavía están los valores de ejemplo.
export const firebaseConfigurado =
  !String(firebaseConfig.apiKey).startsWith("TU_");

const app = initializeApp(firebaseConfig);

export { app };

export const db = getFirestore(app);
