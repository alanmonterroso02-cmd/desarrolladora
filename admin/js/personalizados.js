// ============================================================
//  PERSONALIZADOS.JS (admin) - Ver lo que pidió el cliente
//  Asociación Tecnológica Monterroso
// ============================================================
//
//  Los pedidos pueden traer productos personalizables con una
//  descripción y una imagen de referencia (que el cliente sube desde
//  la tienda). Eso se guarda dentro del mismo pedido, en
//  productos[i].personalizacion.
//
//  Si el cliente llevó varias unidades del mismo producto, puede
//  haber una pieza por unidad (cada una con su imagen y su
//  descripción), porque cada una puede ser diferente.
//
//  También se muestra aquí lo que costó y lo que dejó cada renglón
//  del pedido (precio de costo y ganancia), que es información solo
//  del panel: el cliente nunca la ve.
//
//  Aquí está el pedacito de HTML que lo muestra en las tablas del
//  panel, para no repetirlo en Ventas y en Clientes.
// ============================================================

import { escapar, precio } from "../../js/comun.js";
import { listaPiezas, piezaConDatos } from "../../js/personalizacion.js";

// ------------------------------------------------------------
//  Una pieza (unidad) del pedido
//  "titulo" va vacío cuando el producto llevaba una sola unidad.
// ------------------------------------------------------------

function cajaPieza(pieza, titulo) {

  const conDatos = piezaConDatos(pieza);

  const texto = String((pieza && pieza.descripcion) || "").trim();
  const imagen = (pieza && pieza.imagen) || "";

  const prefijo = titulo ? titulo + ": " : "Personalizado: ";

  let detalle;
  if (texto) detalle = escapar(texto);
  else if (imagen) detalle = "solo imagen";
  else detalle = "sin detalles todavía";

  let html = `<div class="perso-admin">`;

  html += `<span class="perso-admin-texto${conDatos ? "" : " perso-admin-falta"}">` +
    prefijo + detalle + `</span>`;

  if (imagen) {
    // Se muestra chiquita; al tocarla se agranda (ver conectarMiniaturas).
    html += `<img class="miniatura" src="${escapar(imagen)}"
                  alt="Imagen de referencia" title="Toca para ampliar"
                  loading="lazy" decoding="async">`;
  }

  return html + `</div>`;
}

// ------------------------------------------------------------
//  Detalle de la personalización de UN producto del pedido
// ------------------------------------------------------------

export function htmlDetallePersonalizacion(p) {

  const piezas = listaPiezas(p.personalizacion);
  const hayDatos = piezas.some(piezaConDatos);

  // Nada que mostrar (pedidos viejos, de antes de esta función).
  if (!hayDatos && !p.personalizable) return "";

  // Una sola unidad: como siempre.
  if (piezas.length <= 1) return cajaPieza(piezas[0], "");

  // Varias unidades: se numera cada pieza.
  const bloques = piezas
    .map((pieza, i) => cajaPieza(pieza, "Pieza " + (i + 1)))
    .join("");

  return `<div class="perso-admin-lista">${bloques}</div>`;
}

// ------------------------------------------------------------
//  La ganancia con su color: verde si dejó, rojo si costó más de
//  lo que se vendió.
// ------------------------------------------------------------

export function htmlGanancia(valor) {

  const negativo = valor < 0;

  return `<span class="ganancia${negativo ? " ganancia-mala" : ""}">` +
    (negativo ? "−" : "") + precio(Math.abs(valor)) + `</span>`;
}

// ------------------------------------------------------------
//  Lo que costó y lo que dejó un renglón del pedido
//
//  El costo se guarda dentro de la venta al momento de comprar. En
//  los pedidos de antes no quedó guardado, así que se usa el costo
//  de hoy y se avisa ("actual").
// ------------------------------------------------------------

function htmlCuentas(p) {

  const cantidad = Number(p.cantidad) || 1;
  const costo = Number(p.precioCosto) || 0;

  // Todavía no se le puso costo a ese producto.
  if (!costo) return `<br><span class="mini">sin costo registrado</span>`;

  const venta = Number(p.subtotal) || (Number(p.precio) || 0) * cantidad;
  const costoTotal = costo * cantidad;

  return `
    <br>
    <span class="mini">costo ${precio(costoTotal)}${p.costoAproximado ? " (actual)" : ""} · </span>
    ${htmlGanancia(venta - costoTotal)}`;
}

// ------------------------------------------------------------
//  Un renglón por producto del pedido
// ------------------------------------------------------------

export function htmlProductos(productos) {

  return (productos || []).map((p) => `
    <div class="prod-admin">
      ${escapar(p.nombre)} x${p.cantidad || 1}
      ${htmlCuentas(p)}
      ${htmlDetallePersonalizacion(p)}
    </div>`).join("");
}

// ------------------------------------------------------------
//  Al tocar la imagen, se agranda y se vuelve a encoger
// ------------------------------------------------------------

export function conectarMiniaturas(contenedor) {

  if (!contenedor) return;

  contenedor.addEventListener("click", (e) => {

    const mini = e.target.closest(".miniatura");
    if (mini) mini.classList.toggle("grande");
  });
}
