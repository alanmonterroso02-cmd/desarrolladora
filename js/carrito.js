// ============================================================
//  CARRITO.JS - Lógica del carrito
//  Asociación Tecnológica Monterroso
// ============================================================
//
//  El carrito se guarda en el propio celular (localStorage), así
//  que funciona aunque el cliente no tenga internet. No se exige
//  iniciar sesión para agregar productos.
// ============================================================

import { aviso, actualizarContadorCarrito } from "./comun.js";

const CLAVE = "carrito";

export function obtenerCarrito() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) || [];
  } catch (e) {
    return [];
  }
}

function guardar(carrito) {
  localStorage.setItem(CLAVE, JSON.stringify(carrito));
  actualizarContadorCarrito();
}

// ------------------------------------------------------------
//  Agregar un producto (por id)
// ------------------------------------------------------------

export function agregarAlCarrito(id, nombre = "Producto") {

  const carrito = obtenerCarrito();
  const existente = carrito.find((p) => p.id === id);

  if (existente) {
    existente.cantidad++;
  } else {
    carrito.push({ id: id, cantidad: 1 });
  }

  guardar(carrito);
  aviso(nombre + " agregado al carrito");
}

// ------------------------------------------------------------
//  Sumar / restar / eliminar
// ------------------------------------------------------------

export function sumar(id) {
  const carrito = obtenerCarrito();
  const producto = carrito.find((p) => p.id === id);
  if (!producto) return;
  producto.cantidad++;
  guardar(carrito);
}

export function restar(id) {
  let carrito = obtenerCarrito();
  const producto = carrito.find((p) => p.id === id);
  if (!producto) return;

  if (producto.cantidad > 1) {
    producto.cantidad--;
  } else {
    carrito = carrito.filter((p) => p.id !== id);
  }

  guardar(carrito);
}

export function eliminar(id) {
  const carrito = obtenerCarrito().filter((p) => p.id !== id);
  guardar(carrito);
}

export function vaciar() {
  localStorage.removeItem(CLAVE);
  actualizarContadorCarrito();
}

export function cantidadTotal() {
  return obtenerCarrito().reduce((suma, p) => suma + (p.cantidad || 0), 0);
}
