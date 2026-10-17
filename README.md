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
  firebase-config.js           → Configuración de Firebase (¡edítalo!)

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

1. Sigue **`GUIA_FIREBASE.md`** para crear tu proyecto de Firebase y
   pegar los datos en `firebase/firebase-config.js`.
   **La tienda no funciona hasta que lo hagas.**
2. Cambia el número de WhatsApp en `js/notificar-whatsapp.js`
   (avisos automáticos) y revisa el número de contacto en `index.html`.
3. Sube tus productos desde `admin/login.html`.

---

## Cómo funciona la tienda

1. El cliente entra a `pages/tienda.html` y ve el catálogo por categorías.
2. Agrega productos al carrito (no necesita iniciar sesión).
3. En **Finalizar pedido** llena sus datos y, si lo desea, un campo de
   **notas de personalización**.
4. Al confirmar: se guarda el pedido, se descuenta el stock y llega un
   WhatsApp al administrador.

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
- Ver el inventario y ajustar cantidades.
- Ver y actualizar el estado de cada pedido. Los estados son:
  **Pendiente** (sin comenzar) → **Trabajado** (en proceso) →
  **Entregado** (completado), y **Cancelado** (anulado).
- Ver los clientes registrados.

---

## Seguridad

Las reglas de Firestore de la guía son **abiertas** para pruebas.
Antes de usarla con clientes reales hay que restringirlas
(ver la sección "Seguridad" de `GUIA_FIREBASE.md`).
