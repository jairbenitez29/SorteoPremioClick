# Solución: Error 404 - No se cargan sorteos / No inicia sesión

## Qué significa el error

Si en la app ves:
- **"Error al verificar token... Request failed with status code 404"**
- **"No se pudieron cargar los sorteos"**
- No puedes iniciar sesión ni registrarte

La app está llamando a **https://premioclick.cl/api** y el servidor responde **404** (ruta no encontrada). Es decir: la API no está disponible en esa URL o el servidor no está enviando las peticiones al backend Node.

---

## Qué debe responder el servidor

La app usa estas rutas (siempre con prefijo `/api`):

| Ruta que usa la app | Debe devolver |
|---------------------|----------------|
| `GET https://premioclick.cl/api/auth/verify` | 200 + JSON con usuario (o 401 si no hay token) |
| `POST https://premioclick.cl/api/auth/login` | 200 + token y usuario |
| `POST https://premioclick.cl/api/auth/register` | 201 + token y usuario |
| `GET https://premioclick.cl/api/sorteos` | 200 + array de sorteos (puede ser `[]`) |

Si alguna de estas URLs devuelve **404**, la app no podrá cargar sorteos ni hacer login/registro.

---

## Cómo comprobar desde el navegador o el móvil

1. Abre en el navegador (o en el móvil):  
   **https://premioclick.cl/api/sorteos**
2. Si ves **JSON** (aunque sea `[]`): la API está bien y el problema puede ser solo auth o red en la app.
3. Si ves **404** o una página de “no encontrado”: la API no está montada en `/api` o el proxy no está enviando las peticiones al Node.

---

## Qué revisar en el servidor (cPanel / Node)

### 1. Que la aplicación Node esté en ejecución

- En cPanel → **Setup Node.js App** (o similar): comprueba que la app esté **Running**.
- Si usas SSH: que el proceso de Node (o PM2) esté activo y escuchando en el puerto configurado.

### 2. Que el backend tenga las rutas bajo `/api`

En tu backend Express debe haber algo como:

```js
app.use('/api', apiRouter);   // o el router que agrupa auth, sorteos, etc.
```

Y dentro de ese router:

- Rutas de auth: `/api/auth/verify`, `/api/auth/login`, `/api/auth/register`
- Rutas de sorteos: `/api/sorteos`, `/api/sorteos/:id`
- etc.

Si tu backend no usa el prefijo `/api`, tienes dos opciones:

- **Opción A (recomendada):** En el backend, montar todo bajo `/api` (como arriba).
- **Opción B:** En la app, cambiar la URL de la API (ver sección siguiente).

### 3. Que el proxy envíe `/api` al Node

En cPanel, la “Application URL” o el proxy suele ser algo como:

- **URL de la aplicación:** `https://premioclick.cl`  
- **Subpath (si existe):** `/api` o el path que use tu app Node.

Tiene que coincidir con lo que la app usa: **https://premioclick.cl/api/...**

Si el proxy está configurado para otra ruta (por ejemplo solo `https://premioclick.cl` sin `/api`), las peticiones a `https://premioclick.cl/api/sorteos` no llegarán al Node y darán 404.

---

## Si tu API está en otra URL (sin `/api` o en otro dominio)

Puedes decirle a la app qué URL usar:

1. Crea o edita el archivo **`.env`** en la raíz del proyecto (junto a `app.json` / `package.json`).
2. Añade (ajusta la URL a la que realmente responde tu backend):

```env
EXPO_PUBLIC_API_URL=https://premioclick.cl/api
```

Si tu backend responde en **https://premioclick.cl** (sin `/api`), pon:

```env
EXPO_PUBLIC_API_URL=https://premioclick.cl
```

3. Reinicia Expo y vuelve a abrir la app (`npx expo start --clear`).

La app ya está preparada para usar `EXPO_PUBLIC_API_URL` si existe; si no, usa por defecto `https://premioclick.cl/api`.

---

## Resumen

- **404** = la app llama a **premioclick.cl/api** y esa ruta no existe o no llega al Node.
- Comprueba en el navegador: **https://premioclick.cl/api/sorteos** (debe devolver JSON, no 404).
- En el servidor: Node en marcha, rutas montadas en `/api` y proxy apuntando a ese path.
- Si tu API está en otra URL, configura `EXPO_PUBLIC_API_URL` en `.env` y reinicia la app.
