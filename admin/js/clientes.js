// ============================================================
//  CLIENTES.JS - Control por cliente
//  Asociación Tecnológica Monterroso
// ============================================================
//
//  Junta las dos colecciones del negocio:
//    clientes → quién es (correo, teléfono, registro)
//    ventas   → qué compró, cuándo y en qué estado
//
//  Cada pedido se pega a su cliente en este orden:
//    1. uid      (la cuenta de Google con la que compró) ← el más seguro
//    2. correo
//    3. teléfono
//    4. nombre
//
//  Los pedidos que no coinciden con ningún cliente registrado no se
//  pierden: se muestran aparte, abajo, en "Pedidos sin cliente".
//
//  Solo se usan teléfono/nombre para emparejar cuando ese dato es
//  único entre los clientes. Así nunca se le cuelga un pedido a la
//  persona equivocada.
//
//  También se lee "productos", solo para saber el costo actual de
//  cada uno: sirve de respaldo en los pedidos viejos, porque en los
//  nuevos el costo ya viene guardado dentro de la propia venta.
// ============================================================

import { db } from "../../firebase/firebase-config.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { protegerPagina, conectarSalir } from "./sesion.js";
import { aviso, escapar, precio } from "../../js/comun.js";
import { comprobanteDePedido, comprobanteDeCliente } from "./comprobante.js";
import { htmlProductos, conectarMiniaturas } from "./personalizados.js";

let clientes = [];
let pedidos = [];
let sueltos = [];

// Clientes con el historial desplegado (por id)
const abiertos = {};

// ------------------------------------------------------------
//  Normalizar
// ------------------------------------------------------------

function limpiar(t) {
  return String(t == null ? "" : t).trim().toLowerCase();
}

function soloDigitos(t) {
  return String(t == null ? "" : t).replace(/\D/g, "");
}

// ------------------------------------------------------------
//  Fechas
// ------------------------------------------------------------

function aFecha(f) {

  if (!f) return null;

  try {
    if (typeof f.toDate === "function") return f.toDate();
    if (typeof f.seconds === "number") return new Date(f.seconds * 1000);

    const d = new Date(f);
    return isNaN(d.getTime()) ? null : d;
  } catch (e) {
    return null;
  }
}

function numFecha(f) {
  const d = aFecha(f);
  return d ? d.getTime() : 0;
}

