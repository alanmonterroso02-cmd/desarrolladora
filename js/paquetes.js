// ============================================================
//  PAQUETES.JS - Paquetes y precios (ARCHIVO ÚNICO DE DATOS)
//  Asociación Tecnológica Monterroso
// ============================================================
//
//  Todos los precios del sitio viven aquí. Para cambiar un precio,
//  un texto o el orden de las tarjetas, edita solamente este archivo.
//
//  Los precios están en quetzales (Q) y son "desde / hasta": el
//  valor final depende de la personalización de cada negocio.
//
//  Lo usa la sección "Paquetes y precios" de index.html.
// ============================================================

export const PAQUETES = [
  {
    id: "landing",
    nombre: "Landing page + dominio + hosting",
    para: "Para negocios que necesitan presencia profesional y recibir contactos.",
    desde: 500,
    hasta: 1000,
    mensual: "Hosting: Q50 a Q100 al mes",
    incluye: [
      "Página de presentación con tu información",
      "Diseño adaptado a celular y computadora",
      "Dominio y hosting configurados",
      "Botón de WhatsApp y formulario de contacto",
      "Publicación en línea lista para compartir"
    ]
  },
  {
    id: "menu-qr",
    nombre: "Menú digital con QR",
    para: "Para restaurantes, cafeterías y comedores que quieren mostrar su menú sin reimprimir.",
    desde: 300,
    hasta: 600,
    mensual: "Actualizaciones: Q100 al mes",
    incluye: [
      "Menú con fotos, precios y categorías",
      "Código QR listo para mesas o mostrador",
      "Actualización de platos y precios",
      "Diseño adaptado a celular",
      "Sin aplicaciones que descargar"
    ]
  },
  {
    id: "catalogo-wa",
    nombre: "Catálogo con pedidos por WhatsApp",
    para: "Para tiendas y emprendimientos que ya venden por WhatsApp y quieren ordenar los pedidos.",
    desde: 1200,
    hasta: 2500,
    mensual: "Soporte: Q100 a Q200 al mes",
    incluye: [
      "Catálogo con fotos, precios y categorías",
      "Carrito de compras en el celular del cliente",
      "Pedido enviado directo a tu WhatsApp",
      "Panel para cargar y editar productos",
      "Control de inventario básico"
    ]
  },
  {
    id: "citas",
    nombre: "Sistema de citas o reservas",
    para: "Para barberías, clínicas, canchas y negocios que trabajan con horarios.",
    desde: 2000,
    hasta: 4000,
    mensual: "Mantenimiento: Q150 a Q300 al mes",
    incluye: [
      "Agenda con horarios disponibles",
      "Reserva en línea sin llamadas",
      "Confirmación y recordatorio por WhatsApp",
      "Panel para ver y mover las citas",
      "Historial de clientes"
    ]
  },
  {
    id: "inventario",
    nombre: "Inventario y ventas",
    para: "Para tiendas pequeñas que necesitan saber qué entra, qué sale y cuánto ganan.",
    desde: 3000,
    hasta: 6000,
    mensual: "Mantenimiento: Q200 a Q300 al mes",
    incluye: [
      "Registro de productos y existencias",
      "Ventas diarias y cierre de caja",
      "Alertas de stock bajo",
      "Reportes de ganancia por producto",
      "Usuarios con permisos distintos"
    ]
  }
];

// ------------------------------------------------------------
//  Utilidades de formato
// ------------------------------------------------------------

function quetzales(valor) {
  return "Q" + Number(valor || 0).toLocaleString("es-GT");
}

// Número de WhatsApp que ya usa el sitio.
const WHATSAPP = "50248975506";

function enlaceWhatsApp(paquete) {
  const mensaje =
    "Hola, me interesa el paquete \"" + paquete.nombre + "\" " +
    "(desde " + quetzales(paquete.desde) + "). " +
    "¿Me pueden dar más información?";

  return "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(mensaje);
}

// ------------------------------------------------------------
//  Tarjeta de un paquete
// ------------------------------------------------------------

function tarjeta(paquete) {

  const items = paquete.incluye
    .map((texto) => "<li>" + texto + "</li>")
    .join("");

  return `
    <article class="paquete">
      <h3>${paquete.nombre}</h3>
      <p class="paquete-para">${paquete.para}</p>

      <p class="paquete-precio">
        Desde ${quetzales(paquete.desde)}
        <small>Hasta ${quetzales(paquete.hasta)} según personalización</small>
      </p>

      <p class="paquete-mensual">${paquete.mensual}</p>

      <ul>${items}</ul>

      <a class="btn"
         href="${enlaceWhatsApp(paquete)}"
         target="_blank" rel="noopener">
        Cotizar este paquete
      </a>
    </article>
  `;
}

// ------------------------------------------------------------
//  Dibuja la sección (solo si la página tiene el contenedor)
// ------------------------------------------------------------

function dibujarPaquetes() {

  const contenedor = document.getElementById("listaPaquetes");
  if (!contenedor) return;

  try {
    // Generamos primero el HTML. Si algo falla aquí, el respaldo sigue visible.
    const html = PAQUETES.map(tarjeta).join("");

    // Vaciamos el mensaje de respaldo justo antes de pintar las tarjetas.
    contenedor.replaceChildren();
    contenedor.innerHTML = html;
  } catch (error) {
    // Si hay un error, dejamos el mensaje de respaldo para que el cliente
    // pueda escribir por WhatsApp en lugar de ver la sección vacía.
    console.error("No se pudieron cargar los paquetes:", error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", dibujarPaquetes);
} else {
  dibujarPaquetes();
}
