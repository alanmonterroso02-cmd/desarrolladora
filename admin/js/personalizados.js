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
//  Aquí está el pedacito de HTML que lo muestra en las tablas del
//  panel, para no repetirlo en Ventas y en Clientes.
// ============================================================

import { escapar } from "../../js/comun.js";
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
//  Un renglón por producto del pedido
// ------------------------------------------------------------

export function htmlProductos(productos) {

  return (productos || []).map((p) => `
    <div class="prod-admin">
      ${escapar(p.nombre)} x${p.cantidad || 1}
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
