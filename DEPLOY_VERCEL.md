# Guía: Desplegar la API de PremioClick en Vercel

Tu cliente quiere alojar la API en Vercel. Sigue estos pasos para que **premioclick.cl** (o la app móvil) use la API desde Vercel en lugar del servidor actual.

**En este mismo repo** tienes:
- **`vercel.json`** – cópialo a la raíz del proyecto de la API.
- **`server-vercel-patch.js`** – es el código que debes usar al final de tu `server.js` (reemplaza el bloque de “Inicializar servidor”).

---

## Requisitos previos

1. **Cuenta en Vercel** – [vercel.com](https://vercel.com) (gratis).
2. **Código del backend** – El que está en el servidor en `public_html/api` (server.js, routes/, config/, package.json, etc.). Descárgalo por **File Manager** de DirectAdmin o por **FTP**.
3. **Base de datos accesible desde internet** – En Vercel la API no está en el mismo servidor que la web. La base de datos debe ser accesible desde fuera (no solo `localhost`). Si tu MySQL está en el hosting actual, puede que no permita conexiones remotas; en ese caso tendrás que usar un MySQL en la nube (PlanetScale, Railway, etc.) o que el hosting habilite acceso remoto a la BD.

---

## Paso 1: Crear la carpeta del proyecto para Vercel

En tu PC, crea una carpeta nueva, por ejemplo:

- `premioclick-api`  
  o  
- `api-vercel`

No uses la carpeta de la app móvil (SorteosApp) para este proyecto; la API en Vercel es un proyecto aparte.

---

## Paso 2: Copiar el backend a esa carpeta

Copia **todo** el contenido de `public_html/api` del servidor (excepto `node_modules`) dentro de la carpeta que creaste:

- `server.js`
- `package.json`
- `package-lock.json` (si existe)
- Carpeta `routes/` (con todos los .js)
- Carpeta `config/`
- Carpeta `middleware/`
- **No copies** `node_modules` (en Vercel se instala solo).

Puedes descargar la carpeta `api` desde DirectAdmin (File Manager → comprimir → descargar) y luego extraer en tu carpeta local, borrando `node_modules` si vino incluido.

---

## Paso 3: Añadir el archivo de configuración de Vercel

En la **raíz** de la carpeta del proyecto (donde está `server.js`), crea un archivo llamado **`vercel.json`** con este contenido:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```

Así todas las peticiones (incluido `/api/sorteos`, `/api/auth`, etc.) las atiende tu Express.

---

## Paso 4: Modificar `server.js` para Vercel

Tu `server.js` ahora termina con algo como:

```js
initializeDatabase()
  .then(() => {
    server.listen(PORT, HOST, () => {
      console.log(`Servidor corriendo...`);
    });
  })
  .catch((error) => {
    console.error('Error al iniciar', error);
    process.exit(1);
  });
```

Tienes que hacer dos cosas:

1. **Exportar la app Express** para que Vercel la use (no el `http.Server`, sino `app`).
2. **Solo arrancar con `listen` cuando NO estés en Vercel.**

Sustituye el bloque de “Inicializar servidor” (desde `const PORT = ...` hasta el final del archivo) por esto:

```js
// Inicializar servidor
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// En Vercel: exportar la app para serverless. No hacer listen().
if (process.env.VERCEL) {
  initializeDatabase()
    .then(() => {
      console.log('Base de datos lista (Vercel)');
    })
    .catch((err) => {
      console.error('Error init DB en Vercel:', err);
    });
  module.exports = app;
} else {
  // Local o servidor normal: arrancar con listen
  initializeDatabase()
    .then(() => {
      server.listen(PORT, HOST, () => {
        console.log(`Servidor corriendo en puerto ${PORT}`);
        console.log(`API: http://localhost:${PORT}/api`);
      });
    })
    .catch((error) => {
      console.error('Error al iniciar el servidor:', error);
      process.exit(1);
    });
}
```

Guarda el archivo.

---

## Paso 5: Variables de entorno en Vercel

En Vercel las contraseñas y configuraciones no van en `.env` en el repo; se configuran en el panel.

1. Entra en [vercel.com](https://vercel.com) y abre tu proyecto (lo crearás en el paso 6).
2. Ve a **Settings** → **Environment Variables**.
3. Añade **las mismas variables** que usas ahora (las del panel de Node en DirectAdmin), por ejemplo:

| Name | Value |
|------|--------|
| `DB_HOST` | (IP o host de tu MySQL; si está en otro servidor, no uses `localhost`) |
| `DB_USER` | usuario de la BD |
| `DB_PASSWORD` | contraseña |
| `DB_NAME` | nombre de la BD |
| `DB_PORT` | 3306 |
| `DB_TYPE` | mysql |
| `JWT_SECRET` | tu secreto JWT |
| `PAYPAL_CLIENT_ID` | (tu valor) |
| `PAYPAL_CLIENT_SECRET` | (tu valor) |
| `PAYPAL_MODE` | live |
| `API_URL` | https://tu-proyecto.vercel.app (lo actualizas después del primer deploy) |

**Importante:** Si la base de datos sigue en el hosting actual, `DB_HOST` tiene que ser la IP o el dominio del servidor de la BD, no `localhost`, y el hosting debe permitir conexiones desde fuera (puerto 3306 o el que uses).

---

## Paso 6: Desplegar en Vercel

### Opción A: Desde la web (recomendado la primera vez)

1. Sube el proyecto a **GitHub** (crea un repo y haz push de la carpeta `premioclick-api`).
2. Entra en [vercel.com/new](https://vercel.com/new).
3. **Import** el repositorio de GitHub.
4. En “Root Directory” deja el directorio raíz del repo (donde está `server.js` y `vercel.json`).
5. **No** pongas “Build Command” ni “Output Directory”; con `vercel.json` es suficiente.
6. Añade las **Environment Variables** (Paso 5) antes de dar a Deploy.
7. Pulsa **Deploy**. Al terminar te dará una URL tipo:  
   `https://premioclick-api-xxx.vercel.app`

### Opción B: Desde la terminal (Vercel CLI)

1. Instala Vercel CLI:  
   `npm i -g vercel`
2. En la carpeta del proyecto (donde está `server.js`):  
   `vercel`
3. Sigue las preguntas (login, nombre del proyecto, etc.).
4. Añade las variables de entorno en el dashboard de Vercel (Settings → Environment Variables).
5. Para producción:  
   `vercel --prod`

---

## Paso 7: Probar la API

Abre en el navegador (cambia la URL por la que te dio Vercel):

- `https://tu-proyecto.vercel.app/api/health`
- `https://tu-proyecto.vercel.app/api/sorteos`

Si ves JSON (o `[]` en sorteos), la API está bien desplegada.

---

## Paso 8: Usar la API de Vercel en la app y en la web

Cuando la API responda bien en Vercel:

1. **App móvil (SorteosApp)**  
   En `services/api.ts` cambia la URL de producción a la de Vercel, por ejemplo:  
   `PRODUCTION_API_URL = 'https://tu-proyecto.vercel.app/api'`  
   (o usa la variable de entorno `EXPO_PUBLIC_API_URL` si ya la tienes).

2. **Web (premioclick.cl)**  
   En los archivos JS de la web (`script.js`, `detalle-sorteo.js`, etc.) donde se define `API_URL`, pon la URL de Vercel para producción, por ejemplo:  
   `https://tu-proyecto.vercel.app/api`

3. **Variables en Vercel**  
   Actualiza `API_URL` (y si usas `BACKEND_URL` / `FRONTEND_URL`) en Vercel con la URL final de la API y la de la web.

---

## Notas importantes

- **Socket.io / chat:** En Vercel la API corre en modo serverless (una petición = una ejecución). El chat en tiempo real (WebSockets) puede no funcionar igual. La parte REST (sorteos, auth, pagos, etc.) sí funciona.
- **Base de datos:** Tiene que ser accesible desde internet. Si el MySQL del hosting no acepta conexiones remotas, hay que migrar a un MySQL en la nube o habilitar acceso remoto con el soporte del hosting.
- **CORS:** Tu `server.js` ya usa `cors()`; si usas dominio propio (ej. `api.premioclick.cl`) en el futuro, en Vercel puedes configurar el dominio y, si hace falta, ajustar CORS.

Si en algún paso te sale un error (build, variables, o 404/500 al probar), dime en qué paso estás y el mensaje exacto y lo vemos.
