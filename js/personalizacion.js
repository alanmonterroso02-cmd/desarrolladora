// ============================================================
//  PERSONALIZACION.JS - Imagen y descripción del pedido
//  Asociación Tecnológica Monterroso
// ============================================================
//
//  Un producto marcado como "personalizable" (desde el panel) deja
//  que el cliente suba una imagen de referencia y escriba lo que
//  necesita: nombre a grabar, colores, tamaño, etc.
//
//  Si el cliente lleva VARIAS unidades del mismo producto, cada
//  unidad tiene su propio recuadro (Pieza 1, Pieza 2…), con su
//  imagen y su descripción. Así puede pedir dos llaveros distintos
//  dentro del mismo pedido.
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
// unos 65 KB de imagen: con varias piezas el pedido sigue entrando
// cómodo en Firestore (el checkout corta a los 800 KB).
const CALIDAD_INICIAL = 0.72;
const PESO_MAXIMO = 90000;

// Largo máximo de la descripción escrita por el cliente.
const LARGO_MAXIMO = 600;

// ------------------------------------------------------------
//  De lo guardado a una lista de piezas
//
//  Se entienden los dos formatos:
//    - nuevo:  { piezas: [ { descripcion, imagen }, … ] }
//    - viejo:  { descripcion, imagen }   (pedidos de antes)
//
//  Si se pasa "cantidad", la lista se ajusta al número de unidades:
//  se rellenan las que falten con piezas vacías y se recortan las
//  que sobren.
// ------------------------------------------------------------

export function listaPiezas(personalizacion, cantidad = 0) {

  const per = personalizacion || {};
  let guardadas;

  if (Array.isArray(per.piezas)) {
    guardadas = per.piezas;
  } else if (per.descripcion || per.imagen) {
    guardadas = [{ descripcion: per.descripcion, imagen: per.imagen }];
  } else {
    guardadas = [];
  }

  const lista = guardadas.map((pieza) => ({
    descripcion: String((pieza && pieza.descripcion) || ""),
    imagen: String((pieza && pieza.imagen) || "")
  }));

  if (cantidad > 0) {
    while (lista.length < cantidad) lista.push({ descripcion: "", imagen: "" });
    if (lista.length > cantidad) lista.length = cantidad;
  }

  return lista;
}

// ------------------------------------------------------------
//  ¿Esta pieza trae algo?
// ------------------------------------------------------------

export function piezaConDatos(pieza) {

  if (!pieza) return false;

  return !!(String(pieza.descripcion || "").trim() || pieza.imagen);
}

// ------------------------------------------------------------
//  ¿No hay nada en ninguna pieza?
// ------------------------------------------------------------

export function estaVacia(personalizacion) {

  return !listaPiezas(personalizacion).some(piezaConDatos);
}

// ------------------------------------------------------------
//  Texto corto de una sola pieza
// ------------------------------------------------------------

function textoPieza(pieza) {

  const partes = [];

  if (String((pieza && pieza.descripcion) || "").trim()) {
    partes.push(String(pieza.descripcion).trim());
  }

  if (pieza && pieza.imagen) partes.push("con imagen de referencia");

  return partes.join(" · ");
}

// ------------------------------------------------------------
//  Texto corto para el panel y el aviso de WhatsApp
// ------------------------------------------------------------

