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
  checkout.js                  → Guarda el pedido en el panel y arma el WhatsApp
  auth-cliente.js              → Login con Google (opcional)
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
3. Sube tus productos desde `admin/login.html`.

---

## Cómo funciona la tienda

1. El cliente entra a `pages/tienda.html` y ve el catálogo por categorías.
2. Agrega productos al carrito (no necesita iniciar sesión para esto).
3. En **Finalizar pedido** debe **iniciar sesión con Google** — si no,
   el botón *Confirmar pedido* queda bloqueado. Sus datos de contacto se
   rellenan solos y el pedido queda asociado a su correo.
4. Al confirmar: se vuelven a leer los **precios y el stock reales**
   desde Firestore (no se confía en la caché del celular) y el pedido
   queda guardado en el panel de administración. En la pantalla de
   agradecimiento el cliente puede **enviar su pedido por WhatsApp**
   desde su propio celular con un botón, para agilizar la confirmación.
   No se envía ningún aviso automático ni se descuenta stock.

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

---

## Ampliaciones (2026)

Se agregaron servicios, precios y una demo **sin cambiar** el estilo ni
la estructura existente:

```
js/paquetes.js                  → ARCHIVO ÚNICO de precios (editar aquí)
pages/servicios/
  catalogo-whatsapp.html        → Catálogo con pedidos por WhatsApp
  citas-reservas.html           → Sistema de citas y reservas
  inventario-ventas.html        → Inventario y ventas
  menu-qr.html                  → Menú digital con QR
pages/demo-catalogo.html        → Catálogo de ejemplo (negocio ficticio)
js/demo-catalogo.js             → Productos y lógica de la demo
pages/productos/marcador-cancha.html
                                → Marcador y temporizador inalámbrico
```

### Precios

Todos los paquetes y sus valores están en **`js/paquetes.js`**. Para
cambiar un precio, un texto o el orden de las tarjetas, edita solo ese
archivo: la sección "Paquetes y precios" del inicio se arma sola.

### Pedido por WhatsApp

- Al terminar el pedido en **`tienda/checkout.html`**, la pantalla de
  agradecimiento muestra el botón *"Enviar mi pedido por WhatsApp"*: el
  mensaje (nombre, teléfono, dirección, productos, notas y total) sale
  desde el celular del cliente hacia el WhatsApp del negocio. Antes de
  eso, el pedido ya quedó guardado en el panel de administración.
- En **`tienda/carrito.html`** hay un botón *"Enviar pedido por WhatsApp"*
  que arma el mensaje con los productos, cantidades, subtotales y total.
  El nombre del cliente es opcional.
- En **`pages/demo-catalogo.html`** el pedido de ejemplo también se envía
  por WhatsApp (lleva la nota de que es una demostración).
- El **botón flotante de WhatsApp** aparece en todas las páginas públicas.

### Pendiente de completar

- Fotos reales para la demo y para el marcador (hoy son marcadores de
  posición con emoji).
- Video real del marcador en `pages/productos/marcador-cancha.html`
  (reemplazar el recuadro "Video próximamente").
- Revisar los textos genéricos del marcador y los tiempos de entrega de
  cada servicio.

---

## Despliegue en Cloudflare Pages

El sitio se movió de Vercel a **Cloudflare Pages** porque el plan gratuito
de Cloudflare sí permite uso comercial (Vercel Hobby es solo personal).

### Estado actual

- **Sitio publicado:** <https://asociacion-monterroso.pages.dev>
- **Proyecto en Cloudflare:** `asociacion-monterroso`
- **Cuenta:** asociacionmonterrosogt@gmail.com
- **Rama de producción:** `main`

La primera publicación ya se hizo desde esta computadora con Wrangler.
Para subir cambios nuevos hay dos caminos: la Opción A (automática, hay
que activarla una sola vez) o la Opción B (manual, ya funciona hoy).

### Opción A: conexión con GitHub (recomendada, pendiente de activar)

1. Entra a <https://dash.cloudflare.com> → **Workers & Pages** → **Create**
   → **Pages** → **Connect to Git**.
2. Autoriza GitHub y elige el repositorio
   `alanmonterroso02-cmd/desarrolladora`, rama `main`.
3. Configura:
   - **Framework preset:** None
   - **Build command:** (vacío)
   - **Build output directory:** `/`
4. Guarda y despliega. Cada `git push` a `main` publica solo.

### Opción B: desde la computadora (Wrangler)

El proyecto ya está creado, así que para publicar cambios basta con:

```bash
npx wrangler login
npx wrangler pages deploy . --project-name=asociacion-monterroso --branch=main
```

Nota: en la primera creación del proyecto hubo que usar `--force`, porque
la versión nueva de Wrangler intenta delegar a Workers. Para publicar
normalmente **no** se usa `--force`.

### Importante después de migrar

1. **Firebase Authentication → Settings → Authorized domains:** agrega el
   dominio nuevo (`asociacion-monterroso.pages.dev` y, si usas dominio
   propio, ese también). Sin esto, el login con Google falla con
   `auth/unauthorized-domain`.
2. **Reglas de Firestore:** antes de vender de verdad, aplica las reglas
   seguras de `GUIA_FIREBASE.md`.
3. **Dominio propio:** en Cloudflare Pages → **Custom domains** → agrega
   tu dominio y sigue el DNS que te indique.
4. Cuando todo funcione, desconecta el proyecto de Vercel para no
   mantener dos despliegues.

### Archivos de configuración

- `_headers`: cabeceras de seguridad y caché para Cloudflare Pages.
- `wrangler.jsonc`: nombre del proyecto y carpeta publicada (la raíz).

### Detalle de las URLs

Cloudflare Pages quita el `.html` de las direcciones (URLs limpias):

- `/pages/demo-catalogo.html` redirige a `/pages/demo-catalogo`
- `/tienda/carrito.html` redirige a `/tienda/carrito`

Los enlaces internos del sitio siguen usando `.html` y funcionan igual,
porque la redirección es automática. Si compartes un enlace, es mejor
usar la versión sin `.html`.

