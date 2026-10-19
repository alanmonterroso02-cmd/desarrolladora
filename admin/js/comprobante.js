// ============================================================
//  COMPROBANTE.JS - Comprobante de compra en PDF
//  Asociación Tecnológica Monterroso
// ============================================================
//
//  Arma el PDF con jsPDF. La librería se descarga SOLO cuando se
//  hace clic en "Comprobante", así el panel no carga de más.
//
//  Dos formas de usarlo:
//    comprobanteDePedido(pedido, cliente)  → un solo pedido
//    comprobanteDeCliente(cliente)         → todos sus pedidos
//
//  El cliente puede venir en null: son los pedidos que se hicieron
//  sin cuenta de Google. En ese caso se usan los datos del pedido.
//
//  OJO: este documento NO es una factura fiscal (FEL). Es un
//  comprobante interno de la compra.
// ============================================================

import { precio } from "../../js/comun.js";
import { listaPiezas, piezaConDatos } from "../../js/personalizacion.js";

const NEGOCIO = {
  nombre: "Asociación Tecnológica Monterroso",
  contacto: "WhatsApp: +502 4897-5506   ·   alanmonterroso02@gmail.com   ·   Guatemala"
};

const RUTA_JSPDF =
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

// Medidas de la hoja A4 en milímetros
const M = 14;
const ANCHO = 210;
const ALTO = 297;
const UTIL = ANCHO - M * 2;

// Columnas de la tabla de productos
const COL = {
  producto: M,
  cant: M + 112,
  precio: M + 146,
  subtotal: ANCHO - M
};

const COLOR = {
  titulo: [15, 23, 42],
  suave: [100, 116, 139],
  texto: [30, 41, 59],
  azul: [0, 150, 200],
  linea: [226, 232, 240]
};

let claseJsPDF = null;
let cargando = null;

// ------------------------------------------------------------
//  Cargar jsPDF (solo la primera vez)
//
//  Se mete como <script> normal: el build "es" del CDN trae un
//  import de Babel que el navegador no sabe resolver, y el "umd"
//  sí es autocontenido. Deja la clase en window.jspdf.jsPDF.
// ------------------------------------------------------------

function cargarScript(url) {

  return new Promise((resolver, rechazar) => {

    const etiqueta = document.createElement("script");

    etiqueta.src = url;
    etiqueta.async = true;

    etiqueta.onload = () => resolver();
    etiqueta.onerror = () =>
      rechazar(new Error("No se pudo descargar el generador de PDF"));

    document.head.appendChild(etiqueta);
  });
}

