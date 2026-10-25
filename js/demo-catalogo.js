// ============================================================
//  DEMO-CATALOGO.JS - Catálogo de ejemplo (negocio ficticio)
//  Asociación Tecnológica Monterroso
// ============================================================
//
//  Sirve para mostrar a los clientes cómo se vería su catálogo:
//   - productos de ejemplo (editables aquí abajo)
//   - filtro por categoría
//   - pedido que se envía por WhatsApp
//
//  No usa Firebase ni toca el carrito real de la tienda.
// ============================================================

const WHATSAPP = "50248975506";

// Lo que se guarda en el celular mientras el visitante prueba la demo.
const CLAVE_PEDIDO = "demo_pedido";

// ------------------------------------------------------------
//  Productos de ejemplo (negocio ficticio: Café La Ceiba)
//  Cambia nombres, precios, categorías y textos libremente.
// ------------------------------------------------------------

const PRODUCTOS = [
  {
    id: "capuchino",
    nombre: "Capuchino",
    categoria: "Cafés",
    precio: 28,
    imagen: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/00/Cappuccino_PeB.jpg/1280px-Cappuccino_PeB.jpg?utm_source=es.wikipedia.org&utm_campaign=index&utm_content=thumbnail",
    descripcion: "Espresso con leche vaporizada y espuma cremosa."
  },
  {
    id: "latte",
    nombre: "Latte de vainilla",
    categoria: "Cafés",
    precio: 32,
    imagen: "https://img.magnific.com/foto-gratis/latte-arce-canela-taza-vidrio_123827-36226.jpg?semt=ais_hybrid&w=740&q=80",
    descripcion: "Café suave con leche y un toque de vainilla."
  },
  {
    id: "croissant",
    nombre: "Croissant de mantequilla",
    categoria: "Repostería",
    precio: 22,
    imagen: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=400&h=300&auto=format&fit=crop",
    descripcion: "Horneado del día, crujiente por fuera y suave por dentro."
  },
  {
    id: "pastel-zanahoria",
    nombre: "Pastel de zanahoria",
    categoria: "Repostería",
    precio: 25,
    imagen: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=400&h=300&auto=format&fit=crop",
    descripcion: "Rebanada con betún de queso crema."
  },
  {
    id: "sandwich-pollo",
    nombre: "Sándwich de pollo",
    categoria: "Salados",
    precio: 35,
    imagen: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=400&h=300&auto=format&fit=crop",
    descripcion: "Pan artesanal, pollo, lechuga, tomate y aderezo de la casa."
  },
  {
    id: "empanada",
    nombre: "Empanada de carne",
    categoria: "Salados",
    precio: 18,
    imagen: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=400&h=300&auto=format&fit=crop",
    descripcion: "Rellena de carne sazonada, recién horneada."
  }
];

// ------------------------------------------------------------
//  Estado
// ------------------------------------------------------------

let categoriaActiva = "Todos";

let pedido = cargarPedido();

function cargarPedido() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_PEDIDO));
    return Array.isArray(guardado) ? guardado : [];
  } catch (e) {
    return [];
  }
}

function guardarPedido() {
  try {
    localStorage.setItem(CLAVE_PEDIDO, JSON.stringify(pedido));
  } catch (e) {
    /* sin espacio: la demo sigue funcionando en memoria */
  }
}

function buscarProducto(id) {
  return PRODUCTOS.find((p) => p.id === id);
}

function quetzales(valor) {
  return "Q" + Number(valor || 0).toLocaleString("es-GT");
}

