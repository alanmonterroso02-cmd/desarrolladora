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
  try {
    localStorage.setItem(CLAVE, JSON.stringify(carrito));
  } catch (error) {
    // Sin espacio. Puede pasar con las imágenes de referencia de los
    // productos personalizables: se avisa y no se pierde lo anterior.
    console.error("No se pudo guardar el carrito:", error);
    return false;
  }

  actualizarContadorCarrito();
  return true;
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

// ------------------------------------------------------------
//  Personalización de un producto (imagen + descripción)
//
//  Solo la usan los productos marcados como personalizables. Si el
//  cliente deja todo vacío se borra la personalización, para no
//  guardar datos de más.
// ------------------------------------------------------------

export function guardarPersonalizacion(id, personalizacion) {

  const carrito = obtenerCarrito();
  const item = carrito.find((p) => p.id === id);
  if (!item) return false;

  const descripcion = String(
    (personalizacion && personalizacion.descripcion) || ""
  ).trim().slice(0, 600);

  const imagen = (personalizacion && personalizacion.imagen) || "";

  if (!descripcion && !imagen) {
    delete item.personalizacion;
  } else {
    item.personalizacion = { descripcion: descripcion, imagen: imagen };
  }

  return guardar(carrito);
}
