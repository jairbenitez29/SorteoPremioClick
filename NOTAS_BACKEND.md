# Notas para el backend

## 1. Precio unitario del ticket (precio_ticket)

La app envía **`precio_ticket`** al actualizar un sorteo (`PUT /api/sorteos/:id`) y espera recibirlo al cargar un sorteo (`GET /api/sorteos/:id`).

**Qué hacer:**
1. En la tabla **sorteos** (o equivalente), tener una columna **`precio_ticket`** (número, ej. 3000 para 3000 CLP).
2. En la ruta **PUT** que actualiza un sorteo, leer `precio_ticket` del body y guardarlo en la base de datos.
3. En la ruta **GET** que devuelve un sorteo por id, incluir **`precio_ticket`** en la respuesta (el valor guardado en la tabla).

Si no se guarda o no se devuelve `precio_ticket`, en otros teléfonos y en la web seguirá saliendo el precio viejo. **Guía con SQL y código listo para el servidor:** `BACKEND_PRECIO_TICKET.md`.

---

## 2. Límite de 1000 tickets por mes (quitar restricción)

El mensaje *"Solo se pueden crear hasta 1000 tickets por mes"* lo devuelve el **servidor** en la ruta de generación de tickets (por ejemplo `POST /api/tickets/generar/:sorteoId`).

**Qué hacer:**
1. En tu backend, abre el archivo de rutas de tickets (ej. `routes/tickets.js`).
2. Localiza la ruta POST que genera tickets (ej. `/generar/:sorteoId`).
3. **Elimina por completo** la validación que comprueba "1000 tickets por mes" (o el límite mensual).
4. Asegura que al generar nuevos tickets se tome el **último número de ticket** de ese sorteo y se siga desde ahí, para no duplicar números.

En este proyecto tienes un archivo de ejemplo: **`backend-tickets-generar-sin-limite.js`**. Ahí hay una función que genera tickets sin límite y continúa desde el último número del sorteo. Puedes copiar esa lógica a tu `routes/tickets.js` o reemplazar la ruta de generar por esa función.

La app solo envía `cantidad` y `precio`; no hace falta cambiar nada en el cliente.