export function resumenPersonalizacion(personalizacion) {

  const piezas = listaPiezas(personalizacion);

  if (!piezas.some(piezaConDatos)) return "";

  // Una sola unidad: como siempre.
  if (piezas.length <= 1) return textoPieza(piezas[0]);

  // Varias unidades: se numera cada pieza.
  return piezas
    .map((pieza, i) => {
      const contenido = piezaConDatos(pieza) ? textoPieza(pieza) : "sin detalles";
      return "Pieza " + (i + 1) + ": " + contenido;
    })
    .join(" | ");
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

function textoEstado(completo, varias) {

  if (completo) {
    return varias ? "Listo." : "Listo, ya lo tenemos en cuenta.";
  }

  return varias
    ? "Opcional: si la dejas vacía, esta pieza va sin detalles."
    : "Es opcional: si lo dejas vacío, te escribiremos para pedirte los detalles.";
}

// ------------------------------------------------------------
//  Recuadro de una pieza (una unidad del producto)
// ------------------------------------------------------------

function bloquePieza(id, indice, pieza, cantidad) {

  const varias = cantidad > 1;

  const descripcion = pieza.descripcion || "";
  const imagen = pieza.imagen || "";
  const completo = piezaConDatos(pieza);

  const vista = imagen
    ? `<img class="perso-vista" src="${escapar(imagen)}" alt="Tu referencia"
            loading="lazy" decoding="async">`
    : `<img class="perso-vista" alt="Tu referencia" style="display:none">`;

  const titulo = varias
    ? `<p class="perso-pieza-titulo">Pieza ${indice + 1} de ${cantidad}</p>`
    : "";

  const pista = varias
    ? "Ej: para esta pieza quiero el nombre Ana, colores azul y blanco…"
    : "Ej: quiero que diga Ana, colores azul y blanco, de 20 cm de ancho…";

  return `
    <div class="perso-pieza" data-pieza="${indice}">

      ${titulo}

      <div class="perso-imagenes">

        ${vista}

        <div class="perso-acciones">

          <label class="perso-boton">
            <span data-perso-etiqueta>${imagen ? "Cambiar imagen" : "Subir imagen"}</span>
            <input type="file" accept="image/*"
                   data-perso-archivo="${escapar(id)}"
                   data-perso-pieza="${indice}">
          </label>

          <button type="button" class="btn-texto"
                  data-perso-quitar="${escapar(id)}"
                  data-perso-pieza="${indice}"
                  ${imagen ? "" : 'style="display:none"'}>Quitar imagen</button>

        </div>

      </div>

      <textarea class="perso-texto" rows="3" maxlength="${LARGO_MAXIMO}"
        data-perso-descripcion="${escapar(id)}"
        data-perso-pieza="${indice}"
        placeholder="${escapar(pista)}">${escapar(descripcion)}</textarea>

      <p class="perso-estado ${completo ? "perso-listo" : ""}"
         data-perso-estado="${escapar(id)}"
         data-perso-pieza="${indice}">${textoEstado(completo, varias)}</p>

    </div>`;
}

// ------------------------------------------------------------
//  Recuadro de personalización de un producto del carrito
//  Si el cliente lleva varias unidades, se dibuja una pieza por
//  unidad para que pueda pedirlas diferentes.
// ------------------------------------------------------------

export function htmlPersonalizacion(item) {

  const cantidad = Math.max(1, Number(item.cantidad) || 1);
  const piezas = listaPiezas(item.personalizacion, cantidad);
  const varias = cantidad > 1;

  const ayuda = varias
    ? "Puedes hacerlas diferentes: describe y sube una imagen en cada pieza. " +
      "Si las quieres iguales, llena la primera y deja las demás vacías."
    : "Sube una imagen de referencia y describe lo que necesitas: " +
      "nombre a grabar, colores, tamaño…";

  const bloques = piezas
    .map((pieza, i) => bloquePieza(item.id, i, pieza, cantidad))
    .join("");

  return `
    <div class="perso">

      <p class="perso-cabecera">
        <span class="perso-marca">Personalizable</span>
        Cuéntanos cómo lo quieres
      </p>

      <p class="perso-ayuda">${ayuda}</p>

      ${bloques}

    </div>`;
}

// ------------------------------------------------------------
//  Guardar un cambio de UNA pieza en el carrito
// ------------------------------------------------------------

function guardarPieza(id, indice, cambios) {

  const item = obtenerCarrito().find((x) => x.id === id);
  if (!item) return false;

  const cantidad = Math.max(1, Number(item.cantidad) || 1);
  const piezas = listaPiezas(item.personalizacion, cantidad);
  const pieza = piezas[indice] || { descripcion: "", imagen: "" };

  piezas[indice] = {
    descripcion: cambios.descripcion != null ? cambios.descripcion : pieza.descripcion,
    imagen: cambios.imagen != null ? cambios.imagen : pieza.imagen
  };

  return guardarPersonalizacion(id, piezas);
}

function refrescarEstado(contenedor, id, indice) {

  const estado = contenedor.querySelector(
    `[data-perso-estado="${id}"][data-perso-pieza="${indice}"]`
  );

  if (!estado) return;

  const item = obtenerCarrito().find((x) => x.id === id);

  const cantidad = Math.max(1, Number(item && item.cantidad) || 1);
  const piezas = listaPiezas(item && item.personalizacion, cantidad);

  const completo = piezaConDatos(piezas[indice]);

  estado.textContent = textoEstado(completo, cantidad > 1);
  estado.classList.toggle("perso-listo", completo);
}

// El recuadro de la pieza al que pertenece un elemento.
function cajaDe(elemento) {
  return elemento ? elemento.closest(".perso-pieza") : null;
}

// ------------------------------------------------------------
//  Conectar el recuadro (una sola vez por contenedor)
//  El carrito se vuelve a dibujar al sumar o restar, pero como el
//  listener va en el contenedor y no en los recuadros, sigue vivo.
// ------------------------------------------------------------

export function conectarPersonalizacion(contenedor) {

  if (!contenedor) return;

  let temporizador = null;

  const indiceDe = (elemento) => Number(elemento.dataset.persoPieza) || 0;

  // ---- Descripción (se guarda a los 500 ms de dejar de escribir) ----

  contenedor.addEventListener("input", (e) => {

    const area = e.target.closest("[data-perso-descripcion]");
    if (!area) return;

    const id = area.dataset.persoDescripcion;
    const indice = indiceDe(area);
    const valor = area.value;

    clearTimeout(temporizador);

    temporizador = setTimeout(() => {
      guardarPieza(id, indice, { descripcion: valor });
      refrescarEstado(contenedor, id, indice);
    }, 500);
  });

  // ---- Descripción (al salir del campo se guarda de una vez) ----

  contenedor.addEventListener("change", (e) => {

    const area = e.target.closest("[data-perso-descripcion]");
    if (!area) return;

    const id = area.dataset.persoDescripcion;
    const indice = indiceDe(area);

    clearTimeout(temporizador);
    guardarPieza(id, indice, { descripcion: area.value });
    refrescarEstado(contenedor, id, indice);
  });

  // ---- Imagen elegida ----

  contenedor.addEventListener("change", async (e) => {

    const input = e.target.closest("[data-perso-archivo]");
    if (!input) return;

    const archivo = input.files && input.files[0];
    if (!archivo) return;

    const id = input.dataset.persoArchivo;
    const indice = indiceDe(input);
    const caja = cajaDe(input);

    const estado = contenedor.querySelector(
      `[data-perso-estado="${id}"][data-perso-pieza="${indice}"]`
    );

    if (estado) estado.textContent = "Preparando la imagen…";

    try {

      const imagen = await comprimirImagen(archivo);

      if (!guardarPieza(id, indice, { imagen: imagen })) {
        throw new Error("No cupo la imagen en el carrito. Prueba con una más liviana.");
      }

      const vista = caja ? caja.querySelector(".perso-vista") : null;
      const quitar = caja ? caja.querySelector("[data-perso-quitar]") : null;
      const etiqueta = caja ? caja.querySelector("[data-perso-etiqueta]") : null;

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

    refrescarEstado(contenedor, id, indice);
  });

  // ---- Quitar la imagen ----

  contenedor.addEventListener("click", (e) => {

    const boton = e.target.closest("[data-perso-quitar]");
    if (!boton) return;

    const id = boton.dataset.persoQuitar;
    const indice = indiceDe(boton);
    const caja = cajaDe(boton);

    guardarPieza(id, indice, { imagen: "" });

    const vista = caja ? caja.querySelector(".perso-vista") : null;
    const input = caja ? caja.querySelector("[data-perso-archivo]") : null;
    const etiqueta = caja ? caja.querySelector("[data-perso-etiqueta]") : null;

    if (vista) {
      vista.removeAttribute("src");
      vista.style.display = "none";
    }

    if (input) input.value = "";
    if (etiqueta) etiqueta.textContent = "Subir imagen";

    boton.style.display = "none";

    refrescarEstado(contenedor, id, indice);
  });
}
