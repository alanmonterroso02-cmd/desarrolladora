# Guía: crear tu Firebase para la tienda

La tienda de la **Asociación Tecnológica Monterroso** usa **Firebase**
(gratis en el plan "Spark") para guardar productos, clientes y pedidos.

> ✅ **Este proyecto ya está conectado** al proyecto de Firebase
> `atmgt-5d3a9` (los datos reales están en
> `firebase/firebase-config.js`). Usa esta guía solo si quieres crear
> otro proyecto desde cero o revisar la configuración.

Tiempo estimado: **10–15 minutos**.

---

## 1. Crear el proyecto

1. Entra a <https://console.firebase.google.com/> con tu cuenta de Google.
2. Clic en **"Agregar proyecto"**.
3. Ponle un nombre, por ejemplo `monterroso-tienda`.
4. Puedes desactivar Google Analytics (no es necesario).
5. Espera a que se cree y entra al proyecto.

## 2. Registrar la app web

1. En la pantalla principal, clic en el ícono **`</>`** (Web).
2. Ponle un apodo, por ejemplo `monterroso-web`.
3. Firebase te mostrará un bloque `firebaseConfig = { ... }`.
4. Copia esos valores y pégalos en **`firebase/firebase-config.js`**
   (si creas un proyecto nuevo, reemplaza los valores actuales):

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "monterroso-tienda.firebaseapp.com",
  projectId: "monterroso-tienda",
  storageBucket: "monterroso-tienda.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};
```

## 3. Activar Firestore (base de datos)

1. Menú izquierdo: **Compilación > Firestore Database**.
2. Clic en **"Crear base de datos"**.
3. Ubicación: la más cercana (por ejemplo `us-central`).
4. Ubicación: la más cercana (por ejemplo `us-central`).
5. Ve a la pestaña **"Reglas"** y pega las reglas seguras de la sección
   [Seguridad](#seguridad-antes-de-producción) (más abajo).

> 🔴 **Nunca uses `allow read, write: if true`.** Esas reglas dejan toda
> tu base de datos abierta: cualquiera con la dirección del sitio puede
> leer (y borrar) productos, pedidos y datos de tus clientes, sin
> iniciar sesión. Si ya las tenías puestas, cámbialas **hoy mismo**.

## 4. Activar Authentication (logins)

1. Menú izquierdo: **Compilación > Authentication**.
2. Clic en **"Comenzar"**.
3. Pestaña **"Sign-in method"**, activa:
   - **Google** → para que los clientes inicien sesión (opcional).
     Te pedirá un correo de soporte: pon el tuyo.
   - **Correo electrónico/contraseña** → para el login del panel admin.
4. Pestaña **"Users"** → **"Agregar usuario"**: crea tu usuario y
   contraseña de administrador. Con esos datos entrarás a
   `admin/login.html`.
5. Pestaña **"Settings"** → **"Authorized domains"** (Dominios
   autorizados): agrega el dominio donde publicas el sitio, por ejemplo
   `alanmonterroso02-cmd.github.io`.

   > 🔴 **Sin este paso el login con Google falla** en el sitio
   > publicado, con el error *"This domain is not authorized for OAuth
   > operations"*. La tienda exige iniciar sesión con Google para
   > confirmar un pedido, así que si falta el dominio nadie podrá
   > comprar.

## 5. Colecciones (se crean solas)

No hay que crearlas a mano. El sitio usa:

| Colección | Qué guarda |
|---|---|
| `productos` | Cada producto del catálogo |
| `clientes` | Cada cliente que inició sesión con Google (nombre, correo y, al primer pedido, su teléfono) |
| `ventas` | Cada pedido hecho desde el checkout |

## 6. Probar

1. Abre el sitio en tu navegador (idealmente publicado, no en `file://`).
2. Entra a `admin/login.html` con tu usuario admin.
3. En **Productos**, agrega uno de prueba (con foto).
4. Ve a `pages/tienda.html`: el producto debe aparecer en el catálogo.
5. Agrégalo al carrito, finaliza el pedido y verifica:
   - Se creó el pedido en Firestore (`ventas`).
   - El stock del producto bajó (solo mientras las reglas sigan
     abiertas; con las reglas seguras el stock se ajusta desde el panel).
   - En la pantalla de agradecimiento aparece el botón
     *"Enviar mi pedido por WhatsApp"*, que abre WhatsApp con el
     resumen del pedido para que el cliente lo envíe desde su celular.

## 7. Pedidos por WhatsApp

El pedido se guarda en la colección `ventas` y se ve en el panel
(`admin/ventas.html`). Además, al terminar el checkout, el cliente
encuentra el botón **"Enviar mi pedido por WhatsApp"**: el mensaje
(nombre, teléfono, dirección, productos, notas y total) se abre en su
propio WhatsApp listo para enviarlo al número del negocio.

No hay avisos automáticos ni claves de terceros: el envío lo hace el
cliente desde su celular, así que no se expone ninguna clave en el sitio.

## 8. Publicar el sitio (gratis)

Como es HTML/CSS/JS puro, puedes subirlo a **GitHub Pages**,
**Netlify** o **Firebase Hosting**. Importante: el login con Google
**no funciona abriendo los archivos con doble clic** (`file://`), debe
estar publicado con `https://`.

---

## Seguridad (antes de producción)

Objetivo de las reglas:

- Que **solo el administrador** pueda crear/editar/borrar productos y
  leer los pedidos.
- Que **cualquiera** pueda **leer productos** y **crear pedidos**
  (así compran sin necesidad de cuenta).
- Que **cada cliente** solo pueda leer y escribir sus propios datos.

Estas reglas ya traen puesto el correo del administrador
(`asociacionmonterrosogt@gmail.com`); cámbialo ahí si usas otro. Pégalas en
**Firestore Database > Reglas > Publicar**:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function esAdmin() {
      return request.auth != null
             && request.auth.token.email in [
                  "asociacionmonterrosogt@gmail.com",
                  "alanmonterroso02@gmail.com"
                ];
    }

    // Productos: todos leen, solo el admin escribe
    match /productos/{id} {
      allow read: if true;
      allow write: if esAdmin();
    }

    // Ventas: cualquiera puede crear, solo el admin lee/edita
    match /ventas/{id} {
      allow create: if true;
      allow read, update, delete: if esAdmin();
    }

    // Clientes: cada uno su propio documento; el admin lee todo
    match /clientes/{uid} {
      allow read, write: if request.auth != null
             && (request.auth.uid == uid || esAdmin());
    }

    // Cualquier otra colección queda cerrada
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Efecto en la tienda (importante)

Con estas reglas, el cliente **ya no puede descontar el stock** al
comprar (no tiene permiso de escritura sobre `productos`). Por eso, en
`js/checkout.js`, dentro del bloque **"2. Descontar inventario"**, borra
ese `for` completo una vez aplicadas las reglas. El stock se ajusta
desde el panel de administración (Productos / Inventario).

El pedido se sigue guardando y el panel lo muestra igual.

### Otros pendientes de seguridad

- La configuración de Firebase (`apiKey`, etc.) **no es secreta**: lo
  que protege los datos son las reglas de arriba, no ocultar esos IDs.

