// ============================================================
//  CHECKOUT.JS - Finalizar pedido
//  Asociación Tecnológica Monterroso
// ============================================================

import { db, firebaseConfigurado } from "../firebase/firebase-config.js";

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { obtenerCarrito, vaciar } from "./carrito.js";
import { mapaProductos } from "./productos.js";
import { avisarAdmin } from "./notificar-whatsapp.js";
import { precio, aviso } from "./comun.js";
import { iniciarSesionCliente, completarLoginRedirect } from "./auth-cliente.js";

const formulario = document.getElementById("formCompra");
const totalEl = document.getElementById("totalCompra");
const botonGoogle = document.getElementById("btnGoogle");
const botonConfirmar = document.getElementById("btnConfirmar");

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
//  Login opcional con Google (autocompleta los datos)
// ------------------------------------------------------------

async function autocompletarConUsuario(usuario) {
  if (!usuario) return;
  const nombre = document.getElementById("nombre");
  if (usuario.displayName && !nombre.value) {
    nombre.value = usuario.displayName;
  }
}

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
      aviso("No se pudo iniciar sesión", "error");
    } finally {
      botonGoogle.disabled = false;
      botonGoogle.textContent = "Continuar con Google (opcional)";
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

  if (!productosCompra.length) {
    aviso("Tu carrito está vacío", "error");
    return;
  }

  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const direccion = document.getElementById("direccion").value.trim();
  const notas = document.getElementById("notas").value.trim();

  botonConfirmar.disabled = true;
  botonConfirmar.textContent = "Enviando pedido…";

  try {

    // 1. Guardar el pedido
    await addDoc(collection(db, "ventas"), {
      cliente: nombre,
      telefono: telefono,
      direccion: direccion,
      notas: notas,
      productos: productosCompra,
      total: total,
      fecha: serverTimestamp(),
      estado: "Pendiente"
    });

    // 2. Descontar inventario (sin bloquear si algo falla)
    for (const item of productosCompra) {
      try {
        const nuevo = item.stock - item.cantidad;
        await updateDoc(doc(db, "productos", item.id), {
          stock: nuevo < 0 ? 0 : nuevo
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

    botonConfirmar.disabled = false;
    botonConfirmar.textContent = "Confirmar pedido";
  }
});

// ------------------------------------------------------------
//  Inicio
// ------------------------------------------------------------

calcularTotal();
