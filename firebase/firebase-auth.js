// ============================================================
//  FIREBASE - AUTENTICACIÓN (LOGIN)
//  Asociación Tecnológica Monterroso
// ============================================================
//
//  Este archivo carga el SDK de Auth (~50 KB) y se importa
//  SOLO donde de verdad se inicia sesión:
//    - js/checkout.js      (el cliente inicia sesión con Google)
//    - js/auth-cliente.js  (registro / datos del cliente)
//    - admin/js/sesion.js  (protección del panel)
//    - admin/login.html    (login del administrador)
//
//  Las demás páginas (inicio, catálogo, carrito, servicios) usan
//  firebase-config.js y NO descargan este SDK.
// ============================================================

import { app } from "./firebase-config.js";

import { getAuth } from
  "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

export const auth = getAuth(app);
