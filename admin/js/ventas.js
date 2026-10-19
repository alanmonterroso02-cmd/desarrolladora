// ============================================================
//  VENTAS.JS - Gestión de pedidos / ventas
//  Asociación Tecnológica Monterroso
// ============================================================
//
//  Estados de un pedido:
//    Pendiente  → recién recibido, sin comenzar
//    Trabajado  → en proceso / en producción
//    Entregado  → completado
//    Cancelado  → anulado
// ============================================================

import { db } from "../../firebase/firebase-config.js";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { protegerPagina, conectarSalir } from "./sesion.js";
import { aviso, escapar, precio } from "../../js/comun.js";
import { comprobanteDePedido } from "./comprobante.js";

const ESTADOS = ["Pendiente", "Trabajado", "Entregado", "Cancelado"];

let ventas = [];

document.addEventListener("DOMContentLoaded", async () => {

  const usuario = await protegerPagina();
  if (!usuario) return;

  conectarSalir();

  const tabla = document.getElementById("tablaVentas");
  const buscador = document.getElementById("buscarVenta");
  const filtroEstado = document.getElementById("filtroEstado");

  // ---------- Cargar ----------

  async function cargar() {

    const datos = await getDocs(collection(db, "ventas"));
    ventas = [];

    datos.forEach((documento) => {
      const v = documento.data();
      v.id = documento.id;
      ventas.push(v);
    });

    // Más recientes primero
    ventas.sort((a, b) => {
      const fa = a.fecha && a.fecha.seconds ? a.fecha.seconds : 0;
      const fb = b.fecha && b.fecha.seconds ? b.fecha.seconds : 0;
      return fb - fa;
    });

    resumen();
    filtrar();
  }

  // ---------- Resumen ----------

  function resumen() {

    const pendientes = ventas.filter((v) => (v.estado || "Pendiente") === "Pendiente").length;
    const trabajados = ventas.filter((v) => v.estado === "Trabajado").length;
    const entregados = ventas.filter((v) => v.estado === "Entregado").length;

    const total = ventas
      .filter((v) => v.estado === "Entregado")
      .reduce((suma, v) => suma + (Number(v.total) || 0), 0);

    document.getElementById("totalPendientes").textContent = pendientes;
    document.getElementById("totalTrabajados").textContent = trabajados;
    document.getElementById("totalEntregados").textContent = entregados;
    document.getElementById("totalVendido").textContent = precio(total);
  }

  // ---------- Utilidades ----------

  function formatearFecha(fecha) {

    if (!fecha || !fecha.seconds) return "-";

    const f = new Date(fecha.seconds * 1000);

    return f.toLocaleDateString("es-GT") + " " +
      f.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function claseEstado(estado) {
    if (estado === "Entregado") return "insignia-verde";
    if (estado === "Trabajado") return "insignia-azul";
    if (estado === "Cancelado") return "insignia-roja";
    return "insignia-amarilla";
  }

  // ---------- Fila ----------

  function fila(v) {

    const estado = v.estado || "Pendiente";

    const lista = (v.productos || [])
      .map((p) => escapar(p.nombre) + " x" + p.cantidad)
      .join("<br>");

    const opciones = ESTADOS
      .map((e) => `<option value="${e}" ${estado === e ? "selected" : ""}>${e}</option>`)
      .join("");

    return `
      <tr>
        <td>
          <strong>${escapar(v.cliente || "-")}</strong>
          ${v.correo ? `<br><span class="mini">${escapar(v.correo)}</span>` : ""}
        </td>
        <td>
          ${escapar(v.telefono || "-")}<br>
          <span class="mini">${escapar(v.direccion || "-")}</span>
        </td>
        <td>
          ${lista || "-"}
          ${v.notas ? `<br><span class="mini">✎ ${escapar(v.notas)}</span>` : ""}
        </td>
        <td><strong>${precio(v.total)}</strong></td>
        <td class="mini">${formatearFecha(v.fecha)}</td>
        <td>
          <select class="selector-estado ${claseEstado(estado)}"
                  data-estado="${v.id}">
            ${opciones}
          </select>
        </td>
        <td>
          <button class="btn btn-chico btn-gris" data-comprobante="${v.id}">Comprobante</button>
          <button class="btn btn-chico btn-rojo" data-eliminar="${v.id}">Eliminar</button>
        </td>
      </tr>`;
  }

  // ---------- Filtros ----------

  function filtrar() {

    const texto = buscador.value.toLowerCase().trim();
    const estado = filtroEstado.value;

    const lista = ventas.filter((v) => {
      const coincideTexto = String(v.cliente || "")
        .toLowerCase()
        .includes(texto);
      const coincideEstado =
        estado === "todos" || (v.estado || "Pendiente") === estado;
      return coincideTexto && coincideEstado;
    });

    if (!lista.length) {
      tabla.innerHTML =
        `<tr><td colspan="7" class="mini">No hay pedidos que coincidan</td></tr>`;
      return;
    }

    tabla.innerHTML = lista.map(fila).join("");
  }

  // ---------- Acciones ----------

  async function cambiarEstado(id, estado) {
    try {
      await updateDoc(doc(db, "ventas", id), { estado: estado });
      aviso("Pedido marcado como " + estado);
      await cargar();
    } catch (error) {
      console.error(error);
      aviso("No se pudo actualizar el pedido", "error");
    }
  }

  // Cambio de estado con el selector
  tabla.addEventListener("change", async (e) => {

    const selector = e.target.closest("[data-estado]");
    if (!selector) return;

    await cambiarEstado(selector.dataset.estado, selector.value);
  });

  // Comprobante en PDF
  tabla.addEventListener("click", async (e) => {

    const boton = e.target.closest("[data-comprobante]");
    if (!boton) return;

    const v = ventas.find((x) => x.id === boton.dataset.comprobante);
    if (!v) return;

    try {
      aviso("Preparando el comprobante…");
      await comprobanteDePedido(v, null);
      aviso("Comprobante listo");
    } catch (error) {
      console.error(error);
      aviso("No se pudo generar el PDF. Revisa tu conexión.", "error");
    }
  });

  // Eliminar pedido
  tabla.addEventListener("click", async (e) => {

    const boton = e.target.closest("[data-eliminar]");
    if (!boton) return;

    if (!confirm("¿Eliminar este pedido? No se puede deshacer.")) return;

    try {
      await deleteDoc(doc(db, "ventas", boton.dataset.eliminar));
      aviso("Pedido eliminado");
      await cargar();
    } catch (error) {
      console.error(error);
      aviso("No se pudo eliminar", "error");
    }
  });

  buscador.addEventListener("input", filtrar);
  filtroEstado.addEventListener("change", filtrar);

  try {
    await cargar();
  } catch (error) {
    console.error(error);
    aviso("No se pudieron cargar las ventas", "error");
  }

});
