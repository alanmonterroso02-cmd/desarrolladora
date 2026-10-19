// ============================================================
//  AUTH-CLIENTE.JS - Inicio de sesión con Google
//  Asociación Tecnológica Monterroso
// ============================================================
//
//  Se usa en el checkout: el cliente DEBE iniciar sesión con
//  Google para confirmar el pedido. Así queda registrado quién
//  compró (correo) en la colección "clientes" y en cada venta.
// ============================================================

import { db, firebaseConfigurado } from "../firebase/firebase-config.js";
import { auth } from "../firebase/firebase-auth.js";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// ------------------------------------------------------------
//  Inicia sesión y registra/actualiza al cliente en Firestore.
//  Devuelve el usuario autenticado.
// ------------------------------------------------------------

export async function iniciarSesionCliente() {

  if (!firebaseConfigurado) {
    throw new Error("Firebase no está configurado todavía.");
  }

  let usuario = auth.currentUser;

  if (!usuario) {

    const provider = new GoogleAuthProvider();

    try {
      const resultado = await signInWithPopup(auth, provider);
      usuario = resultado.user;

    } catch (error) {

      // En celulares el popup a veces se bloquea: usamos redirect.
      if (
        error.code === "auth/popup-blocked" ||
        error.code === "auth/operation-not-supported-in-this-environment"
      ) {
        await signInWithRedirect(auth, provider);
        return null;
      }

      throw error;
    }
  }

  await registrarCliente(usuario);
  return usuario;
}

// ------------------------------------------------------------
//  Registra al cliente si es la primera vez.
// ------------------------------------------------------------

async function registrarCliente(usuario) {

  const referencia = doc(db, "clientes", usuario.uid);
  const existente = await getDoc(referencia);

  if (!existente.exists()) {

    await setDoc(referencia, {
      nombre: usuario.displayName || "",
      correo: usuario.email || "",
      foto: usuario.photoURL || "",
      fechaRegistro: serverTimestamp(),
      ultimaVisita: serverTimestamp()
    });

  } else {

    await setDoc(
      referencia,
      { ultimaVisita: serverTimestamp() },
      { merge: true }
    );
  }
}

// ------------------------------------------------------------
//  Guarda/actualiza los datos del cliente en Firestore (merge).
//  Al confirmar un pedido se usa para no perder el teléfono ni
//  la dirección que el cliente escribió.
// ------------------------------------------------------------

export async function guardarDatosCliente(usuario, datos = {}) {

  if (!usuario) return;

  const campos = {
    nombre: usuario.displayName || "",
    correo: usuario.email || "",
    foto: usuario.photoURL || "",
    ultimaVisita: serverTimestamp()
  };

  if (datos.telefono) {
    campos.telefono = String(datos.telefono).trim();
  }

  if (datos.direccion) {
    campos.direccion = String(datos.direccion).trim();
  }

  if (datos.compra) {
    campos.ultimaCompra = serverTimestamp();
  }

  await setDoc(doc(db, "clientes", usuario.uid), campos, { merge: true });
}

// ------------------------------------------------------------
//  Lee los datos ya guardados del cliente (para rellenar el
//  formulario la próxima vez).
// ------------------------------------------------------------

export async function obtenerDatosCliente(uid) {

  if (!uid) return null;

  try {
    const snap = await getDoc(doc(db, "clientes", uid));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.error("No se pudieron leer los datos del cliente:", error);
    return null;
  }
}

// ------------------------------------------------------------
//  Si venimos de un login por redirect, lo completamos al cargar.
// ------------------------------------------------------------

export async function completarLoginRedirect() {

  if (!firebaseConfigurado) return null;

  try {
    const resultado = await getRedirectResult(auth);
    if (resultado && resultado.user) {
      await registrarCliente(resultado.user);
      return resultado.user;
    }
  } catch (error) {
    console.error("Error al completar el login:", error);
  }

  return auth.currentUser || null;
}
