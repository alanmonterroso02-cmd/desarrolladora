// ============================================================
//  SESION.JS - Control de sesión del panel administrador
//  Asociación Tecnológica Monterroso
// ============================================================

import { auth, firebaseConfigurado } from "../../firebase/firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// ------------------------------------------------------------
//  Aviso cuando Firebase todavía no está configurado
// ------------------------------------------------------------

export function mostrarFaltaConfigurar() {

  document.body.innerHTML = `
    <div class="zona" style="max-width:640px;margin:60px auto">
      <div class="tarjeta">
        <h2 style="margin-bottom:12px">Falta configurar Firebase</h2>
        <p class="mini" style="line-height:1.9">
          El panel todavía no está conectado a tu base de datos.
          Abre el archivo <code>firebase/firebase-config.js</code> y pega
          los datos de tu proyecto de Firebase.
          El paso a paso está en <code>GUIA_FIREBASE.md</code>.
        </p>
        <p style="margin-top:20px">
          <a class="btn" href="../index.html">Volver al inicio</a>
        </p>
      </div>
    </div>`;
}

// ------------------------------------------------------------
//  Espera a saber si hay sesión iniciada
// ------------------------------------------------------------

export function esperarSesion() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (usuario) => resolve(usuario));
  });
}

// ------------------------------------------------------------
//  Protege una página: si no hay sesión, va al login.
//  Devuelve el usuario cuando sí hay sesión.
// ------------------------------------------------------------

export async function protegerPagina() {

  // Si Firebase no está configurado, avisamos y detenemos.
  if (!firebaseConfigurado) {
    mostrarFaltaConfigurar();
    return null;
  }

  const usuario = await esperarSesion();

  if (!usuario) {
    window.location.href = "login.html";
    return null;
  }

  const etiqueta = document.getElementById("usuarioActual");
  if (etiqueta) etiqueta.textContent = usuario.email || "Administrador";

  return usuario;
}

// ------------------------------------------------------------
//  Conecta el enlace "Salir" de la barra lateral
// ------------------------------------------------------------

export function conectarSalir() {

  const salir = document.querySelector("a[data-salir]");
  if (!salir) return;

  salir.addEventListener("click", async (e) => {
    e.preventDefault();
    await signOut(auth);
    window.location.href = "../index.html";
  });
}
