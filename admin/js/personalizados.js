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
//  Aquí está el pedacito de HTML que lo muestra en las tablas del
//  panel, para no repetirlo en Ventas y en Clientes.
// ============================================================

import { escapar } from "../../js/comun.js";

// ------------------------------------------------------------
//  Detalle de la personalización de UN producto del pedido
// ------------------------------------------------------------

export function htmlDetallePersonalizacion(p) {

  const per = p.personalizacion || {};
  const texto = String(per.descripcion || "").trim();
  const imagen = per.imagen || "";

  // Nada que mostrar (pedidos viejos, de antes de esta función).
  if (!texto && !imagen && !p.personalizable) return "";

  let html = `<div class="perso-admin">`;

  if (texto) {
    html += `<span class="perso-admin-texto">Personalizado: ${escapar(texto)}</span>`;
  } else if (imagen) {
    html += `<span class="perso-admin-texto">Personalizado: solo imagen</span>`;
  } else {
    html += `<span class="perso-admin-texto perso-admin-falta">
               Personalizado: sin detalles todavía
             </span>`;
  }

  if (imagen) {
    // Se muestra chiquita; al tocarla se agranda (ver conectarMiniaturas).
    html += `<img class="miniatura" src="${escapar(imagen)}"
                  alt="Imagen de referencia" title="Toca para ampliar"
                  loading="lazy" decoding="async">`;
  }

  return html + `</div>`;
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
