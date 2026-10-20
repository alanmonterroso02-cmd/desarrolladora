// ============================================================
//  PRODUCTOS.JS (admin) - Alta, edición y baja de productos
//  Asociación Tecnológica Monterroso
// ============================================================

import { db } from "../../firebase/firebase-config.js";

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { protegerPagina, conectarSalir } from "./sesion.js";
import { aviso, escapar, precio } from "../../js/comun.js";

let editando = null;
let productos = [];

// ------------------------------------------------------------
//  CATEGORÍAS
//  No hay una colección aparte: una categoría existe porque
//  algún producto la usa. El gestor permite crearlas (quedan
//  pendientes hasta guardar el producto), renombrarlas y
//  eliminarlas moviendo sus productos a otra categoría.
// ------------------------------------------------------------

const CATEGORIAS_BASE = [
  "Robótica",
  "Automatización e IoT",
  "Desarrollo de Software",
  "Videovigilancia",
  "Inteligencia Artificial",
  "Electrónica",
  "Diseño 3D",
  "Otros"
];

// Categorías escritas en el gestor que todavía no tienen productos
let categoriasExtra = new Set();

function nombresOrdenados(nombres) {
  return [...new Set(nombres)].sort((a, b) => a.localeCompare(b, "es"));
}

// Map: nombre de la categoría → productos que la usan
function mapaCategorias() {

  const mapa = new Map();

  productos.forEach((p) => {

    const nombre = String(p.categoria || "").trim() || "Otros";

    if (!mapa.has(nombre)) mapa.set(nombre, []);
    mapa.get(nombre).push(p);
  });

  categoriasExtra.forEach((nombre) => {
    if (!mapa.has(nombre)) mapa.set(nombre, []);
  });

  return mapa;
}

// Sugerencias del campo Categoría del formulario
function actualizarSugerenciasCategorias() {

  const lista = document.getElementById("sugerenciasCategorias");
  if (!lista) return;

  const nombres = nombresOrdenados([
    ...mapaCategorias().keys(),
    ...CATEGORIAS_BASE
  ]);

  lista.innerHTML = nombres
    .map((c) => `<option value="${escapar(c)}"></option>`)
    .join("");
}

// ---------- Filas del gestor ----------

function filaCategoria(nombre, total, pendiente) {

  const cuenta = total === 1 ? "1 producto" : `${total} productos`;

  return `
    <tr data-fila="${escapar(nombre)}">
      <td><strong>${escapar(nombre)}</strong></td>
      <td>
        ${cuenta}
        ${pendiente ? '<span class="mini">· sin guardar</span>' : ""}
      </td>
      <td>
        <button class="btn btn-chico btn-gris"
                data-renombrar="${escapar(nombre)}">Renombrar</button>
        <button class="btn btn-chico btn-rojo"
                data-eliminar-categoria="${escapar(nombre)}">Eliminar</button>
      </td>
    </tr>`;
}

function filaRenombrarCategoria(nombre) {

  return `
    <tr data-fila="${escapar(nombre)}">
      <td>
        <input type="text" id="nuevoNombreCategoria"
               value="${escapar(nombre)}">
      </td>
      <td class="mini">Nombre nuevo</td>
      <td>
        <button class="btn btn-chico"
                data-guardar-categoria="${escapar(nombre)}">Guardar</button>
        <button class="btn btn-chico btn-gris"
                data-cancelar-categoria="">Cancelar</button>
      </td>
    </tr>`;
}

function filaEliminarCategoria(nombre, destinos) {

  return `
    <tr data-fila="${escapar(nombre)}">
      <td><strong>${escapar(nombre)}</strong></td>
      <td>
        <small class="mini">Mover sus productos a</small>
        <select id="destinoCategoria">
          ${destinos
            .map((d) => `<option value="${escapar(d)}">${escapar(d)}</option>`)
            .join("")}
        </select>
      </td>
      <td>
        <button class="btn btn-chico btn-rojo"
                data-confirmar-eliminar="${escapar(nombre)}">Mover y eliminar</button>
        <button class="btn btn-chico btn-gris"
                data-cancelar-categoria="">Cancelar</button>
      </td>
    </tr>`;
}

