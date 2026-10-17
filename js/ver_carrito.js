// ============================================================
//  VER_CARRITO.JS - Página "Mi carrito"
//  Asociación Tecnológica Monterroso
// ============================================================

import { obtenerCarrito, sumar, restar, eliminar } from "./carrito.js";
import { mapaProductos } from "./productos.js";
import { precio, escapar } from "./comun.js";

const contenedor = document.getElementById("itemsCarrito");
const totalEl = document.getElementById("totalCompra");

let carrito = obtenerCarrito();

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
    return;
  }

  const ids = carrito.map((i) => i.id);
  const mapa = await mapaProductos(ids);

  let total = 0;
  let html = "";

  carrito.forEach((item) => {

    const p = mapa[item.id];
    if (!p) return;

    const subtotal = (Number(p.precio) || 0) * item.cantidad;
    total += subtotal;

    html += `
      <div class="linea-carrito">
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
    `;
  });

  contenedor.innerHTML = html;
  totalEl.textContent = precio(total);
}

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
