// ------------------------------------------------------------
//  PRODUCTOS.JS - Acceso a productos (caché + Firestore)
//  Asociación Tecnológica Monterroso
// ============================================================
//
//  Centraliza la lectura de productos para que el catálogo, el
//  carrito y el checkout compartan la misma caché local.
//
//  OJO: este módulo lo usa la TIENDA (el cliente). Por eso, antes
//  de guardar un producto en el navegador se le quita el precio de
//  costo: es información solo del panel y no tiene por qué quedar
//  en el celular de un cliente.
// ============================================================

import { db } from "../firebase/firebase-config.js";

import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const CLAVE_CACHE = "productos_cache";

// ------------------------------------------------------------
//  Quita el precio de costo antes de devolver un producto
// ------------------------------------------------------------

function sinCosto(p) {

  if (p && p.precioCosto != null) delete p.precioCosto;

  return p;
}

// ------------------------------------------------------------
//  Caché local (localStorage)
// ------------------------------------------------------------

export function leerCacheProductos() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_CACHE));
    return guardado && Array.isArray(guardado.d) ? guardado.d : null;
  } catch (e) {
    return null;
  }
}

export function escribirCacheProductos(productos) {
  try {
    localStorage.setItem(
      CLAVE_CACHE,
      JSON.stringify({ t: Date.now(), d: productos })
    );
  } catch (e) {
    /* sin espacio: seguimos sin caché */
  }
}

// ------------------------------------------------------------
//  Trae todos los productos desde Firestore y actualiza la caché
// ------------------------------------------------------------

export async function cargarTodosLosProductos() {

  const snap = await getDocs(collection(db, "productos"));
  const productos = [];

  snap.forEach((documento) => {
    const p = documento.data();
    p.id = documento.id;
    productos.push(sinCosto(p));
  });

  escribirCacheProductos(productos);
  return productos;
}

// ------------------------------------------------------------
//  Devuelve un objeto { id: producto } para una lista de ids.
//  Primero usa la caché; solo va a Firestore por lo que falte.
// ------------------------------------------------------------

export async function mapaProductos(ids) {

  const mapa = {};
  const cache = leerCacheProductos() || [];

  cache.forEach((p) => {
    if (ids.includes(p.id)) mapa[p.id] = p;
  });

  const faltantes = ids.filter((id) => !mapa[id]);

  for (const id of faltantes) {
    try {
      const snap = await getDoc(doc(db, "productos", id));
      if (snap.exists()) {
        const p = snap.data();
        p.id = id;
        mapa[id] = sinCosto(p);
      }
    } catch (e) {
      console.error("No se pudo leer el producto " + id, e);
    }
  }

  return mapa;
}

// ------------------------------------------------------------
//  Igual que mapaProductos, pero SIEMPRE leyendo Firestore.
//  Se usa al confirmar el pedido: la caché local puede tener
//  precios o stock viejos y no queremos guardar una venta con
//  datos desactualizados.
// ------------------------------------------------------------

export async function mapaProductosFrescos(ids) {

  const mapa = {};

  const unicos = [...new Set(ids)];

  for (const id of unicos) {
    try {
      const snap = await getDoc(doc(db, "productos", id));
      if (snap.exists()) {
        const p = snap.data();
        p.id = id;
        mapa[id] = sinCosto(p);
      }
    } catch (e) {
      console.error("No se pudo leer el producto " + id, e);
    }
  }

  return mapa;
}
