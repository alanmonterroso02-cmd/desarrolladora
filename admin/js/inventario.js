// ============================================================
//  INVENTARIO.JS - Control de inventario
//  Asociación Tecnológica Monterroso
// ============================================================

import { db } from "../../firebase/firebase-config.js";

import {
  collection,
  getDocs,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { protegerPagina, conectarSalir } from "./sesion.js";
import { aviso, escapar, precio } from "../../js/comun.js";

let productos = [];

document.addEventListener("DOMContentLoaded", async () => {

  const usuario = await protegerPagina();
  if (!usuario) return;

  conectarSalir();

  const tabla = document.getElementById("tablaInventario");
  const buscador = document.getElementById("buscarInventario");

  // ---------- Cargar ----------

  async function cargar() {

    const datos = await getDocs(collection(db, "productos"));
    productos = [];

    datos.forEach((documento) => {
      const p = documento.data();
      p.id = documento.id;
      productos.push(p);
    });

    aplicarFiltro();
  }

  // ---------- Cuánto queda por unidad ----------
  //  Es el precio de venta menos el precio de costo. Si al producto
  //  todavía no le pusiste costo, no se puede calcular.

  function textoGanancia(cliente, costo) {

    const ganancia = cliente - costo;
    const negativo = ganancia < 0;

    return `<span class="ganancia${negativo ? " ganancia-mala" : ""}">` +
      (negativo ? "−" : "") + precio(Math.abs(ganancia)) + `</span>`;
  }

  // ---------- Fila ----------

  function fila(p) {

    const stock = Number(p.stock) || 0;

    let estado, clase;
    if (stock <= 0) { estado = "Agotado"; clase = "insignia-roja"; }
    else if (stock <= 5) { estado = "Bajo"; clase = "insignia-amarilla"; }
    else { estado = "Disponible"; clase = "insignia-verde"; }

    const cliente = Number(p.precio) || 0;
    const costo = Number(p.precioCosto) || 0;

    const celdaCosto = costo
      ? `<strong>${precio(costo)}</strong>`
      : `<span class="mini">sin costo</span>`;

    return `
      <tr>
        <td><img src="${escapar(p.imagen || "")}" alt="${escapar(p.nombre)}" loading="lazy"></td>
        <td>
          <strong>${escapar(p.nombre)}</strong><br>
          <span class="mini">${escapar(p.categoria || "")}</span>
        </td>
        <td><strong>${precio(cliente)}</strong></td>
        <td>
          ${celdaCosto}<br>
          <button class="btn btn-chico btn-gris" data-costo="${p.id}">Cambiar</button>
        </td>
        <td>${costo ? textoGanancia(cliente, costo) : `<span class="mini">—</span>`}</td>
        <td><strong>${stock}</strong></td>
        <td><span class="insignia ${clase}">${estado}</span></td>
        <td><button class="btn btn-chico" data-sumar="${p.id}">+</button></td>
        <td><button class="btn btn-chico btn-rojo" data-restar="${p.id}">−</button></td>
        <td><button class="btn btn-chico btn-gris" data-fijar="${p.id}">Fijar</button></td>
      </tr>`;
  }

  function aplicarFiltro() {

    const texto = buscador.value.toLowerCase().trim();

    const lista = texto
      ? productos.filter((p) =>
          String(p.nombre || "").toLowerCase().includes(texto))
      : productos;

    if (!lista.length) {
      tabla.innerHTML = `<tr><td colspan="10" class="mini">No hay productos</td></tr>`;
      return;
    }

    tabla.innerHTML = lista.map(fila).join("");
  }

  // ---------- Cambiar stock ----------

  async function fijarStock(id, valor) {

    const nuevo = valor < 0 ? 0 : valor;

    try {
      await updateDoc(doc(db, "productos", id), { stock: nuevo });
      await cargar();
    } catch (error) {
      console.error(error);
      aviso("No se pudo actualizar el stock", "error");
    }
  }

  // ---------- Cambiar el precio de costo ----------

  async function fijarCosto(id, valor) {

    if (!isFinite(valor) || valor < 0) {
      aviso("Escribe un precio válido", "error");
      return;
    }

    try {
      await updateDoc(doc(db, "productos", id), { precioCosto: valor });
      await cargar();
    } catch (error) {
      console.error(error);
      aviso("No se pudo actualizar el precio de costo", "error");
    }
  }

  tabla.addEventListener("click", async (e) => {

    const boton = e.target.closest("button");
    if (!boton) return;

    const id = boton.dataset.sumar || boton.dataset.restar ||
      boton.dataset.fijar || boton.dataset.costo;
    const p = productos.find((x) => x.id === id);
    if (!p) return;

    const actual = Number(p.stock) || 0;

    if (boton.dataset.sumar) {
      await fijarStock(id, actual + 1);

    } else if (boton.dataset.restar) {
      await fijarStock(id, actual - 1);

    } else if (boton.dataset.fijar) {
      const valor = prompt("Cantidad en stock:", actual);
      if (valor === null) return;
      await fijarStock(id, Number(valor));

    } else if (boton.dataset.costo) {
      const valor = prompt("Precio de costo (Q):", Number(p.precioCosto) || 0);
      if (valor === null) return;
      await fijarCosto(id, Number(valor.replace(",", ".")));
    }
  });

  buscador.addEventListener("input", aplicarFiltro);

  try {
    await cargar();
  } catch (error) {
    console.error(error);
    aviso("No se pudo cargar el inventario", "error");
  }

});