function fechaCorta(f) {

  const d = aFecha(f);
  if (!d) return "-";

  return d.toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function fechaHora(f) {

  const d = aFecha(f);
  if (!d) return "-";

  return d.toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit" }) +
    " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ------------------------------------------------------------
//  Colores del estado del pedido
// ------------------------------------------------------------

function claseEstado(estado) {
  if (estado === "Entregado") return "insignia-verde";
  if (estado === "Trabajado") return "insignia-azul";
  if (estado === "Cancelado") return "insignia-roja";
  return "insignia-amarilla";
}

function esPorEntregar(v) {
  const e = v.estado || "Pendiente";
  return e === "Pendiente" || e === "Trabajado";
}

function noCancelado(v) {
  return (v.estado || "Pendiente") !== "Cancelado";
}

// ------------------------------------------------------------
//  Índice de un dato único
//  Se salta los valores repetidos: si dos clientes tienen el mismo
//  teléfono o el mismo nombre, ese dato no sirve para emparejar.
// ------------------------------------------------------------

function indiceUnico(lista, obtener, normalizar) {

  const veces = new Map();
  const indice = new Map();

  lista.forEach((c) => {
    const clave = normalizar(obtener(c));
    if (!clave) return;
    veces.set(clave, (veces.get(clave) || 0) + 1);
  });

  lista.forEach((c) => {
    const clave = normalizar(obtener(c));
    if (!clave || veces.get(clave) !== 1) return;
    indice.set(clave, c);
  });

  return indice;
}

// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {

  const usuario = await protegerPagina();
  if (!usuario) return;

  conectarSalir();

  const tabla = document.getElementById("tablaClientes");
  const buscador = document.getElementById("buscarCliente");
  const zonaSueltos = document.getElementById("zonaSueltos");

  // ---------- Cargar ----------

  async function cargar() {

    // Las tres colecciones se piden a la vez, para no esperar de más.
    const [datosClientes, datosVentas, datosProductos] = await Promise.all([
      getDocs(collection(db, "clientes")),
      getDocs(collection(db, "ventas")),
      getDocs(collection(db, "productos"))
    ]);

    clientes = [];
    datosClientes.forEach((documento) => {
      const c = documento.data();
      c.id = documento.id;
      c.pedidos = [];
      clientes.push(c);
    });

    // El costo de hoy de cada producto. Es el respaldo para los
    // pedidos hechos antes de que el costo se guardara en la venta.
    const costosHoy = {};
    datosProductos.forEach((documento) => {
      costosHoy[documento.id] = Number(documento.data().precioCosto) || 0;
    });

    pedidos = [];
    datosVentas.forEach((documento) => {
      const v = documento.data();
      v.id = documento.id;

      (v.productos || []).forEach((p) => {
        if (!Number(p.precioCosto) && costosHoy[p.id]) {
          p.precioCosto = costosHoy[p.id];
          p.costoAproximado = true;
        }
      });

      pedidos.push(v);
    });

    emparejar();
    ordenar();
    resumen();
    filtrar();
  }

  // ---------- Pegar cada pedido a su cliente ----------

  function emparejar() {

    const porUid = indiceUnico(clientes, (c) => c.id, limpiar);
    const porCorreo = indiceUnico(clientes, (c) => c.correo, limpiar);
    const porTelefono = indiceUnico(clientes, (c) => c.telefono, soloDigitos);
    const porNombre = indiceUnico(clientes, (c) => c.nombre, limpiar);

    clientes.forEach((c) => { c.pedidos = []; });
    sueltos = [];

    pedidos.forEach((v) => {

      const tel = soloDigitos(v.telefono);

      const cliente =
        (v.uid && porUid.get(limpiar(v.uid))) ||
        (v.correo && porCorreo.get(limpiar(v.correo))) ||
        (tel.length >= 8 && porTelefono.get(tel)) ||
        (v.cliente && porNombre.get(limpiar(v.cliente))) ||
        null;

      if (cliente) cliente.pedidos.push(v);
      else sueltos.push(v);
    });

    // Datos calculados de cada cliente
    clientes.forEach((c) => {

      c.pedidos.sort((a, b) => numFecha(b.fecha) - numFecha(a.fecha));

      c.numPedidos = c.pedidos.length;
      c.numPorEntregar = c.pedidos.filter(esPorEntregar).length;
      c.total = c.pedidos.filter(noCancelado)
        .reduce((suma, v) => suma + (Number(v.total) || 0), 0);
      c.ultima = c.numPedidos ? c.pedidos[0].fecha : null;
    });

    sueltos.sort((a, b) => numFecha(b.fecha) - numFecha(a.fecha));
  }

  // ---------- Orden: primero los que ya compraron ----------

  function ordenar() {

    clientes.sort((a, b) => {

      if (a.numPedidos && !b.numPedidos) return -1;
      if (!a.numPedidos && b.numPedidos) return 1;

      if (a.numPedidos && b.numPedidos) {
        return numFecha(b.ultima) - numFecha(a.ultima);
      }

      return limpiar(a.nombre).localeCompare(limpiar(b.nombre));
    });
  }

  // ---------- Resumen de arriba ----------

  function resumen() {

    const porEntregar = pedidos.filter(esPorEntregar).length;

    const totalPedido = pedidos.filter(noCancelado)
      .reduce((suma, v) => suma + (Number(v.total) || 0), 0);

    document.getElementById("totalClientes").textContent = clientes.length;
    document.getElementById("totalConPedidos").textContent =
      clientes.filter((c) => c.numPedidos > 0).length;
    document.getElementById("totalPorEntregar").textContent = porEntregar;
    document.getElementById("totalPedido").textContent = precio(totalPedido);
  }

  // ---------- Fila de un cliente ----------

  function fila(c, i) {

    const inicial = String(c.nombre || c.correo || "?")
      .trim().charAt(0).toUpperCase() || "?";

    const foto = c.foto
      ? `<img src="${escapar(c.foto)}" alt="" loading="lazy" onerror="this.remove()">`
      : "";

    const etiquetaPedidos = c.numPedidos === 1 ? "pedido" : "pedidos";

    return `
      <tr>
        <td class="mini">${i + 1}</td>
        <td>
          <div class="celda-cliente">
            <div class="avatar"><span>${escapar(inicial)}</span>${foto}</div>
            <strong>${escapar(c.nombre || "Sin nombre")}</strong>
          </div>
        </td>
        <td>
          ${escapar(c.correo || "-")}<br>
          <span class="mini">${escapar(c.telefono || "sin teléfono")}</span>
        </td>
        <td>
          ${c.numPedidos ? `<strong>${c.numPedidos}</strong>` : `<span class="mini">0</span>`}
          ${c.numPorEntregar
            ? `<br><span class="insignia insignia-amarilla">${c.numPorEntregar} por entregar</span>`
            : ""}
        </td>
        <td>${c.numPedidos ? `<strong>${precio(c.total)}</strong>` : `<span class="mini">—</span>`}</td>
        <td class="mini">${c.numPedidos ? fechaHora(c.ultima) : "nunca"}</td>
        <td class="mini">${fechaCorta(c.fechaRegistro)}</td>
        <td>
          ${c.numPedidos
            ? `<button class="btn-enlace" data-ver="${escapar(c.id)}">
                 ${abiertos[c.id] ? "Ocultar" : `Ver ${c.numPedidos} ${etiquetaPedidos}`}
               </button>
               <br>
               <button class="btn-enlace" data-comp-cliente="${escapar(c.id)}">
                 Comprobante
               </button>`
            : `<span class="mini">—</span>`}
        </td>
      </tr>
      ${abiertos[c.id] ? detalle(c) : ""}`;
  }

  // ---------- Historial desplegado ----------

  function detalle(c) {

    const filas = c.pedidos.map((v) => {

      const estado = v.estado || "Pendiente";

      const lista = htmlProductos(v.productos);

      return `
        <tr>
          <td class="mini">${fechaHora(v.fecha)}</td>
          <td>
            ${lista || "-"}
            ${v.notas ? `<br><span class="mini">✎ ${escapar(v.notas)}</span>` : ""}
          </td>
          <td>${precio(v.total)}</td>
          <td><span class="insignia ${claseEstado(estado)}">${escapar(estado)}</span></td>
          <td>
            <button class="btn-enlace" data-comp-pedido="${escapar(v.id)}">
              Comprobante
            </button>
          </td>
        </tr>`;
    }).join("");

    return `
      <tr class="fila-detalle">
        <td colspan="8">
          <div class="detalle-caja">

            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Productos</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>${filas}</tbody>
            </table>

            <p class="mini" style="margin-top:12px">
              Dirección: ${escapar(c.direccion || "no registrada")}.
              El estado del pedido se cambia desde
              <a href="ventas.html">Ventas</a>.
            </p>

          </div>
        </td>
      </tr>`;
  }

  // ---------- Mostrar ----------

  function mostrar(lista) {

    if (!lista.length) {
      tabla.innerHTML =
        `<tr><td colspan="8" class="mini">No hay clientes que coincidan</td></tr>`;
      return;
    }

    tabla.innerHTML = lista.map(fila).join("");
  }

  // ---------- Pedidos sin cliente registrado ----------

  function pintarSueltos(texto, digitos) {

    if (!sueltos.length) {
      zonaSueltos.innerHTML = "";
      return;
    }

    const lista = !texto ? sueltos : sueltos.filter((v) =>
      limpiar(v.cliente).includes(texto) ||
      limpiar(v.telefono).includes(texto) ||
      (digitos && soloDigitos(v.telefono).includes(digitos))
    );

    // Si se está buscando y nada coincide, no se muestra la sección.
    if (!lista.length) {
      zonaSueltos.innerHTML = "";
      return;
    }

    const total = lista.filter(noCancelado)
      .reduce((suma, v) => suma + (Number(v.total) || 0), 0);

    const filas = lista.map((v) => {

      const estado = v.estado || "Pendiente";

      const productos = htmlProductos(v.productos);

      return `
        <tr>
          <td class="mini">${fechaHora(v.fecha)}</td>
          <td>
            <strong>${escapar(v.cliente || "-")}</strong>
            ${v.correo ? `<br><span class="mini">${escapar(v.correo)}</span>` : ""}
          </td>
          <td class="mini">${escapar(v.telefono || "-")}</td>
          <td>${productos || "-"}</td>
          <td>${precio(v.total)}</td>
          <td><span class="insignia ${claseEstado(estado)}">${escapar(estado)}</span></td>
          <td>
            <button class="btn-enlace" data-comp-suelto="${escapar(v.id)}">
              Comprobante
            </button>
          </td>
        </tr>`;
    }).join("");

    zonaSueltos.innerHTML = `
      <h2 class="titulo-seccion">Pedidos sin cliente registrado (${lista.length})</h2>

      <div class="tarjeta">

        <p class="mini" style="margin-bottom:15px">
          Pedidos de personas que compraron sin cuenta de Google, o con un
          nombre o teléfono que no coincide con ningún cliente del listado.
          No se pierden: siguen apareciendo en
          <a href="ventas.html">Ventas</a>. Suma: <strong>${precio(total)}</strong>.
        </p>

        <div class="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Nombre en el pedido</th>
                <th>Teléfono</th>
                <th>Productos</th>
                <th>Total</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
        </div>

      </div>`;
  }

  // ---------- Buscar ----------

  function filtrar() {

    const texto = limpiar(buscador.value);
    const digitos = soloDigitos(texto);

    const lista = !texto ? clientes.slice() : clientes.filter((c) =>
      limpiar(c.nombre).includes(texto) ||
      limpiar(c.correo).includes(texto) ||
      limpiar(c.telefono).includes(texto) ||
      (digitos && soloDigitos(c.telefono).includes(digitos))
    );

    mostrar(lista);
    pintarSueltos(texto, digitos);
  }

  // ---------- Abrir / cerrar el historial ----------

  tabla.addEventListener("click", async (e) => {

    // Desplegar el historial
    const ver = e.target.closest("[data-ver]");

    if (ver) {
      const id = ver.dataset.ver;

      if (abiertos[id]) delete abiertos[id];
      else abiertos[id] = true;

      filtrar();
      return;
    }

    // Comprobante de TODOS los pedidos del cliente
    const deCliente = e.target.closest("[data-comp-cliente]");

    if (deCliente) {
      const c = clientes.find((x) => x.id === deCliente.dataset.compCliente);
      if (c) await generar(() => comprobanteDeCliente(c));
      return;
    }

    // Comprobante de UN pedido del historial
    const dePedido = e.target.closest("[data-comp-pedido]");

    if (dePedido) {
      const id = dePedido.dataset.compPedido;
      const c = clientes.find((x) => x.pedidos.some((v) => v.id === id));
      const v = c ? c.pedidos.find((x) => x.id === id) : null;

      if (v) await generar(() => comprobanteDePedido(v, c));
    }
  });

  // Comprobante de un pedido sin cliente registrado
  zonaSueltos.addEventListener("click", async (e) => {

    const boton = e.target.closest("[data-comp-suelto]");
    if (!boton) return;

    const v = sueltos.find((x) => x.id === boton.dataset.compSuelto);
    if (v) await generar(() => comprobanteDePedido(v, null));
  });

  // ---------- Generar el PDF ----------

  async function generar(armar) {

    try {
      // Se avisa porque la librería del PDF se descarga solo la
      // primera vez (después queda guardada en caché).
      aviso("Preparando el comprobante…");
      await armar();
      aviso("Comprobante listo");
    } catch (error) {
      console.error(error);
      aviso("No se pudo generar el PDF. Revisa tu conexión.", "error");
    }
  }

  buscador.addEventListener("input", filtrar);

  // Las imágenes de referencia se agrandan al tocarlas.
  conectarMiniaturas(tabla);
  conectarMiniaturas(zonaSueltos);

  // ---------- Arrancar ----------

  try {
    await cargar();
  } catch (error) {
    console.error(error);
    aviso("No se pudieron cargar los clientes", "error");
    tabla.innerHTML =
      `<tr><td colspan="8" class="mini">Error al cargar</td></tr>`;
  }

});
