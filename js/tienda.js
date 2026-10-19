// ============================================================
//  TIENDA.JS - Catálogo de productos
//  Asociación Tecnológica Monterroso
// ============================================================
//
//  Optimizado para conexiones lentas:
//   1. Muestra primero los productos guardados en el celular
//      (caché), así el catálogo aparece al instante.
//   2. Luego consulta Firestore en segundo plano y actualiza.
// ============================================================

import { firebaseConfigurado } from "../firebase/firebase-config.js";

import {
  leerCacheProductos,
  cargarTodosLosProductos
} from "./productos.js";

import { agregarAlCarrito } from "./carrito.js";
import { precio, escapar, aviso } from "./comun.js";

const lista = document.getElementById("listaProductos");
const estado = document.getElementById("estadoCatalogo");

// Guarda los datos de cada producto para el detalle (modal).
const datos = {};

// ------------------------------------------------------------
//  Tarjeta de un producto
// ------------------------------------------------------------

function tarjeta(id, p) {

  datos[id] = p;

  const etiquetaPersonalizable = p.personalizable
    ? `<span class="etiqueta">Personalizable</span>`
    : "";

  return `
    <div class="producto" data-id="${id}">
      <div class="producto-imagen">
        <img src="${escapar(p.imagen || "")}"
             alt="${escapar(p.nombre)}"
             loading="lazy" decoding="async"
             width="400" height="300">
        ${etiquetaPersonalizable}
      </div>
      <div class="producto-cuerpo">
        <h3>${escapar(p.nombre)}</h3>
        <p class="producto-desc">${escapar(p.descripcion || "")}</p>
        <div class="producto-pie">
          <strong class="producto-precio">${precio(p.precio)}</strong>
          <button class="btn btn-chico" data-agregar="${id}">Agregar</button>
        </div>
      </div>
    </div>
  `;
}

// ------------------------------------------------------------
//  Agrupa por categoría y dibuja el catálogo
// ------------------------------------------------------------

function dibujar(productos) {

  if (!productos.length) {
    lista.innerHTML = "";
    estado.innerHTML =
      `<p class="aviso-vacio">Todavía no hay productos publicados.</p>`;
    return;
  }

  const categorias = new Map();

  productos.forEach((p) => {
    const nombre = p.categoria || "Otros";
    if (!categorias.has(nombre)) categorias.set(nombre, []);
    categorias.get(nombre).push(p);
  });

  let html = "";

  categorias.forEach((items, nombre) => {
    const tarjetas = items.map((p) => tarjeta(p.id, p)).join("");
    html += `
      <section class="categoria">
        <h2 class="categoria-titulo">${escapar(nombre)}</h2>
        <div class="productos">${tarjetas}</div>
      </section>
    `;
  });

  lista.innerHTML = html;
  estado.innerHTML = "";
}

// ------------------------------------------------------------
//  Detalle (modal ligero)
// ------------------------------------------------------------

function abrirDetalle(id) {

  const p = datos[id];
  if (!p) return;

  const modal = document.getElementById("modal");
  const contenido = document.getElementById("modalContenido");

  contenido.innerHTML = `
    <button class="modal-cerrar" id="modalCerrar" aria-label="Cerrar">&times;</button>
    <img class="modal-imagen" src="${escapar(p.imagen || "")}"
         alt="${escapar(p.nombre)}" loading="lazy" decoding="async">
    <h3>${escapar(p.nombre)}</h3>
    <p class="modal-precio">${precio(p.precio)}</p>
    <p class="modal-desc">${escapar(p.descripcion || "")}</p>
    ${p.personalizable
      ? `<p class="modal-perso">
           <strong>Personalizable:</strong> al agregarlo al carrito vas a
           poder subir una imagen de referencia y describir cómo lo quieres.
           Si llevas varias unidades, puedes personalizar cada una por
           separado.
         </p>`
      : ""}
    <button class="btn btn-ancho" id="modalAgregar">
      Agregar al carrito
    </button>
  `;

  modal.classList.add("abierto");

  document.getElementById("modalCerrar").onclick = cerrarDetalle;

  const boton = document.getElementById("modalAgregar");
  if (boton) {
    boton.onclick = () => {
      agregarAlCarrito(id, p.nombre);
      cerrarDetalle();
    };
  }
}

function cerrarDetalle() {
  document.getElementById("modal").classList.remove("abierto");
}

// ------------------------------------------------------------
//  Clic en tarjetas y botones (delegación de eventos)
// ------------------------------------------------------------

lista.addEventListener("click", (e) => {

  const boton = e.target.closest("[data-agregar]");
  if (boton) {
    e.stopPropagation();
    const p = datos[boton.dataset.agregar];
    agregarAlCarrito(boton.dataset.agregar, p ? p.nombre : "Producto");
    return;
  }

  const tarjetaEl = e.target.closest(".producto");
  if (tarjetaEl) abrirDetalle(tarjetaEl.dataset.id);
});

document.getElementById("modal").addEventListener("click", (e) => {
  if (e.target.id === "modal") cerrarDetalle();
});

// ------------------------------------------------------------
//  Carga desde Firestore
// ------------------------------------------------------------

async function cargarDesdeFirestore() {
  const productos = await cargarTodosLosProductos();
  dibujar(productos);
}

// ------------------------------------------------------------
//  Inicio
// ------------------------------------------------------------

async function iniciar() {

  // 1. Primero lo que ya tengamos guardado (instantáneo)
  const cache = leerCacheProductos();
  if (cache && cache.length) {
    dibujar(cache);
  } else {
    estado.innerHTML = `<p class="cargando">Cargando productos…</p>`;
  }

  // 2. Si Firebase no está configurado, avisamos.
  if (!firebaseConfigurado) {
    if (!cache || !cache.length) {
      estado.innerHTML = `
        <div class="aviso-vacio">
          <strong>Falta configurar Firebase.</strong><br>
          Abre <code>firebase/firebase-config.js</code> y pega los datos
          de tu proyecto. Revisa <code>GUIA_FIREBASE.md</code>.
        </div>`;
    }
    return;
  }

  // 3. Actualizamos desde Firestore en segundo plano.
  try {
    await cargarDesdeFirestore();
  } catch (error) {
    console.error("Error cargando productos:", error);
    if (!cache || !cache.length) {
      estado.innerHTML = `
        <div class="aviso-vacio">
          No se pudieron cargar los productos.<br>
          Revisa tu conexión a internet.
        </div>`;
    } else {
      aviso("No se pudo actualizar el catálogo. Mostrando lo guardado.", "info");
    }
  }
}

iniciar();
