// ============================================================
//  VER_CARRITO.JS - Página "Mi carrito"
//  Asociación Tecnológica Monterroso
// ============================================================

import { obtenerCarrito, sumar, restar, eliminar } from "./carrito.js";
import { mapaProductos } from "./productos.js";
import { precio, escapar, aviso } from "./comun.js";
import {
  htmlPersonalizacion,
  conectarPersonalizacion,
  resumenPersonalizacion
} from "./personalizacion.js";

const contenedor = document.getElementById("itemsCarrito");
const totalEl = document.getElementById("totalCompra");

// Se guardan al dibujar para poder armar el mensaje de WhatsApp.
let mapaActual = {};

let carrito = obtenerCarrito();

// Los productos personalizables se dejan configurar aquí mismo.
conectarPersonalizacion(contenedor);

// ------------------------------------------------------------
//  Dibuja el carrito
// ------------------------------------------------------------

async function dibujar() {

  carrito = obtenerCarrito();
  contenedor.innerHTML = "";

  if (!carrito.length) {
    contenedor.innerHTML = `
      <div class="aviso-vacio">
        <p>Tu carrito está vacío.</p>
        <a href="../pages/tienda.html" class="btn">Ver productos</a>
      </div>`;
    totalEl.textContent = precio(0);
    mapaActual = {};
    actualizarBotonWhatsApp();
    return;
  }

  const ids = carrito.map((i) => i.id);
  const mapa = await mapaProductos(ids);
  mapaActual = mapa;

  let total = 0;
  let html = "";

  carrito.forEach((item) => {

    const p = mapa[item.id];
    if (!p) return;

    const subtotal = (Number(p.precio) || 0) * item.cantidad;
    total += subtotal;

    html += `
      <div class="linea-carrito">

        <div class="linea-fila">
          <img src="${escapar(p.imagen || "")}" alt="${escapar(p.nombre)}"
               loading="lazy" decoding="async" width="72" height="72">
          <div class="linea-datos">
            <strong>${escapar(p.nombre)}</strong>
            <span class="linea-precio">${precio(p.precio)} c/u</span>
            <div class="linea-cantidad">
              <button class="btn-mini" data-restar="${item.id}" aria-label="Quitar uno">−</button>
              <span>${item.cantidad}</span>
              <button class="btn-mini" data-sumar="${item.id}" aria-label="Agregar uno">+</button>
            </div>
          </div>
          <div class="linea-final">
            <strong>${precio(subtotal)}</strong>
            <button class="btn-texto" data-eliminar="${item.id}">Eliminar</button>
          </div>
        </div>

        ${p.personalizable ? htmlPersonalizacion(item) : ""}

      </div>
    `;
  });

  contenedor.innerHTML = html;
  totalEl.textContent = precio(total);

  actualizarBotonWhatsApp();
}

// ------------------------------------------------------------
//  Pedido por WhatsApp
//  Arma un mensaje con saludo, productos, cantidades,
//  subtotales y total. El nombre del cliente es opcional.
// ------------------------------------------------------------

function textoPedidoWhatsApp() {

  const nombreEl = document.getElementById("nombreWhatsApp");
  const nombre = nombreEl ? nombreEl.value.trim() : "";

  const lineas = [];

  carrito.forEach((item) => {

    const p = mapaActual[item.id];
    if (!p) return;

    const subtotal = (Number(p.precio) || 0) * item.cantidad;

    let linea = "• " + p.nombre + " x" + item.cantidad +
      " — " + precio(subtotal);

    const detalle = resumenPersonalizacion(item.personalizacion);
    if (detalle) linea += "\n   Personalizado: " + detalle;

    lineas.push(linea);
  });

  if (!lineas.length) return "";

  let total = 0;
  carrito.forEach((item) => {
    const p = mapaActual[item.id];
    if (p) total += (Number(p.precio) || 0) * item.cantidad;
  });

  return "¡Hola!" + (nombre ? " Soy " + nombre + "." : "") + "\n" +
    "Quiero hacer este pedido:\n\n" +
    lineas.join("\n") +
    "\n\nTotal: " + precio(total);
}

function actualizarBotonWhatsApp() {

  const boton = document.getElementById("btnWhatsApp");
  if (!boton) return;

  boton.disabled = !textoPedidoWhatsApp();
}

const botonWhatsApp = document.getElementById("btnWhatsApp");

if (botonWhatsApp) {

  botonWhatsApp.addEventListener("click", () => {

    const texto = textoPedidoWhatsApp();

    if (!texto) {
      aviso("Agrega productos antes de enviar el pedido", "error");
      return;
    }

    window.open(
      "https://wa.me/50248975506?text=" + encodeURIComponent(texto),
      "_blank",
      "noopener"
    );
  });
}

// Si el cliente escribe su nombre, el botón sigue disponible igual.
const nombreWhatsApp = document.getElementById("nombreWhatsApp");
if (nombreWhatsApp) nombreWhatsApp.addEventListener("input", actualizarBotonWhatsApp);

// ------------------------------------------------------------
//  Acciones
// ------------------------------------------------------------

contenedor.addEventListener("click", (e) => {

  const boton = e.target.closest("button");
  if (!boton) return;

  if (boton.dataset.sumar) sumar(boton.dataset.sumar);
  else if (boton.dataset.restar) restar(boton.dataset.restar);
  else if (boton.dataset.eliminar) eliminar(boton.dataset.eliminar);

  dibujar();
});

dibujar();