// ---------- Dibujo del gestor ----------

function dibujarCategorias() {

  const cuerpo = document.getElementById("tablaCategorias");
  if (!cuerpo) return;

  const mapa = mapaCategorias();
  const nombres = nombresOrdenados([...mapa.keys()]);

  if (!nombres.length) {
    cuerpo.innerHTML =
      `<tr><td colspan="3" class="mini">Todavía no hay categorías.</td></tr>`;
    return;
  }

  cuerpo.innerHTML = nombres
    .map((nombre) => {
      const total = mapa.get(nombre).length;
      return filaCategoria(nombre, total, !total && categoriasExtra.has(nombre));
    })
    .join("");
}

function filaDeCategoria(nombre) {

  return [...document.querySelectorAll("#tablaCategorias tr")]
    .find((tr) => tr.dataset.fila === nombre) || null;
}

function abrirRenombrar(nombre) {

  const fila = filaDeCategoria(nombre);
  if (!fila) return;

  fila.outerHTML = filaRenombrarCategoria(nombre);

  const input = document.getElementById("nuevoNombreCategoria");
  if (input) {
    input.focus();
    input.select();
  }
}

function abrirEliminar(nombre) {

  const fila = filaDeCategoria(nombre);
  if (!fila) return;

  const otros = [...mapaCategorias().keys()].filter((n) => n !== nombre);

  // "Otros" es el destino natural; si ya es la categoría a borrar,
  // solo quedan las demás.
  const destinos = nombresOrdenados(
    nombre === "Otros" ? otros : ["Otros", ...otros]
  );

  if (!destinos.length) {
    aviso("No hay otra categoría a la que mover los productos", "error");
    return;
  }

  fila.outerHTML = filaEliminarCategoria(nombre, destinos);
}

// ------------------------------------------------------------
//  Comprimir imagen antes de guardarla (Firestore limita ~1 MB)
// ------------------------------------------------------------

const ANCHO_MAXIMO = 900;
const CALIDAD = 0.7;
const LIMITE_BYTES = 700000;

function comprimirImagen(archivo) {

  return new Promise((resolve, reject) => {

    const lector = new FileReader();

    lector.onload = (e) => {

      const img = new Image();

      img.onload = () => {

        let ancho = img.width;
        let alto = img.height;

        if (ancho > ANCHO_MAXIMO) {
          alto = Math.round(alto * (ANCHO_MAXIMO / ancho));
          ancho = ANCHO_MAXIMO;
        }

        const canvas = document.createElement("canvas");
        canvas.width = ancho;
        canvas.height = alto;
        canvas.getContext("2d").drawImage(img, 0, 0, ancho, alto);

        let calidad = CALIDAD;
        let resultado = canvas.toDataURL("image/jpeg", calidad);

        while (resultado.length > LIMITE_BYTES && calidad > 0.3) {
          calidad -= 0.1;
          resultado = canvas.toDataURL("image/jpeg", calidad);
        }

        resolve(resultado);
      };

      img.onerror = reject;
      img.src = e.target.result;
    };

    lector.onerror = reject;
    lector.readAsDataURL(archivo);
  });
}

