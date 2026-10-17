// ============================================================
//  DASHBOARD.JS - Datos reales desde Firestore
//  Asociación Tecnológica Monterroso
// ============================================================

import { db } from "../../firebase/firebase-config.js";

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { protegerPagina, conectarSalir } from "./sesion.js";
import { aviso } from "../../js/comun.js";

// ------------------------------------------------------------
//  Consultas
// ------------------------------------------------------------

async function contarPedidosPendientes() {
  const q = query(collection(db, "ventas"), where("estado", "==", "Pendiente"));
  const snap = await getDocs(q);
  return snap.size;
}

async function ventasDeHoy() {

  // Traemos todas y filtramos por fecha local (más simple y seguro
  // que depender del formato exacto guardado).
  const snap = await getDocs(collection(db, "ventas"));
  const hoy = new Date();

  let total = 0;

  snap.forEach((documento) => {
    const v = documento.data();
    const fecha = v.fecha && v.fecha.toDate ? v.fecha.toDate() : null;
    if (!fecha) return;

    const esHoy =
      fecha.getFullYear() === hoy.getFullYear() &&
      fecha.getMonth() === hoy.getMonth() &&
      fecha.getDate() === hoy.getDate();

    if (esHoy) total += Number(v.total) || 0;
  });

  return total;
}

async function contarColeccion(nombre) {
  const snap = await getDocs(collection(db, nombre));
  return snap.size;
}

async function productosBajoInventario() {

  const q = query(
    collection(db, "productos"),
    where("stock", "<=", 5),
    orderBy("stock", "asc"),
    limit(10)
  );

  const snap = await getDocs(q);
  const lista = [];

  snap.forEach((documento) => {
    const p = documento.data();
    lista.push({
      nombre: p.nombre || "Sin nombre",
      cantidad: Number(p.stock) || 0
    });
  });

  return lista;
}

// ------------------------------------------------------------
//  Dibujo
// ------------------------------------------------------------

function pintarInventario(lista) {

  const tbody = document.getElementById("tablaInventario");

  if (!lista.length) {
    tbody.innerHTML =
      `<tr><td colspan="3" class="mini">No hay productos con poco inventario</td></tr>`;
    return;
  }

  tbody.innerHTML = lista
    .map((p) => {
      const agotado = p.cantidad === 0;
      return `
        <tr>
          <td>${p.nombre}</td>
          <td>${p.cantidad}</td>
          <td>
            <span class="insignia ${agotado ? "insignia-roja" : "insignia-amarilla"}">
              ${agotado ? "Agotado" : "Bajo"}
            </span>
          </td>
        </tr>`;
    })
    .join("");
}

// ------------------------------------------------------------
//  Inicio
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {

  const usuario = await protegerPagina();
  if (!usuario) return;

  conectarSalir();

  try {

    const [pendientes, ventas, productos, clientes, bajo] =
      await Promise.all([
        contarPedidosPendientes(),
        ventasDeHoy(),
        contarColeccion("productos"),
        contarColeccion("clientes"),
        productosBajoInventario()
      ]);

    document.getElementById("pedidosPendientes").textContent = pendientes;
    document.getElementById("ventasHoy").textContent = "Q" + ventas;
    document.getElementById("totalProductos").textContent = productos;
    document.getElementById("totalClientes").textContent = clientes;

    pintarInventario(bajo);

  } catch (error) {

    console.error("Error cargando el dashboard:", error);
    aviso("No se pudieron cargar los datos. Revisa Firestore.", "error");

    document.getElementById("tablaInventario").innerHTML =
      `<tr><td colspan="3" class="mini">Error al cargar</td></tr>`;
  }

});
