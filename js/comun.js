// ============================================================
//  COMUN.JS - Utilidades compartidas
//  Asociación Tecnológica Monterroso
// ============================================================
//
//  Funciones ligeras que usan todas las páginas de la tienda:
//  avisos (toast) sin bloquear, formato de precio y contador
//  del carrito. Sin librerías externas.
// ============================================================

// ------------------------------------------------------------
//  Aviso flotante (reemplaza a alert(), que bloquea el celular)
// ------------------------------------------------------------

export function aviso(mensaje, tipo = "ok") {

  let contenedor = document.getElementById("aviso-zona");

  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.id = "aviso-zona";
    document.body.appendChild(contenedor);
  }

  const caja = document.createElement("div");
  caja.className = "aviso aviso-" + tipo;
  caja.textContent = mensaje;

  contenedor.appendChild(caja);

  // Se anima al aparecer y se quita solo a los 2.6 segundos
  requestAnimationFrame(() => caja.classList.add("visible"));

  setTimeout(() => {
    caja.classList.remove("visible");
    setTimeout(() => caja.remove(), 300);
  }, 2600);
}

// ------------------------------------------------------------
//  Formato de precio en quetzales
// ------------------------------------------------------------

export function precio(valor) {
  const numero = Number(valor) || 0;
  return "Q" + numero.toLocaleString("es-GT");
}

// ------------------------------------------------------------
//  Contador del carrito en la barra de navegación
// ------------------------------------------------------------

export function actualizarContadorCarrito() {

  const badge = document.getElementById("contador-carrito");
  if (!badge) return;

  let carrito = [];
  try {
    carrito = JSON.parse(localStorage.getItem("carrito")) || [];
  } catch (e) {
    carrito = [];
  }

  const total = carrito.reduce((suma, p) => suma + (p.cantidad || 0), 0);

  badge.textContent = total;
  badge.style.display = total > 0 ? "flex" : "none";
}

// ------------------------------------------------------------
//  Escapar texto para insertarlo en HTML sin riesgos
// ------------------------------------------------------------

export function escapar(texto) {
  return String(texto == null ? "" : texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Al cargar cualquier página, refresca el contador.
document.addEventListener("DOMContentLoaded", actualizarContadorCarrito);