// ------------------------------------------------------------
//  Inicio
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {

  const usuario = await protegerPagina();
  if (!usuario) return;

  conectarSalir();

  const formulario = document.getElementById("productoForm");
  const tabla = document.getElementById("listaProductos");
  const inputImagen = document.getElementById("imagen");
  const vista = document.getElementById("vistaImagen");
  const buscador = document.getElementById("buscarProducto");
  const btnCancelar = document.getElementById("btnCancelar");
  const tituloForm = document.getElementById("tituloForm");

  const tablaCategorias = document.getElementById("tablaCategorias");
  const inputNuevaCategoria = document.getElementById("nuevaCategoria");
  const btnAgregarCategoria = document.getElementById("btnAgregarCategoria");
  const btnNuevaCategoria = document.getElementById("btnNuevaCategoria");
  const inputCategoriaProducto = document.getElementById("categoria");
  const gestorCategorias = document.getElementById("gestorCategorias");

  // ---------- Vista previa de la imagen ----------

  inputImagen.addEventListener("change", async () => {

    const archivo = inputImagen.files[0];
    if (!archivo) return;

    try {
      vista.src = await comprimirImagen(archivo);
      vista.style.display = "block";
    } catch (error) {
      console.error(error);
      aviso("No se pudo procesar esa imagen", "error");
    }
  });

  // ---------- Cargar y mostrar ----------

  async function cargar() {

    const datos = await getDocs(collection(db, "productos"));
    productos = [];

    datos.forEach((documento) => {
      const p = documento.data();
      p.id = documento.id;
      productos.push(p);
    });

    actualizarSugerenciasCategorias();
    dibujarCategorias();
    aplicarFiltro();
  }

  function filaProducto(p) {

    const agotado = Number(p.stock) <= 0;

    return `
      <tr>
        <td><img src="${escapar(p.imagen || "")}" alt="${escapar(p.nombre)}" loading="lazy"></td>
        <td>
          <strong>${escapar(p.nombre)}</strong><br>
          <span class="mini">${escapar(p.categoria || "")}</span>
          ${p.personalizable ? ' <span class="mini">· personalizable</span>' : ""}
        </td>
        <td>${precio(p.precio)}</td>
        <td>${p.precioCosto ? precio(p.precioCosto) : '<span class="mini">—</span>'}</td>
        <td>
          <span class="insignia ${agotado ? "insignia-roja" : "insignia-verde"}">
            ${p.stock}
          </span>
        </td>
        <td>
          <button class="btn btn-chico btn-gris" data-editar="${p.id}">Editar</button>
          <button class="btn btn-chico btn-rojo" data-eliminar="${p.id}">Eliminar</button>
        </td>
      </tr>`;
  }

  function aplicarFiltro() {

    const texto = buscador.value.toLowerCase().trim();

    const resultado = texto
      ? productos.filter((p) =>
          String(p.nombre || "").toLowerCase().includes(texto))
      : productos;

    if (!resultado.length) {
      tabla.innerHTML =
        `<tr><td colspan="6" class="mini">No hay productos</td></tr>`;
      return;
    }

    tabla.innerHTML = resultado.map(filaProducto).join("");
  }

  // ---------- Guardar (crear o editar) ----------

  formulario.addEventListener("submit", async (e) => {

    e.preventDefault();

    const producto = {
      nombre: document.getElementById("nombre").value.trim(),
      // Categoría libre: se guarda tal cual se escriba; si queda vacía
      // se usa "Otros" para que el producto no se pierda del catálogo.
      categoria:
        document.getElementById("categoria").value.trim() || "Otros",
      precio: Number(document.getElementById("precio").value),
      // Precio de costo: lo que te cuesta hacerlo. Es solo para el
      // panel (inventario); el cliente nunca lo ve.
      precioCosto: Number(document.getElementById("precioCosto").value) || 0,
      stock: Number(document.getElementById("stock").value),
      descripcion: document.getElementById("descripcion").value.trim(),
      personalizable: document.getElementById("personalizable").checked,
      imagen: vista.src || ""
    };

    try {

      if (editando) {
        await updateDoc(doc(db, "productos", editando), producto);
        aviso("Producto actualizado");
      } else {
        await addDoc(collection(db, "productos"), producto);
        aviso("Producto guardado");
      }

      resetear();
      await cargar();

    } catch (error) {
      console.error(error);
      aviso("No se pudo guardar el producto", "error");
    }
  });

  // ---------- Editar ----------

  window.editarProducto = (id) => {

    const p = productos.find((x) => x.id === id);
    if (!p) return;

    document.getElementById("nombre").value = p.nombre || "";
    document.getElementById("categoria").value = p.categoria || "Otros";
    document.getElementById("precio").value = p.precio || 0;
    document.getElementById("precioCosto").value = p.precioCosto || 0;
    document.getElementById("stock").value = p.stock || 0;
    document.getElementById("descripcion").value = p.descripcion || "";
    document.getElementById("personalizable").checked = !!p.personalizable;

    if (p.imagen) {
      vista.src = p.imagen;
      vista.style.display = "block";
    }

    editando = id;
    tituloForm.textContent = "Editar producto";
    btnCancelar.style.display = "block";

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ---------- Eliminar ----------

  window.eliminarProducto = async (id) => {

    if (!confirm("¿Eliminar este producto?")) return;

    try {
      await deleteDoc(doc(db, "productos", id));
      aviso("Producto eliminado");
      await cargar();
    } catch (error) {
      console.error(error);
      aviso("No se pudo eliminar", "error");
    }
  };

  // ---------- Delegación de clics en la tabla ----------

  tabla.addEventListener("click", (e) => {

    const editar = e.target.closest("[data-editar]");
    if (editar) {
      window.editarProducto(editar.dataset.editar);
      return;
    }

    const eliminar = e.target.closest("[data-eliminar]");
    if (eliminar) window.eliminarProducto(eliminar.dataset.eliminar);
  });

  // ---------- Cancelar edición ----------

  function resetear() {
    formulario.reset();
    vista.style.display = "none";
    vista.removeAttribute("src");
    editando = null;
    tituloForm.textContent = "Nuevo producto";
    btnCancelar.style.display = "none";
  }

  btnCancelar.addEventListener("click", resetear);

  buscador.addEventListener("input", aplicarFiltro);

  // ---------- Gestor de categorías ----------

  async function renombrarCategoria(viejo, nuevo, items, existente) {

    if (existente) {

      if (!confirm(
        `La categoría «${existente}» ya existe.\n` +
        `¿Juntar los productos de «${viejo}» con ella?`
      )) return;

      // Se respeta el nombre que ya existía (evita duplicados por
      // mayúsculas o tildes distintas)
      nuevo = existente;
    }

    // Categoría escrita pero sin productos: solo se cambia el nombre
    if (!items.length) {

      categoriasExtra.delete(viejo);
      categoriasExtra.add(nuevo);

      dibujarCategorias();
      actualizarSugerenciasCategorias();
      aviso(`Categoría «${nuevo}» lista`);
      return;
    }

    try {

      const lote = writeBatch(db);

      items.forEach((p) =>
        lote.update(doc(db, "productos", p.id), { categoria: nuevo })
      );

      await lote.commit();

      categoriasExtra.delete(viejo);
      categoriasExtra.delete(nuevo);

      aviso(`«${viejo}» ahora se llama «${nuevo}»`);
      await cargar();

    } catch (error) {
      console.error(error);
      aviso("No se pudo renombrar la categoría", "error");
    }
  }

  async function eliminarCategoria(nombre, destino, items) {

    if (!items.length) {

      categoriasExtra.delete(nombre);

      dibujarCategorias();
      actualizarSugerenciasCategorias();
      aviso(`Categoría «${nombre}» eliminada`);
      return;
    }

    if (!confirm(
      `¿Mover ${items.length} producto(s) de «${nombre}» a «${destino}»?`
    )) return;

    try {

      const lote = writeBatch(db);

      items.forEach((p) =>
        lote.update(doc(db, "productos", p.id), { categoria: destino })
      );

      await lote.commit();

      categoriasExtra.delete(nombre);

      aviso(`Categoría «${nombre}» eliminada`);
      await cargar();

    } catch (error) {
      console.error(error);
      aviso("No se pudo eliminar la categoría", "error");
    }
  }

  function agregarCategoria() {

    const nombre = inputNuevaCategoria.value.trim().replace(/\s+/g, " ");

    if (!nombre) {
      aviso("Escribe el nombre de la categoría", "error");
      inputNuevaCategoria.focus();
      return;
    }

    const yaExiste = nombresOrdenados([
      ...mapaCategorias().keys(),
      ...CATEGORIAS_BASE
    ]).find((n) => n.toLowerCase() === nombre.toLowerCase());

    inputNuevaCategoria.value = "";
    inputCategoriaProducto.value = yaExiste || nombre;
    inputNuevaCategoria.focus();

    if (yaExiste) {
      aviso(`«${yaExiste}» ya existe; la dejé puesta en el producto`, "error");
      return;
    }

    categoriasExtra.add(nombre);

    dibujarCategorias();
    actualizarSugerenciasCategorias();
    aviso(`Categoría «${nombre}» lista y puesta en el producto`);
  }

  btnAgregarCategoria.addEventListener("click", agregarCategoria);

  inputNuevaCategoria.addEventListener("keydown", (e) => {

    if (e.key !== "Enter") return;

    e.preventDefault();
    agregarCategoria();
  });

  // El botón "＋ Nueva" del formulario lleva al gestor con lo que
  // ya esté escrito en el campo Categoría.
  btnNuevaCategoria.addEventListener("click", () => {

    const escrito = inputCategoriaProducto.value.trim();
    if (escrito) inputNuevaCategoria.value = escrito;

    gestorCategorias.scrollIntoView({ behavior: "smooth", block: "center" });
    inputNuevaCategoria.focus();
    inputNuevaCategoria.select();
  });

  tablaCategorias.addEventListener("click", async (e) => {

    const renombrar = e.target.closest("[data-renombrar]");

    if (renombrar) {
      abrirRenombrar(renombrar.dataset.renombrar);
      return;
    }

    const eliminar = e.target.closest("[data-eliminar-categoria]");

    if (eliminar) {
      abrirEliminar(eliminar.dataset.eliminarCategoria);
      return;
    }

    const guardar = e.target.closest("[data-guardar-categoria]");

    if (guardar) {

      const viejo = guardar.dataset.guardarCategoria;
      const input = document.getElementById("nuevoNombreCategoria");
      const nuevo = (input ? input.value : "").trim().replace(/\s+/g, " ");

      if (!nuevo) {
        aviso("El nombre no puede quedar vacío", "error");
        if (input) input.focus();
        return;
      }

      if (nuevo === viejo) {
        dibujarCategorias();
        return;
      }

      const mapa = mapaCategorias();

      // Comparación sin distinguir mayúsculas, para no crear
      // "Robotica" y "Robótica" como si fueran distintas.
      const existente = [...mapa.keys()].find(
        (n) => n !== viejo && n.toLowerCase() === nuevo.toLowerCase()
      );

      await renombrarCategoria(
        viejo,
        nuevo,
        mapa.get(viejo) || [],
        existente || null
      );
      return;
    }

    const confirmar = e.target.closest("[data-confirmar-eliminar]");

    if (confirmar) {

      const nombre = confirmar.dataset.confirmarEliminar;
      const select = document.getElementById("destinoCategoria");
      const destino = select ? select.value : "Otros";

      await eliminarCategoria(
        nombre,
        destino,
        mapaCategorias().get(nombre) || []
      );
      return;
    }

    if (e.target.closest("[data-cancelar-categoria]")) dibujarCategorias();
  });

  // Enter guarda el nombre nuevo; Escape cancela
  tablaCategorias.addEventListener("keydown", (e) => {

    const editando = e.target.closest("#nuevoNombreCategoria");
    if (!editando) return;

    if (e.key === "Enter") {

      e.preventDefault();

      const boton = document.querySelector("[data-guardar-categoria]");
      if (boton) boton.click();
    }

    if (e.key === "Escape") dibujarCategorias();
  });

  // ---------- Arranque ----------

  try {
    await cargar();
  } catch (error) {
    console.error(error);
    aviso("No se pudieron cargar los productos", "error");
  }

});
