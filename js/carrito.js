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

  if (!guardar(carrito)) {
    aviso("No se pudo guardar en el carrito. Libera espacio e intenta de nuevo.", "error");
    return;
  }

  aviso(nombre + " agregado al carrito");
}

// ------------------------------------------------------------
//  La personalización sigue a la cantidad: cada unidad tiene su
//  pieza (imagen + descripción). Se agrega una pieza vacía al sumar
//  y se quita la última al restar.
// ------------------------------------------------------------

function ajustarPiezas(item) {

  if (!item.personalizacion || !Array.isArray(item.personalizacion.piezas)) return;

  const cantidad = Math.max(1, Number(item.cantidad) || 1);
  const piezas = item.personalizacion.piezas.slice(0, cantidad);

  while (piezas.length < cantidad) {
    piezas.push({ descripcion: "", imagen: "" });
  }

  const hayAlgo = piezas.some((p) => (p.descripcion || "").trim() || p.imagen);

  if (!hayAlgo) {
    delete item.personalizacion;
    return;
  }

  item.personalizacion.piezas = piezas;
}

// ------------------------------------------------------------
//  Sumar / restar / eliminar
// ------------------------------------------------------------

export function sumar(id) {
  const carrito = obtenerCarrito();
  const producto = carrito.find((p) => p.id === id);
  if (!producto) return;
  producto.cantidad++;
  ajustarPiezas(producto);

  if (!guardar(carrito)) {
    aviso("No se pudo guardar en el carrito. Libera espacio e intenta de nuevo.", "error");
  }
}

export function restar(id) {
  let carrito = obtenerCarrito();
  const producto = carrito.find((p) => p.id === id);
  if (!producto) return;

  if (producto.cantidad > 1) {
    producto.cantidad--;
    ajustarPiezas(producto);
  } else {
    carrito = carrito.filter((p) => p.id !== id);
  }

  if (!guardar(carrito)) {
    aviso("No se pudo guardar en el carrito. Libera espacio e intenta de nuevo.", "error");
  }
}

export function eliminar(id) {
  const carrito = obtenerCarrito().filter((p) => p.id !== id);

  if (!guardar(carrito)) {
    aviso("No se pudo guardar en el carrito. Libera espacio e intenta de nuevo.", "error");
  }
}

export function vaciar() {
  try {
    localStorage.removeItem(CLAVE);
  } catch (e) {
    // Sin acceso a localStorage: igual refrescamos el contador.
  }

  actualizarContadorCarrito();
}

export function cantidadTotal() {
  return obtenerCarrito().reduce((suma, p) => suma + (p.cantidad || 0), 0);
}

// ------------------------------------------------------------
//  Personalización de un producto (imágenes y descripciones)
//
//  Cada unidad puede llevar lo suyo: si el cliente pide 2 llaveros,
//  puede subir dos imágenes distintas. Se guarda una pieza por
//  unidad, en productos[i].personalizacion.piezas.
//
//  Solo la usan los productos marcados como personalizables. Si el
//  cliente deja todo vacío se borra la personalización, para no
//  guardar datos de más.
// ------------------------------------------------------------

const LARGO_DESCRIPCION = 600;

function limpiarPieza(pieza) {
  return {
    descripcion: String((pieza && pieza.descripcion) || "")
      .trim()
      .slice(0, LARGO_DESCRIPCION),
    imagen: (pieza && pieza.imagen) || ""
  };
}

export function guardarPersonalizacion(id, piezas) {

  const carrito = obtenerCarrito();
  const item = carrito.find((p) => p.id === id);
  if (!item) return false;

  const lista = (Array.isArray(piezas) ? piezas : []).map(limpiarPieza);
  const hayAlgo = lista.some((p) => p.descripcion || p.imagen);

  if (!hayAlgo) {
    delete item.personalizacion;
  } else {
    item.personalizacion = { piezas: lista };
  }

  return guardar(carrito);
}
