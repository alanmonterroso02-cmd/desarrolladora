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
import { aviso, escapar } from "../../js/comun.js";

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

  // ---------- Fila ----------

  function fila(p) {

    const stock = Number(p.stock) || 0;

    let estado, clase;
    if (stock <= 0) { estado = "Agotado"; clase = "insignia-roja"; }
    else if (stock <= 5) { estado = "Bajo"; clase = "insignia-amarilla"; }
    else { estado = "Disponible"; clase = "insignia-verde"; }

    return `
      <tr>
        <td><img src="${escapar(p.imagen || "")}" alt="${escapar(p.nombre)}" loading="lazy"></td>
        <td>
          <strong>${escapar(p.nombre)}</strong><br>
          <span class="mini">${escapar(p.categoria || "")}</span>
        </td>
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
      tabla.innerHTML = `<tr><td colspan="7" class="mini">No hay productos</td></tr>`;
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

  tabla.addEventListener("click", async (e) => {

    const boton = e.target.closest("button");
    if (!boton) return;

    const id = boton.dataset.sumar || boton.dataset.restar || boton.dataset.fijar;
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
