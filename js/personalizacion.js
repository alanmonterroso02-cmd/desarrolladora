// ============================================================
//  PERSONALIZACION.JS - Imagen y descripción del pedido
//  Asociación Tecnológica Monterroso
// ============================================================
//
//  Un producto marcado como "personalizable" (desde el panel) deja
//  que el cliente suba una imagen de referencia y escriba lo que
//  necesita: nombre a grabar, colores, tamaño, etc.
//
//  Todo se guarda dentro del propio carrito (localStorage). Así el
//  cliente no pierde lo que escribió si recarga la página o si el
//  navegador recarga al iniciar sesión con Google.
//
//  La imagen se comprime en el celular ANTES de guardarla: una foto
//  de 4 MB queda en unos 60 KB. Es importante porque Firestore corta
//  los documentos en 1 MB y porque el cliente puede tener datos
//  lentos (una subida grande se le haría eterna).
//
//  Nada es obligatorio: si el cliente lo deja vacío, el pedido pasa
//  igual y el aviso de WhatsApp le avisa al administrador que faltan
//  los detalles.
// ============================================================

import { obtenerCarrito, guardarPersonalizacion } from "./carrito.js";
import { aviso, escapar } from "./comun.js";

// Lado más largo de la imagen guardada (en píxeles). Para una
// referencia de diseño es más que suficiente y pesa poco.
const LADO_MAXIMO = 700;

// Calidad del JPEG y tope del texto ya en base64. 90000 letras eran
// unos 65 KB de imagen: con 3 o 4 personalizados el pedido sigue
// entrando cómodo en Firestore.
const CALIDAD_INICIAL = 0.72;
const PESO_MAXIMO = 90000;

// Largo máximo de la descripción escrita por el cliente.
const LARGO_MAXIMO = 600;

// ------------------------------------------------------------
//  ¿Está vacía la personalización?
// ------------------------------------------------------------

export function estaVacia(personalizacion) {

  if (!personalizacion) return true;

  const descripcion = String(personalizacion.descripcion || "").trim();

  return !descripcion && !personalizacion.imagen;
}

// ------------------------------------------------------------
//  Texto corto para el panel y el aviso de WhatsApp
// ------------------------------------------------------------

export function resumenPersonalizacion(personalizacion) {

  if (estaVacia(personalizacion)) return "";

  const partes = [];

  if (String(personalizacion.descripcion || "").trim()) {
    partes.push(String(personalizacion.descripcion).trim());
  }

  if (personalizacion.imagen) partes.push("con imagen de referencia");

  return partes.join(" · ");
}

// ------------------------------------------------------------
//  Comprimir la imagen antes de guardarla
//  Devuelve una imagen JPEG en texto (data URL).
//
//  Garantiza que el resultado no pase de PESO_MAXIMO: primero baja
//  la calidad y, si todavía pesa mucho (una foto muy detallada),
//  achica la imagen y vuelve a probar.
// ------------------------------------------------------------

const FACTORES = [1, 0.8, 0.6, 0.45];

export function comprimirImagen(archivo) {

  return new Promise((resolver, rechazar) => {

    if (!archivo || !/^image\//.test(archivo.type || "")) {
      rechazar(new Error("Ese archivo no es una imagen"));
      return;
    }

    const lector = new FileReader();

    lector.onload = (evento) => {

      const img = new Image();

      img.onload = () => {

        try {

          const original = {
            ancho: img.naturalWidth || img.width,
            alto: img.naturalHeight || img.height
          };

          if (!original.ancho || !original.alto) {
            rechazar(new Error("La imagen está vacía"));
            return;
          }

          let resultado = "";

          for (const factor of FACTORES) {
            resultado = codificar(img, original, factor);
            if (resultado.length <= PESO_MAXIMO) break;
          }

          resolver(resultado);

        } catch (error) {
          rechazar(error);
        }
      };

      img.onerror = () => rechazar(new Error("No se pudo leer esa imagen"));
      img.src = evento.target.result;
    };

    lector.onerror = () => rechazar(new Error("No se pudo leer el archivo"));
    lector.readAsDataURL(archivo);
  });
}