function escapar(texto) {
  return String(texto == null ? "" : texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ------------------------------------------------------------
//  Filtros por categoría
// ------------------------------------------------------------

function pintarFiltros() {

  const contenedor = document.getElementById("demoFiltros");
  if (!contenedor) return;

  const categorias = ["Todos", ...new Set(PRODUCTOS.map((p) => p.categoria))];

  contenedor.innerHTML = categorias
    .map((categoria) => `
      <button type="button"
              class="filtro${categoria === categoriaActiva ? " activo" : ""}"
              data-categoria="${escapar(categoria)}">
        ${escapar(categoria)}
      </button>
    `)
    .join("");
}

// ------------------------------------------------------------
//  Tarjetas de productos
// ------------------------------------------------------------

function pintarProductos() {

  const contenedor = document.getElementById("demoProductos");
  if (!contenedor) return;

  const visibles = categoriaActiva === "Todos"
    ? PRODUCTOS
    : PRODUCTOS.filter((p) => p.categoria === categoriaActiva);

  contenedor.innerHTML = visibles.map((p) => `
    <article class="producto">
      <div class="producto-imagen">
        <div class="demo-foto" aria-hidden="true">
          <img src="${p.imagen}" alt="${escapar(p.nombre)}" loading="lazy">
        </div>
      </div>
      <div class="producto-cuerpo">
        <h3>${escapar(p.nombre)}</h3>
        <p class="producto-desc">${escapar(p.descripcion)}</p>
        <div class="producto-pie">
          <strong class="producto-precio">${quetzales(p.precio)}</strong>
          <button type="button" class="btn btn-chico" data-agregar="${p.id}">
            Agregar
          </button>
        </div>
      </div>
    </article>
  `).join("");
}

// ------------------------------------------------------------
//  Pedido de la demo
// ------------------------------------------------------------

function pintarPedido() {

  const lista = document.getElementById("demoLista");
  const totalEl = document.getElementById("demoTotal");
  const botonEnviar = document.getElementById("demoEnviar");
  const contador = document.getElementById("demo-contador");

  if (!lista || !totalEl) return;

  let total = 0;
  let unidades = 0;

  if (!pedido.length) {

    lista.innerHTML = `<p class="demo-vacio">
      Todavía no agregaste productos. Toca "Agregar" en cualquier producto.
    </p>`;

  } else {

    lista.innerHTML = pedido.map((item) => {

      const p = buscarProducto(item.id);
      if (!p) return "";

      const subtotal = p.precio * item.cantidad;
      total += subtotal;
      unidades += item.cantidad;

      return `
        <div class="demo-linea">
          <span>
            ${escapar(p.nombre)}
            <br>
            <small>${quetzales(p.precio)} c/u</small>
          </span>
          <div class="demo-linea-cantidad">
            <button type="button" class="btn-mini" data-restar="${p.id}"
                    aria-label="Quitar uno de ${escapar(p.nombre)}">−</button>
            <span>${item.cantidad}</span>
            <button type="button" class="btn-mini" data-sumar="${p.id}"
                    aria-label="Agregar uno de ${escapar(p.nombre)}">+</button>
            <strong>${quetzales(subtotal)}</strong>
            <button type="button" class="btn-texto" data-eliminar="${p.id}">
              Quitar
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  totalEl.textContent = quetzales(total);

  if (botonEnviar) botonEnviar.disabled = pedido.length === 0;

  if (contador) {
    contador.textContent = unidades;
    contador.style.display = unidades > 0 ? "flex" : "none";
  }
}

// ------------------------------------------------------------
//  Enviar el pedido por WhatsApp
// ------------------------------------------------------------

function enviarPedido() {

  if (!pedido.length) return;

  const nombreEl = document.getElementById("demoNombre");
  const nombre = nombreEl ? nombreEl.value.trim() : "";

  const lineas = pedido.map((item) => {
    const p = buscarProducto(item.id);
    if (!p) return "";
    return "• " + p.nombre + " x" + item.cantidad +
      " — " + quetzales(p.precio * item.cantidad);
  }).filter(Boolean);

  const total = pedido.reduce((suma, item) => {
    const p = buscarProducto(item.id);
    return suma + (p ? p.precio * item.cantidad : 0);
  }, 0);

  const texto =
    "¡Hola!" + (nombre ? " Soy " + nombre + "." : "") + "\n" +
    "Quiero hacer este pedido:\n\n" +
    lineas.join("\n") + "\n\n" +
    "Total: " + quetzales(total) + "\n\n" +
    "(Pedido de ejemplo del catálogo de demostración de Café La Ceiba)";

  window.open(
    "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(texto),
    "_blank",
    "noopener"
  );
}

// ------------------------------------------------------------
//  Acciones
// ------------------------------------------------------------

function agregar(id) {

  const existente = pedido.find((item) => item.id === id);

  if (existente) existente.cantidad++;
  else pedido.push({ id: id, cantidad: 1 });

  guardarPedido();
  pintarPedido();
}

function sumar(id) {
  agregar(id);
}

function restar(id) {

  const item = pedido.find((i) => i.id === id);
  if (!item) return;

  if (item.cantidad > 1) item.cantidad--;
  else pedido = pedido.filter((i) => i.id !== id);

  guardarPedido();
  pintarPedido();
}

function eliminar(id) {
  pedido = pedido.filter((i) => i.id !== id);
  guardarPedido();
  pintarPedido();
}

// ------------------------------------------------------------
//  Eventos
// ------------------------------------------------------------

const filtros = document.getElementById("demoFiltros");
if (filtros) {
  filtros.addEventListener("click", (e) => {
    const boton = e.target.closest("[data-categoria]");
    if (!boton) return;
    categoriaActiva = boton.dataset.categoria;
    pintarFiltros();
    pintarProductos();
  });
}

const productosEl = document.getElementById("demoProductos");
if (productosEl) {
  productosEl.addEventListener("click", (e) => {
    const boton = e.target.closest("[data-agregar]");
    if (boton) agregar(boton.dataset.agregar);
  });
}

const listaEl = document.getElementById("demoLista");
if (listaEl) {
  listaEl.addEventListener("click", (e) => {
    const boton = e.target.closest("button");
    if (!boton) return;

    if (boton.dataset.sumar) sumar(boton.dataset.sumar);
    else if (boton.dataset.restar) restar(boton.dataset.restar);
    else if (boton.dataset.eliminar) eliminar(boton.dataset.eliminar);
  });
}

const botonEnviar = document.getElementById("demoEnviar");
if (botonEnviar) botonEnviar.addEventListener("click", enviarPedido);

const botonVaciar = document.getElementById("demoVaciar");
if (botonVaciar) {
  botonVaciar.addEventListener("click", () => {
    pedido = [];
    guardarPedido();
    pintarPedido();
  });
}

// ------------------------------------------------------------
//  Inicio
// ------------------------------------------------------------

pintarFiltros();
pintarProductos();
pintarPedido();
