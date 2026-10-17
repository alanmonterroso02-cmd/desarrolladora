// ============================================================
//  PRODUCTOS.JS - Acceso a productos (caché + Firestore)
//  Asociación Tecnológica Monterroso
// ============================================================
//
//  Centraliza la lectura de productos para que el catálogo, el
//  carrito y el checkout compartan la misma caché local.
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
    productos.push(p);
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
        mapa[id] = p;
      }
    } catch (e) {
      console.error("No se pudo leer el producto " + id, e);
    }
  }

  return mapa;
}