function traerJsPDF() {

  if (claseJsPDF) return Promise.resolve(claseJsPDF);

  // Si se hace clic dos veces seguidas, se espera la misma descarga.
  if (!cargando) {

    cargando = (async () => {

      if (!(window.jspdf && window.jspdf.jsPDF)) {
        await cargarScript(RUTA_JSPDF);
      }

      claseJsPDF = window.jspdf && window.jspdf.jsPDF;

      if (!claseJsPDF) {
        cargando = null;
        throw new Error("El generador de PDF no quedó disponible");
      }

      return claseJsPDF;
    })();
  }

  return cargando;
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

function fechaLarga(f) {

  const d = aFecha(f);
  if (!d) return "-";

  return d.toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fechaArchivo(f) {

  const d = aFecha(f) || new Date();

  const dos = (n) => String(n).padStart(2, "0");

  return dos(d.getDate()) + "-" + dos(d.getMonth() + 1) + "-" + d.getFullYear() +
    " " + dos(d.getHours()) + "-" + dos(d.getMinutes());
}

// ------------------------------------------------------------
//  Datos del cliente
// ------------------------------------------------------------

function datosDePedido(v, cliente) {
  return {
    nombre: v.cliente || (cliente && cliente.nombre) || "Cliente",
    correo: v.correo || (cliente && cliente.correo) || "",
    telefono: v.telefono || (cliente && cliente.telefono) || "",
    direccion: v.direccion || (cliente && cliente.direccion) || ""
  };
}

function datosDeCliente(cliente, pedidos) {

  const ultimo = pedidos && pedidos.length ? pedidos[0] : null;

  return {
    nombre: cliente.nombre || (ultimo && ultimo.cliente) || "Cliente",
    correo: cliente.correo || (ultimo && ultimo.correo) || "",
    telefono: cliente.telefono || (ultimo && ultimo.telefono) || "",
    direccion: cliente.direccion || (ultimo && ultimo.direccion) || ""
  };
}

function sinCancelar(v) {
  return (v.estado || "Pendiente") !== "Cancelado";
}

function totalDePedido(v) {
  return Number(v.total) || 0;
}

function subtotalDe(p) {

  if (p.subtotal != null) return Number(p.subtotal) || 0;

  return (Number(p.precio) || 0) * (Number(p.cantidad) || 1);
}

function referencia(id) {
  return String(id || "").slice(-6).toUpperCase();
}

// ------------------------------------------------------------
//  Encabezado
// ------------------------------------------------------------

function encabezado(doc, titulo, subtitulo) {

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor.apply(doc, COLOR.titulo);
  doc.text(NEGOCIO.nombre, M, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor.apply(doc, COLOR.suave);
  doc.text(NEGOCIO.contacto, M, 25.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor.apply(doc, COLOR.azul);
  doc.text(titulo.toUpperCase(), ANCHO - M, 20, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor.apply(doc, COLOR.suave);
  doc.text(subtitulo, ANCHO - M, 25.5, { align: "right" });

  doc.setDrawColor.apply(doc, COLOR.linea);
  doc.setLineWidth(0.4);
  doc.line(M, 29, ANCHO - M, 29);

  return 37;
}

// ------------------------------------------------------------
//  Bloque del cliente
// ------------------------------------------------------------

function bloqueCliente(doc, y, d, referenciaTexto) {

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor.apply(doc, COLOR.suave);
  doc.text("CLIENTE", M, y);

  if (referenciaTexto) {
    doc.text(referenciaTexto, ANCHO - M, y, { align: "right" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor.apply(doc, COLOR.titulo);
  doc.text(d.nombre, M, y + 6);

  const partes = [];

  if (d.correo) partes.push("Correo: " + d.correo);
  if (d.telefono) partes.push("Teléfono: " + d.telefono);
  if (d.direccion) partes.push("Dirección: " + d.direccion);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor.apply(doc, COLOR.texto);

  let cursor = y + 11.5;

  partes.forEach((linea) => {
    doc.text(doc.splitTextToSize(linea, UTIL), M, cursor);
    cursor += 4.6;
  });

  return cursor + 7;
}

// ------------------------------------------------------------
//  Encabezado de la tabla de productos
// ------------------------------------------------------------

function cabeceraTabla(doc, y) {

  doc.setFillColor(241, 245, 249);
  doc.rect(M, y, UTIL, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  doc.text("PRODUCTO", COL.producto + 3, y + 5.4);
  doc.text("CANT.", COL.cant, y + 5.4, { align: "right" });
  doc.text("PRECIO", COL.precio, y + 5.4, { align: "right" });
  doc.text("SUBTOTAL", COL.subtotal - 3, y + 5.4, { align: "right" });

  return y + 8;
}

// ------------------------------------------------------------
//  Personalización pedida por el cliente (si la hay)
//  Se escribe debajo del nombre del producto, en letra chica.
// ------------------------------------------------------------

function textoPersonalizacion(p) {

  const piezas = listaPiezas(p.personalizacion);

  if (!piezas.some(piezaConDatos)) {
    // Producto personalizable pero sin detalles: el pedido pasó igual.
    return p.personalizable ? "Personalizado: sin detalles todavía" : "";
  }

  // Una sola unidad: como siempre.
  if (piezas.length <= 1) {

    const pieza = piezas[0];
    const detalle = String(pieza.descripcion || "").trim();

    if (!detalle) return "Personalizado: con imagen de referencia";

    return "Personalizado: " + detalle +
      (pieza.imagen ? " (con imagen de referencia)" : "");
  }

  // Varias unidades: un renglón por pieza (cada una puede ser distinta).
  const renglones = piezas.map((pieza, i) => {

    const detalle = String(pieza.descripcion || "").trim();
    const numero = "Pieza " + (i + 1) + ": ";

    if (!detalle && !pieza.imagen) return numero + "sin detalles";
    if (!detalle) return numero + "imagen de referencia";

    return numero + detalle + (pieza.imagen ? " (con imagen)" : "");
  });

  return "Personalizado:\n" + renglones.join("\n");
}

// ------------------------------------------------------------
//  Filas de productos
// ------------------------------------------------------------

function tablaProductos(doc, y, productos, contexto) {

  const lista = productos && productos.length ? productos : null;

  if (!lista) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor.apply(doc, COLOR.suave);
    doc.text("Sin productos registrados.", COL.producto + 3, y + 5);
    return y + 10;
  }

  lista.forEach((p) => {

    const nombre = p.nombre || "Producto";
    const trozos = doc.splitTextToSize(nombre, COL.cant - COL.producto - 14);

    const personalizado = textoPersonalizacion(p);
    const trozosPersonalizado = personalizado
      ? doc.splitTextToSize(personalizado, COL.cant - COL.producto - 20)
      : [];

    const renglones = trozos.length + trozosPersonalizado.length;
    const alto = Math.max(8.5, renglones * 4.4 + 4);

    // Salto de página: se repite la cabecera de la tabla y, si es un
    // pedido que quedó partido, también su fecha, para que se entienda
    // a qué pedido pertenecen las filas.
    if (y + alto > ALTO - 40) {

      doc.addPage();
      y = 25;

      if (contexto) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor.apply(doc, COLOR.suave);
        doc.text(contexto + " (continúa)", M, y);
        y += 5;
      }

      y = cabeceraTabla(doc, y);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor.apply(doc, COLOR.texto);

    doc.text(trozos, COL.producto + 3, y + 5);

    if (trozosPersonalizado.length) {

      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor.apply(doc, COLOR.suave);
      doc.text(trozosPersonalizado, COL.producto + 3,
        y + 5 + trozos.length * 4.4);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor.apply(doc, COLOR.texto);
    }

    doc.text(String(p.cantidad || 1), COL.cant, y + 5, { align: "right" });
    doc.text(precio(p.precio), COL.precio, y + 5, { align: "right" });
    doc.text(precio(subtotalDe(p)), COL.subtotal - 3, y + 5, { align: "right" });

    doc.setDrawColor.apply(doc, COLOR.linea);
    doc.setLineWidth(0.2);
    doc.line(M, y + alto, ANCHO - M, y + alto);

    y += alto;
  });

  return y;
}

// ------------------------------------------------------------
//  Bloque del total
// ------------------------------------------------------------

function bloqueTotal(doc, y, filas) {

  y += 5;

  const ancho = 74;
  const x = ANCHO - M - ancho;

  filas.forEach((f) => {

    const alto = f.fuerte ? 11 : 9;

    if (y + alto > ALTO - 25) {
      doc.addPage();
      y = 25;
    }

    if (f.fuerte) {
      doc.setFillColor.apply(doc, COLOR.azul);
      doc.rect(x, y, ancho, alto, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
    } else {
      doc.setTextColor.apply(doc, COLOR.suave);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    }

    doc.text(f.etiqueta, x + 4, y + 6.6);
    doc.text(f.valor, x + ancho - 4, y + 6.6, { align: "right" });

    y += alto + 1.5;
  });

  return y;
}

// ------------------------------------------------------------
//  Pie de página
// ------------------------------------------------------------

function pie(doc) {

  const total = doc.getNumberOfPages();

  for (let i = 1; i <= total; i++) {

    doc.setPage(i);

    doc.setDrawColor.apply(doc, COLOR.linea);
    doc.setLineWidth(0.3);
    doc.line(M, ALTO - 18, ANCHO - M, ALTO - 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);

    doc.text("Gracias por su compra.", M, ALTO - 12.5);
    doc.text("Comprobante de la tienda. No es documento fiscal.",
      M, ALTO - 8.5);

    doc.text("Página " + i + " de " + total, ANCHO - M, ALTO - 8.5,
      { align: "right" });
  }
}

// ------------------------------------------------------------
//  Nombre del archivo
// ------------------------------------------------------------

function limpiarNombre(t) {
  return String(t || "").replace(/[\\/:*?"<>|]/g, "").trim() || "cliente";
}

// ============================================================
//  Un solo pedido
// ============================================================

export async function comprobanteDePedido(pedido, cliente) {

  const jsPDF = await traerJsPDF();

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const datos = datosDePedido(pedido, cliente);
  const estado = pedido.estado || "Pendiente";

  let y = encabezado(doc, "Comprobante", "Pedido " + referencia(pedido.id));

  y = bloqueCliente(doc, y, datos, "");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor.apply(doc, COLOR.suave);
  doc.text("Fecha: " + fechaLarga(pedido.fecha) + "   ·   Estado: " + estado,
    M, y);
  y += 8;

  y = cabeceraTabla(doc, y);
  y = tablaProductos(doc, y, pedido.productos,
    "Pedido " + referencia(pedido.id) + " del " + fechaLarga(pedido.fecha));

  y = bloqueTotal(doc, y, [
    { etiqueta: "TOTAL", valor: precio(totalDePedido(pedido)), fuerte: true }
  ]);

  pie(doc);

  doc.save("Comprobante - " + limpiarNombre(datos.nombre) + " - " +
    fechaArchivo(pedido.fecha) + ".pdf");
}

// ============================================================
//  Todos los pedidos de un cliente
// ============================================================

export async function comprobanteDeCliente(cliente) {

  const pedidos = (cliente.pedidos || []).slice();

  const jsPDF = await traerJsPDF();

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const datos = datosDeCliente(cliente, pedidos);

  let y = encabezado(doc, "Comprobante", "Todos los pedidos");

  y = bloqueCliente(doc, y, datos, "Cliente desde " +
    fechaLarga(cliente.fechaRegistro).split(" ")[0]);

  // Resumen de arriba
  const total = pedidos.filter(sinCancelar)
    .reduce((suma, v) => suma + totalDePedido(v), 0);

  const ultima = pedidos.length ? fechaLarga(pedidos[0].fecha) : "-";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor.apply(doc, COLOR.suave);
  doc.text("Pedidos: " + pedidos.length + "   ·   Última compra: " + ultima +
    "   ·   Total: " + precio(total), M, y);

  y += 10;

  if (!pedidos.length) {
    doc.setFont("helvetica", "italic");
    doc.setTextColor.apply(doc, COLOR.suave);
    doc.text("Este cliente todavía no tiene pedidos.", M, y);
  }

  // Un bloque por pedido
  pedidos.forEach((v) => {

    const estado = v.estado || "Pendiente";

    // Espacio para el título + al menos una fila
    if (y > ALTO - 60) {
      doc.addPage();
      y = 25;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor.apply(doc, COLOR.titulo);
    doc.text(fechaLarga(v.fecha), M, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor.apply(doc, COLOR.suave);
    doc.text("Ref. " + referencia(v.id) + "   ·   " + estado,
      ANCHO - M, y, { align: "right" });

    y += 4;

    y = cabeceraTabla(doc, y);
    y = tablaProductos(doc, y, v.productos,
      "Pedido del " + fechaLarga(v.fecha));

    // La nota va primero y el subtotal debajo, para que no parezca
    // que son la misma línea.
    if (v.notas) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor.apply(doc, COLOR.suave);

      const trozos = doc.splitTextToSize("Nota: " + v.notas, UTIL - 45);
      doc.text(trozos, M, y + 4.5);

      y += trozos.length * 4.2 + 1;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor.apply(doc, COLOR.texto);
    doc.text("Subtotal: " + precio(totalDePedido(v)), ANCHO - M, y + 5,
      { align: "right" });

    y += 11;
  });

  bloqueTotal(doc, y, [
    { etiqueta: "TOTAL (" + pedidos.filter(sinCancelar).length + " pedidos)",
      valor: precio(total), fuerte: true }
  ]);

  pie(doc);

  doc.save("Comprobante - " + limpiarNombre(datos.nombre) +
    " - todos los pedidos.pdf");
}
