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
import { htmlProductos, conectarMiniaturas, htmlGanancia } from "./personalizados.js";

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

    // Los pedidos y los productos se piden a la vez.
    const [datosVentas, datosProductos] = await Promise.all([
      getDocs(collection(db, "ventas")),
      getDocs(collection(db, "productos"))
    ]);

    // El costo de hoy de cada producto. Es el respaldo para los
    // pedidos hechos antes de que el costo se guardara en la venta.
    const costosHoy = {};
    datosProductos.forEach((documento) => {
      costosHoy[documento.id] = Number(documento.data().precioCosto) || 0;
    });

    ventas = [];

    datosVentas.forEach((documento) => {
      const v = documento.data();
      v.id = documento.id;

      (v.productos || []).forEach((p) => {
        if (!Number(p.precioCosto) && costosHoy[p.id]) {
          p.precioCosto = costosHoy[p.id];
          p.costoAproximado = true;
        }
      });

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

  // ---------- Lo que costó y lo que dejó el pedido ----------
  //  Solo se calcula si TODOS sus renglones tienen costo: si falta
  //  uno, la ganancia saldría más alta de lo que es en realidad.

  function cuentasPedido(v) {

    const productos = v.productos || [];

    if (!productos.length) return null;
    if (productos.some((p) => !Number(p.precioCosto))) return null;

    let costo = 0;
    let aproximado = false;

    productos.forEach((p) => {
      costo += (Number(p.precioCosto) || 0) * (Number(p.cantidad) || 1);
      if (p.costoAproximado) aproximado = true;
    });

    return {
      costo: costo,
      ganancia: (Number(v.total) || 0) - costo,
      aproximado: aproximado
    };
  }

  // ---------- Fila ----------

  function fila(v) {

    const estado = v.estado || "Pendiente";

    const lista = htmlProductos(v.productos);

    const cuentas = cuentasPedido(v);

    const celdaCosto = cuentas
      ? precio(cuentas.costo) +
        (cuentas.aproximado ? `<br><span class="mini">costo de hoy</span>` : "")
      : `<span class="mini">—</span>`;

    const celdaGanancia = cuentas
      ? htmlGanancia(cuentas.ganancia)
      : `<span class="mini">—</span>`;

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
        <td>${celdaCosto}</td>
        <td>${celdaGanancia}</td>
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
        `<tr><td colspan="9" class="mini">No hay pedidos que coincidan</td></tr>`;
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

  // Las imágenes de referencia se agrandan al tocarlas.
  conectarMiniaturas(tabla);

  try {
    await cargar();
  } catch (error) {
    console.error(error);
    aviso("No se pudieron cargar las ventas", "error");
  }

});
