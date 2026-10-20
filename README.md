# Asociación Tecnológica Monterroso

Sitio web de la Asociación Tecnológica Monterroso: servicios de
desarrollo web, automatización, videovigilancia, inteligencia
artificial, robótica y proyectos a medida.

Incluye una **tienda de productos personalizados** con carrito y panel
de administración, construida con **HTML + CSS + JavaScript puro**
(sin frameworks) y **Firebase** (Firestore + Auth).

---

## Estructura del proyecto

```
index.html                     → Página principal del sitio
style.css                      → Estilos generales (tema oscuro/azul)

pages/
  nosotros.html                → Misión, visión, objetivos y reclutamiento
  tienda.html                  → Catálogo de productos personalizados
  servicios/                   → webs, automatizacion, videovigilancia, ia, proyectos
  productos/                   → robot, asistenciaqr (con imágenes)

tienda/
  carrito.html                 → "Mi carrito"
  checkout.html                → Finalizar pedido

css/
  tienda.css                   → Estilos de la tienda (ligero, sin Bootstrap)

js/
  tienda.js                    → Carga el catálogo desde Firestore (con caché)
  productos.js                 → Acceso a productos + caché local
  carrito.js                   → Carrito (localStorage, funciona sin internet)
  ver_carrito.js               → Lógica de la página "Mi carrito"
  checkout.js                  → Guarda el pedido, descuenta stock y avisa por WhatsApp
  auth-cliente.js              → Login con Google (opcional)
  notificar-whatsapp.js        → Aviso de pedidos por WhatsApp (CallMeBot)
  comun.js                     → Avisos (toast), precios, utilidades

firebase/
  firebase-config.js           → Configuración de Firebase (ya conectado)

admin/
  login.html                   → Login del administrador
  dashboard.html + js/         → Resumen general
  productos.html + js/         → Alta, edición y baja de productos
  inventario.html + js/        → Control de inventario
  ventas.html + js/            → Historial de pedidos
  clientes.html + js/          → Clientes registrados
  css/admin.css                → Estilos del panel

GUIA_FIREBASE.md               → Paso a paso para conectar Firebase
```

---

## Antes de usarlo

1. **Este proyecto ya está conectado** a Firebase (proyecto
   `atmgt-5d3a9`). Si necesitas crear otro desde cero, sigue
   **`GUIA_FIREBASE.md`**.
2. Aplica las **reglas seguras** de Firestore (sección *Seguridad* de
   la guía). Es lo más urgente: con reglas abiertas, cualquiera puede
   leer y borrar tus datos.
3. Avisos automáticos por WhatsApp: revisa
   `js/notificar-whatsapp.js` (y ten en cuenta que la clave queda
   visible para los visitantes).
4. Sube tus productos desde `admin/login.html`.

---

## Cómo funciona la tienda

1. El cliente entra a `pages/tienda.html` y ve el catálogo por categorías.
2. Agrega productos al carrito (no necesita iniciar sesión para esto).
3. En **Finalizar pedido** debe **iniciar sesión con Google** — si no,
   el botón *Confirmar pedido* queda bloqueado. Sus datos de contacto se
   rellenan solos y el pedido queda asociado a su correo.
4. Al confirmar: se vuelven a leer los **precios y el stock reales**
   desde Firestore (no se confía en la caché del celular), se guarda el
   pedido y llega un WhatsApp al administrador (si está configurado).

### Rendimiento en conexiones lentas

Pensado para celulares con internet lento:

- **Sin Bootstrap ni fuentes de iconos** (ahorra ~300 KB frente a otras tiendas).
- Los productos se **guardan en caché** en el propio celular: el catálogo
  aparece al instante en visitas siguientes, incluso sin buena señal.
- Imágenes con **carga diferida** (`loading="lazy"`) y tamaño fijo.
- Avisos tipo *toast* en lugar de `alert()` (no bloquean el navegador).
- El carrito funciona **sin internet** (se guarda en el celular).

---

## Panel de administración

Entra por `admin/login.html` con el usuario que creaste en
**Firebase Authentication > Users**. Desde ahí puedes:

- Dar de alta productos con foto, categoría, precio, stock y descripción.
- Crear categorías nuevas escribiéndolas con el teclado (el campo
  **Categoría** no está limitado a una lista fija) y administrarlas desde
  el gestor de **Categorías**: renombrar (actualiza todos sus productos) o
  eliminar (sus productos pasan a la categoría que elijas). No hace falta
  crear ninguna colección nueva en Firestore.
- Ver el inventario y ajustar cantidades.
- Ver y actualizar el estado de cada pedido. Los estados son:
  **Pendiente** (sin comenzar) → **Trabajado** (en proceso) →
  **Entregado** (completado), y **Cancelado** (anulado).
- Ver los clientes registrados con su **correo y teléfono** (el teléfono
  se guarda solo cuando el cliente hace su primer pedido).

---

## Seguridad

Las reglas de Firestore deben impedir que extraños lean los pedidos y
los datos de los clientes. En **`GUIA_FIREBASE.md`**, sección
*Seguridad*, están las reglas listas para pegar (solo el administrador
escribe productos y lee pedidos; cualquiera puede leer el catálogo y
crear un pedido).

Con esas reglas activas, el descuento de stock desde el navegador deja
de funcionar (no es seguro permitirlo), así que hay que borrar el bloque
*"2. Descontar inventario"* de `js/checkout.js` y ajustar el stock desde
el panel.