// ------------------------------------------------------------
//  Dibuja la imagen en un lienzo y la pasa a JPEG
// ------------------------------------------------------------

function codificar(img, original, factor) {

  // Solo se achica, nunca se agranda.
  const escala = Math.min(1, LADO_MAXIMO / Math.max(original.ancho, original.alto)) * factor;

  const ancho = Math.max(1, Math.round(original.ancho * escala));
  const alto = Math.max(1, Math.round(original.alto * escala));

  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;

  const pincel = lienzo.getContext("2d");

  if (!pincel) {
    throw new Error("Este navegador no pudo procesar la imagen");
  }

  // Fondo blanco: el JPEG no guarda transparencia, y si no se pinta,
  // las partes transparentes salen negras.
  pincel.fillStyle = "#ffffff";
  pincel.fillRect(0, 0, ancho, alto);

  pincel.drawImage(img, 0, 0, ancho, alto);

  let calidad = CALIDAD_INICIAL;
  let resultado = lienzo.toDataURL("image/jpeg", calidad);

  // Si todavía pesa mucho, se le baja la calidad de a poco.
  while (resultado.length > PESO_MAXIMO && calidad > 0.35) {
    calidad -= 0.08;
    resultado = lienzo.toDataURL("image/jpeg", calidad);
  }

  return resultado;
}

// ------------------------------------------------------------
//  Texto del estado (no es un error, es un recordatorio)
// ------------------------------------------------------------

function textoEstado(completo) {

  return completo
    ? "Listo, ya lo tenemos en cuenta."
    : "Es opcional: si lo dejas vacío, te escribiremos para pedirte los detalles.";
}

// ------------------------------------------------------------
//  Recuadro de personalización de un producto del carrito
// ------------------------------------------------------------

export function htmlPersonalizacion(item) {

  const per = item.personalizacion || {};

  const descripcion = per.descripcion || "";
  const imagen = per.imagen || "";
  const completo = !estaVacia(per);

  const vista = imagen
    ? `<img class="perso-vista" src="${escapar(imagen)}" alt="Tu referencia"
            loading="lazy" decoding="async">`
    : `<img class="perso-vista" alt="Tu referencia" style="display:none">`;

  return `
    <div class="perso">

      <p class="perso-cabecera">
        <span class="perso-marca">Personalizable</span>
        Cuéntanos cómo lo quieres
      </p>

      <p class="perso-ayuda">
        Sube una imagen de referencia y describe lo que necesitas:
        nombre a grabar, colores, tamaño…
      </p>

      <div class="perso-imagenes">

        ${vista}

        <div class="perso-acciones">

          <label class="perso-boton">
            <span data-perso-etiqueta>${imagen ? "Cambiar imagen" : "Subir imagen"}</span>
            <input type="file" accept="image/*"
                   data-perso-archivo="${escapar(item.id)}">
          </label>

          <button type="button" class="btn-texto"
                  data-perso-quitar="${escapar(item.id)}"
                  ${imagen ? "" : 'style="display:none"'}>Quitar imagen</button>

        </div>

      </div>

      <textarea class="perso-texto" rows="3" maxlength="${LARGO_MAXIMO}"
        data-perso-descripcion="${escapar(item.id)}"
        placeholder="Ej: quiero que diga Ana, colores azul y blanco, de 20 cm de ancho…">${escapar(descripcion)}</textarea>

      <p class="perso-estado ${completo ? "perso-listo" : ""}"
         data-perso-estado="${escapar(item.id)}">${textoEstado(completo)}</p>

    </div>`;
}

// ------------------------------------------------------------
//  Guardar un cambio en el carrito
// ------------------------------------------------------------

function guardar(id, cambios) {

  const item = obtenerCarrito().find((x) => x.id === id);
  if (!item) return false;

  const actual = item.personalizacion || {};

  return guardarPersonalizacion(id, {
    descripcion: cambios.descripcion != null
      ? cambios.descripcion
      : actual.descripcion,
    imagen: cambios.imagen != null ? cambios.imagen : actual.imagen
  });
}

