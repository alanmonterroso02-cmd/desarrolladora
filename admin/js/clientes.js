// ============================================================
//  CLIENTES.JS - Clientes registrados
//  Asociación Tecnológica Monterroso
// ============================================================

import { db } from "../../firebase/firebase-config.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { protegerPagina, conectarSalir } from "./sesion.js";
import { aviso, escapar } from "../../js/comun.js";

let clientes = [];

document.addEventListener("DOMContentLoaded", async () => {

  const usuario = await protegerPagina();
  if (!usuario) return;

  conectarSalir();

  const tabla = document.getElementById("tablaClientes");
  const buscador = document.getElementById("buscarCliente");
  const totalEl = document.getElementById("totalClientes");

  // ---------- Cargar ----------

  async function cargar() {

    const datos = await getDocs(collection(db, "clientes"));
    clientes = [];

    datos.forEach((documento) => {
      const c = documento.data();
      c.id = documento.id;
      clientes.push(c);
    });

    totalEl.textContent = clientes.length;
    filtrar();
  }

  // ---------- Fecha ----------

  function obtenerFecha(fecha) {

    if (!fecha) return "-";

    try {
      if (typeof fecha.toDate === "function") fecha = fecha.toDate();
      const f = new Date(fecha);
      if (isNaN(f.getTime())) return "-";

      return f.toLocaleDateString("es-GT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    } catch (e) {
      return "-";
    }
  }

  // ---------- Mostrar ----------

  function mostrar(lista) {

    if (!lista.length) {
      tabla.innerHTML =
        `<tr><td colspan="5" class="mini">No hay clientes registrados</td></tr>`;
      return;
    }

    tabla.innerHTML = lista
      .map((c, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${escapar(c.nombre || "-")}</strong></td>
          <td>${escapar(c.correo || "-")}</td>
          <td>${escapar(c.telefono || "-")}</td>
          <td class="mini">${obtenerFecha(c.fechaRegistro)}</td>
        </tr>`)
      .join("");
  }

  // ---------- Buscar ----------

  function filtrar() {

    const texto = buscador.value.toLowerCase().trim();

    if (!texto) {
      mostrar(clientes);
      return;
    }

    const resultado = clientes.filter((c) => {
      const nombre = String(c.nombre || "").toLowerCase();
      const correo = String(c.correo || "").toLowerCase();
      const telefono = String(c.telefono || "").toLowerCase();
      return nombre.includes(texto) ||
        correo.includes(texto) ||
        telefono.includes(texto);
    });

    mostrar(resultado);
  }

  buscador.addEventListener("input", filtrar);

  try {
    await cargar();
  } catch (error) {
    console.error(error);
    aviso("No se pudieron cargar los clientes", "error");
    tabla.innerHTML =
      `<tr><td colspan="5" class="mini">Error al cargar</td></tr>`;
  }

});
