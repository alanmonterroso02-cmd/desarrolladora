# Guía: crear tu Firebase para la tienda

La tienda de la **Asociación Tecnológica Monterroso** usa **Firebase**
(gratis en el plan "Spark") para guardar productos, clientes y pedidos.

> ⚠️ **La tienda no mostrará productos hasta que completes esta guía**,
> porque `firebase/firebase-config.js` trae valores de ejemplo.

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
4. Copia esos valores y pégalos en **`firebase/firebase-config.js`**,
   reemplazando los `TU_...`:

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
4. Empieza en **modo de prueba**.
5. Ve a la pestaña **"Reglas"** y pega esto:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ Estas reglas permiten que **cualquiera** lea y escriba. Sirven para
> probar, pero **no son seguras para producción**. Antes de usarla con
> clientes reales hay que restringirlas (pídele ayuda a tu desarrollador
> o revisa la sección "Seguridad" más abajo).

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

## 5. Colecciones (se crean solas)

No hay que crearlas a mano. El sitio usa:

| Colección | Qué guarda |
|---|---|
| `productos` | Cada producto del catálogo |
| `clientes` | Cada cliente que inició sesión con Google |
| `ventas` | Cada pedido hecho desde el checkout |

## 6. Probar

1. Abre el sitio en tu navegador (idealmente publicado, no en `file://`).
2. Entra a `admin/login.html` con tu usuario admin.
3. En **Productos**, agrega uno de prueba (con foto).
4. Ve a `pages/tienda.html`: el producto debe aparecer en el catálogo.
5. Agrégalo al carrito, finaliza el pedido y verifica:
   - Se creó el pedido en Firestore (`ventas`).
   - El stock del producto bajó.
   - Te llegó el aviso de WhatsApp (si configuraste
     `js/notificar-whatsapp.js`).

## 7. Avisos por WhatsApp (opcional)

Para recibir un WhatsApp automático con cada pedido:

1. Agrega el número **+34 644 51 95 23** a tus contactos.
2. Envíale el mensaje exacto:
   `I allow callmebot to send me messages`
3. Recibirás tu **APIKEY** por WhatsApp.
4. Pégala en **`js/notificar-whatsapp.js`**, en `DESTINATARIOS`.

## 8. Publicar el sitio (gratis)

Como es HTML/CSS/JS puro, puedes subirlo a **GitHub Pages**,
**Netlify** o **Firebase Hosting**. Importante: el login con Google
**no funciona abriendo los archivos con doble clic** (`file://`), debe
estar publicado con `https://`.

---

## Seguridad (antes de producción)

Las reglas del paso 3 son abiertas. Para proteger el sitio, lo ideal es:

- Que **solo el administrador** pueda crear/editar/borrar productos.
- Que **cada cliente** solo pueda leer sus propios datos.
- Que cualquiera pueda **leer productos** y **crear pedidos**.

Ejemplo de reglas más seguras (ajústalas a tu caso):

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Productos: todos leen, solo el admin escribe
    match /productos/{id} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.token.email == "TU_CORREO_ADMIN@gmail.com";
    }

    // Ventas: cualquiera puede crear, solo el admin lee/edita
    match /ventas/{id} {
      allow create: if true;
      allow read, update, delete: if request.auth != null
                   && request.auth.token.email == "TU_CORREO_ADMIN@gmail.com";
    }

    // Clientes: cada uno su propio documento; el admin lee todo
    match /clientes/{uid} {
      allow read, write: if request.auth != null
                   && (request.auth.uid == uid
                       || request.auth.token.email == "TU_CORREO_ADMIN@gmail.com");
    }
  }
}
```
