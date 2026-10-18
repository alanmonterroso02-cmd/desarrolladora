// ============================================================
//  CHECKOUT.JS - Finalizar pedido
//  Asociación Tecnológica Monterroso
// ============================================================

import { auth, db, firebaseConfigurado } from "../firebase/firebase-config.js";

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { obtenerCarrito, vaciar } from "./carrito.js";
import { mapaProductos, mapaProductosFrescos } from "./productos.js";
import { avisarAdmin } from "./notificar-whatsapp.js";
import { precio, aviso, escapar } from "./comun.js";
import { iniciarSesionCliente, completarLoginRedirect } from "./auth-cliente.js";

const formulario = document.getElementById("formCompra");
const totalEl = document.getElementById("totalCompra");
const botonGoogle = document.getElementById("btnGoogle");
const botonConfirmar = document.getElementById("btnConfirmar");
const sesionEl = document.getElementById("sesionCliente");

let productosCompra = [];
let total = 0;

// ------------------------------------------------------------
//  Calcula el total con los datos reales de Firestore
// ------------------------------------------------------------

async function calcularTotal() {

  const carrito = obtenerCarrito();

  if (!carrito.length) {
    document.getElementById("zonaCheckout").innerHTML = `
      <div class="aviso-vacio">
        <p>No hay productos en el carrito.</p>
        <a href="../pages/tienda.html" class="btn">Ver productos</a>
      </div>`;
    return;
  }

  const mapa = await mapaProductos(carrito.map((i) => i.id));

  total = 0;
  productosCompra = [];

  carrito.forEach((item) => {
    const p = mapa[item.id];
    if (!p) return;

    const subtotal = (Number(p.precio) || 0) * item.cantidad;
    total += subtotal;

    productosCompra.push({
      id: item.id,
      nombre: p.nombre,
      cantidad: item.cantidad,
      precio: Number(p.precio) || 0,
      stock: Number(p.stock) || 0,
      subtotal: subtotal
    });
  });

  totalEl.textContent = precio(total);
}

// ------------------------------------------------------------
//  Vuelve a calcular el pedido con datos FRESCOS de Firestore.
//  Se llama justo antes de crear la venta.
// ------------------------------------------------------------

async function refrescarCompra() {

  const carrito = obtenerCarrito();
  const mapa = await mapaProductosFrescos(carrito.map((i) => i.id));

  total = 0;
  productosCompra = [];

  carrito.forEach((item) => {
    const p = mapa[item.id];
    if (!p) return;

    const subtotal = (Number(p.precio) || 0) * item.cantidad;
    total += subtotal;

    productosCompra.push({
      id: item.id,
      nombre: p.nombre,
      cantidad: item.cantidad,
      precio: Number(p.precio) || 0,
      stock: Number(p.stock) || 0,
      subtotal: subtotal
    });
  });

  totalEl.textContent = precio(total);
}

// ------------------------------------------------------------
//  Login opcional con Google (autocompleta los datos)
// ------------------------------------------------------------

async function autocompletarConUsuario(usuario) {
  if (!usuario) return;
  const nombre = document.getElementById("nombre");
  if (usuario.displayName && !nombre.value) {
    nombre.value = usuario.displayName;
  }
}

// ------------------------------------------------------------
//  Sesión obligatoria con Google
//  El pedido no se puede confirmar sin iniciar sesión: así queda
//  registrado quién compró (correo) y se evitan pedidos falsos.
// ------------------------------------------------------------

function restaurarBoton() {

  if (!botonConfirmar) return;

  delete botonConfirmar.dataset.enviando;
  botonConfirmar.textContent = "Confirmar pedido";
  actualizarBotonConfirmar();
}

function actualizarBotonConfirmar() {

  if (!botonConfirmar) return;

  // Mientras se envía el pedido no tocamos el botón.
  if (botonConfirmar.dataset.enviando === "1") return;

  const haySesion = !!auth.currentUser;

  botonConfirmar.disabled = !haySesion;
  botonConfirmar.title = haySesion
    ? ""
    : "Inicia sesión con Google para confirmar el pedido";
}

function pintarSesion(usuario) {

  if (sesionEl) {

    if (usuario) {

      const nombre = usuario.displayName || usuario.email || "cliente";

      sesionEl.innerHTML = `
        <div class="sesion-caja sesion-ok">
          <span>
            Sesión iniciada como
            <strong>${escapar(nombre)}</strong>
          </span>
          <button type="button" id="btnCambiarCuenta" class="btn-enlace">
            Cambiar cuenta
          </button>
        </div>`;

      const cambiar = document.getElementById("btnCambiarCuenta");

      if (cambiar) {
        cambiar.addEventListener("click", async () => {
          await signOut(auth);
          aviso("Sesión cerrada");
        });
      }

    } else {

      sesionEl.innerHTML = `
        <div class="sesion-caja sesion-pendiente">
          Para confirmar el pedido necesitas
          <strong>iniciar sesión con Google</strong>.
        </div>`;
    }
  }

  if (botonGoogle) {
    botonGoogle.style.display = usuario ? "none" : "";
  }

  actualizarBotonConfirmar();
}

// Se actualiza sola al entrar o salir de la cuenta.
onAuthStateChanged(auth, (usuario) => {
  pintarSesion(usuario);
  if (usuario) autocompletarConUsuario(usuario);
});

