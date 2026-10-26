// ============================================================
//  SESION.JS - Control de sesión del panel administrador
//  Asociación Tecnológica Monterroso
// ============================================================
//
//  Todas las páginas del panel nacen "bloqueadas": el HTML trae
//  <body class="protegido"> y solo se muestra cuando este archivo
//  confirma que hay una sesión válida.
//  Así nadie alcanza a ver el panel ni un instante sin entrar.
// ============================================================

import { firebaseConfigurado } from "../../firebase/firebase-config.js";
import { auth } from "../../firebase/firebase-auth.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// ------------------------------------------------------------
//  Correos con permiso para entrar al panel
//  Agrega uno por línea si necesitas más administradores.
//  OJO: si dejas la lista vacía, entra cualquier cuenta que
//  exista en Firebase Authentication.
// ------------------------------------------------------------

const CORREOS_ADMIN = [
  "asociacionmonterrosogt@gmail.com",
  // Se deja el correo anterior para no perder el acceso al panel.
  "alanmonterroso02@gmail.com"
];

// Cuánto esperamos la respuesta de Firebase antes de rendirnos.
const ESPERA_MAXIMA = 12000;

// ------------------------------------------------------------
//  Quitar el bloqueo de la página
// ------------------------------------------------------------

function desbloquearPagina() {

  document.body.classList.remove("protegido");

  const capa = document.getElementById("verificandoSesion");
  if (capa) capa.remove();
}

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
//  Pantallas de bloqueo (cuenta no autorizada o sin conexión)
// ------------------------------------------------------------

function mostrarAviso(titulo, texto, botonTexto, accion) {

  desbloquearPagina();

  document.body.innerHTML = `
    <div class="zona" style="max-width:560px;margin:60px auto">
      <div class="tarjeta">
        <h2 style="margin-bottom:12px">${titulo}</h2>
        <p class="mini" style="line-height:1.9">${texto}</p>
        <p style="margin-top:20px">
          <button type="button" class="btn" id="btnAvisoSesion">
            ${botonTexto}
          </button>
        </p>
      </div>
    </div>`;

  document.getElementById("btnAvisoSesion").addEventListener("click", accion);
}

function mostrarSinPermiso(correo) {

  mostrarAviso(
    "Esta cuenta no tiene acceso",
    `La cuenta <strong>${correo}</strong> no está autorizada para usar el
     panel. Pide acceso al administrador o entra con otra cuenta.`,
    "Entrar con otra cuenta",
    async () => {
      await signOut(auth);
      irAlLogin();
    }
  );
}

function mostrarSinConexion() {

  mostrarAviso(
    "No pudimos verificar tu sesión",
    "Revisa tu conexión a internet y vuelve a intentarlo. Por seguridad, " +
    "el panel permanece bloqueado hasta confirmar quién eres.",
    "Ir al login",
    irAlLogin
  );
}

// ------------------------------------------------------------
//  Ir al login y volver a la página pedida después de entrar
// ------------------------------------------------------------

function irAlLogin() {

  const actual = window.location.pathname.split("/").pop() || "dashboard.html";
  const destino = actual === "login.html" ? "dashboard.html" : actual;

  window.location.replace("login.html?volver=" + encodeURIComponent(destino));
}

// ------------------------------------------------------------
//  Espera a saber si hay sesión iniciada (con tiempo límite)
//  Devuelve el usuario, null, o el texto "sin-respuesta".
// ------------------------------------------------------------

function esperarSesion() {

  return new Promise((resolve) => {

    let terminado = false;

    const cerrar = (resultado) => {
      if (terminado) return;
      terminado = true;
      clearTimeout(temporizador);
      resolve(resultado);
    };

    const temporizador = setTimeout(() => cerrar("sin-respuesta"), ESPERA_MAXIMA);

    onAuthStateChanged(auth, (usuario) => cerrar(usuario || null));
  });
}

// ------------------------------------------------------------
//  Protege una página: si no hay sesión, va al login.
//  Devuelve el usuario cuando sí hay sesión.
// ------------------------------------------------------------

export async function protegerPagina() {

  // Si Firebase no está configurado, avisamos y detenemos.
  if (!firebaseConfigurado) {
    desbloquearPagina();
    mostrarFaltaConfigurar();
    return null;
  }

  const usuario = await esperarSesion();

  if (usuario === "sin-respuesta") {
    mostrarSinConexion();
    return null;
  }

  if (!usuario) {
    irAlLogin();
    return null;
  }

  // Solo las cuentas de la lista pueden usar el panel.
  const correo = (usuario.email || "").toLowerCase();

  if (CORREOS_ADMIN.length && !CORREOS_ADMIN.includes(correo)) {
    await signOut(auth);
    mostrarSinPermiso(correo || "sin correo");
    return null;
  }

  const etiqueta = document.getElementById("usuarioActual");
  if (etiqueta) etiqueta.textContent = usuario.email || "Administrador";

  desbloquearPagina();

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
