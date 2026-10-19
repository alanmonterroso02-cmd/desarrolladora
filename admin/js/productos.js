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
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { protegerPagina, conectarSalir } from "./sesion.js";
import { aviso, escapar, precio } from "../../js/comun.js";

let editando = null;
let productos = [];

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
      categoria: document.getElementById("categoria").value,
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

  // ---------- Arranque ----------

  try {
    await cargar();
  } catch (error) {
    console.error(error);
    aviso("No se pudieron cargar los productos", "error");
  }

});