function refrescarEstado(contenedor, id) {

  const estado = contenedor.querySelector(`[data-perso-estado="${id}"]`);
  if (!estado) return;

  const item = obtenerCarrito().find((x) => x.id === id);
  const completo = !estaVacia(item && item.personalizacion);

  estado.textContent = textoEstado(completo);
  estado.classList.toggle("perso-listo", completo);
}

// ------------------------------------------------------------
//  Conectar el recuadro (una sola vez por contenedor)
//  El carrito se vuelve a dibujar al sumar o restar, pero como el
//  listener va en el contenedor y no en los recuadros, sigue vivo.
// ------------------------------------------------------------

export function conectarPersonalizacion(contenedor) {

  if (!contenedor) return;

  let temporizador = null;

  // ---- Descripción (se guarda a los 500 ms de dejar de escribir) ----

  contenedor.addEventListener("input", (e) => {

    const area = e.target.closest("[data-perso-descripcion]");
    if (!area) return;

    const id = area.dataset.persoDescripcion;
    const valor = area.value;

    clearTimeout(temporizador);

    temporizador = setTimeout(() => {
      guardar(id, { descripcion: valor });
      refrescarEstado(contenedor, id);
    }, 500);
  });

  // ---- Descripción (al salir del campo se guarda de una vez) ----

  contenedor.addEventListener("change", (e) => {

    const area = e.target.closest("[data-perso-descripcion]");
    if (!area) return;

    const id = area.dataset.persoDescripcion;

    clearTimeout(temporizador);
    guardar(id, { descripcion: area.value });
    refrescarEstado(contenedor, id);
  });

  // ---- Imagen elegida ----

  contenedor.addEventListener("change", async (e) => {

    const input = e.target.closest("[data-perso-archivo]");
    if (!input) return;

    const archivo = input.files && input.files[0];
    if (!archivo) return;

    const id = input.dataset.persoArchivo;
    const estado = contenedor.querySelector(`[data-perso-estado="${id}"]`);

    if (estado) estado.textContent = "Preparando la imagen…";

    try {

      const imagen = await comprimirImagen(archivo);

      if (!guardar(id, { imagen: imagen })) {
        throw new Error("No cupo la imagen en el carrito. Prueba con una más liviana.");
      }

      const caja = input.closest(".perso");
      const vista = caja ? caja.querySelector(".perso-vista") : null;
      const quitar = caja
        ? caja.querySelector(`[data-perso-quitar="${id}"]`)
        : null;
      const etiqueta = caja
        ? caja.querySelector("[data-perso-etiqueta]")
        : null;

      if (vista) {
        vista.src = imagen;
        vista.style.display = "block";
      }

      if (quitar) quitar.style.display = "";
      if (etiqueta) etiqueta.textContent = "Cambiar imagen";

      aviso("Imagen lista");

    } catch (error) {

      console.error(error);
      aviso(error.message || "No se pudo usar esa imagen", "error");
      input.value = "";
    }

    refrescarEstado(contenedor, id);
  });

  // ---- Quitar la imagen ----

  contenedor.addEventListener("click", (e) => {

    const boton = e.target.closest("[data-perso-quitar]");
    if (!boton) return;

    const id = boton.dataset.persoQuitar;

    guardar(id, { imagen: "" });

    const caja = boton.closest(".perso");
    const vista = caja ? caja.querySelector(".perso-vista") : null;
    const input = caja
      ? caja.querySelector(`[data-perso-archivo="${id}"]`)
      : null;
    const etiqueta = caja
      ? caja.querySelector("[data-perso-etiqueta]")
      : null;

    if (vista) {
      vista.removeAttribute("src");
      vista.style.display = "none";
    }

    if (input) input.value = "";
    if (etiqueta) etiqueta.textContent = "Subir imagen";

    boton.style.display = "none";

    refrescarEstado(contenedor, id);
  });
}