// Estado inicial (puede ser null mientras se restaura la sesión).
pintarSesion(auth.currentUser);

if (botonGoogle) {
  botonGoogle.addEventListener("click", async () => {

    if (!firebaseConfigurado) {
      aviso("Firebase no está configurado todavía.", "error");
      return;
    }

    botonGoogle.disabled = true;
    botonGoogle.textContent = "Conectando…";

    try {
      const usuario = await iniciarSesionCliente();
      if (usuario) {
        await autocompletarConUsuario(usuario);
        aviso("Sesión iniciada con Google");
      }
    } catch (error) {

      console.error(error);

      if (error.code === "auth/unauthorized-domain") {
        aviso(
          "El login con Google no está autorizado en este dominio. " +
          "Avisa al administrador.",
          "error"
        );
      } else if (error.code === "auth/popup-closed-by-user") {
        aviso("Cerraste la ventana de Google", "info");
      } else if (error.code === "auth/network-request-failed") {
        aviso("Sin conexión: revisa tu internet", "error");
      } else {
        aviso("No se pudo iniciar sesión", "error");
      }

    } finally {
      botonGoogle.disabled = false;
      botonGoogle.textContent = "Iniciar sesión con Google";
    }
  });
}

// Si venimos de un login por redirect, lo completamos.
completarLoginRedirect().then(autocompletarConUsuario);

// ------------------------------------------------------------
//  Confirmar pedido
// ------------------------------------------------------------

formulario.addEventListener("submit", async (e) => {

  e.preventDefault();

  if (!firebaseConfigurado) {
    aviso("Firebase no está configurado. Revisa GUIA_FIREBASE.md", "error");
    return;
  }

  // El pedido exige sesión: se guarda quién compró.
  const usuario = auth.currentUser;

  if (!usuario) {
    aviso("Inicia sesión con Google para confirmar el pedido", "error");
    return;
  }

  if (!productosCompra.length) {
    aviso("Tu carrito está vacío", "error");
    return;
  }

  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const direccion = document.getElementById("direccion").value.trim();
  const notas = document.getElementById("notas").value.trim();

  botonConfirmar.dataset.enviando = "1";
  botonConfirmar.disabled = true;
  botonConfirmar.textContent = "Enviando pedido…";

  try {

    // 0. Recalcular con precios y stock REALES de Firestore
    //    (la caché local puede estar desactualizada).
    await refrescarCompra();

    if (!productosCompra.length) {
      aviso("Los productos de tu carrito ya no están disponibles", "error");
      restaurarBoton();
      return;
    }

    const sinStock = productosCompra.filter(
      (p) => Number(p.stock) < Number(p.cantidad)
    );

    if (sinStock.length) {
      aviso(
        "No hay suficiente inventario de: " +
          sinStock.map((p) => p.nombre).join(", "),
        "error"
      );
      restaurarBoton();
      return;
    }

    // 1. Guardar el pedido (con la cuenta de Google que lo hizo)
    await addDoc(collection(db, "ventas"), {
      cliente: nombre,
      telefono: telefono,
      direccion: direccion,
      notas: notas,
      correo: usuario.email || "",
      uid: usuario.uid,
      productos: productosCompra,
      total: total,
      fecha: serverTimestamp(),
      estado: "Pendiente"
    });

    // 2. Descontar inventario de forma atómica.
    //    ⚠️ Si cierras las reglas de Firestore (recomendado, ver
    //    GUIA_FIREBASE.md), borra este bloque: el stock se ajusta
    //    desde el panel de administración.
    for (const item of productosCompra) {
      try {
        await updateDoc(doc(db, "productos", item.id), {
          stock: increment(-item.cantidad)
        });
      } catch (err) {
        console.error("No se pudo actualizar el stock de " + item.id, err);
      }
    }

    // 3. Avisar por WhatsApp (no bloquea la compra)
    const lista = productosCompra
      .map((p) => p.nombre + " x" + p.cantidad)
      .join(", ");

    avisarAdmin(
      "🛒 Nuevo pedido\n" +
      `Cliente: ${nombre}\n` +
      `Cuenta Google: ${usuario.email || "-"}\n` +
      `Tel: ${telefono}\n` +
      `Dirección: ${direccion}\n` +
      `Productos: ${lista}\n` +
      `Notas: ${notas || "Ninguna"}\n` +
      `Total: ${precio(total)}`
    );

    // 4. Limpiar carrito y avisar al cliente
    vaciar();
    aviso("¡Pedido enviado! Te contactaremos pronto.");

    document.getElementById("zonaCheckout").innerHTML = `
      <div class="aviso-vacio">
        <h2>¡Gracias por tu pedido!</h2>
        <p>Recibimos tu solicitud. Nos pondremos en contacto contigo
        por WhatsApp para confirmar.</p>
        <a href="../pages/tienda.html" class="btn">Seguir comprando</a>
      </div>`;

  } catch (error) {

    console.error("Error creando el pedido:", error);
    aviso("No se pudo enviar el pedido. Intenta de nuevo.", "error");

    restaurarBoton();
  }
});

// ------------------------------------------------------------
//  Inicio
// ------------------------------------------------------------

calcularTotal();
