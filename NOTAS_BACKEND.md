# Notas para el backend

## 1. Límite de 1000 tickets por mes (quitar restricción)

El mensaje *"Solo se pueden crear hasta 1000 tickets por mes"* lo devuelve el **servidor** en la ruta de generación de tickets (por ejemplo `POST /api/tickets/generar/:sorteoId`).

**Qué hacer:**
1. En tu backend, abre el archivo de rutas de tickets (ej. `routes/tickets.js`).
2. Localiza la ruta POST que genera tickets (ej. `/generar/:sorteoId`).
3. **Elimina por completo** la validación que comprueba "1000 tickets por mes" (o el límite mensual).
4. Asegura que al generar nuevos tickets se tome el **último número de ticket** de ese sorteo y se siga desde ahí, para no duplicar números.

En este proyecto tienes un archivo de ejemplo: **`backend-tickets-generar-sin-limite.js`**. Ahí hay una función que genera tickets sin límite y continúa desde el último número del sorteo. Puedes copiar esa lógica a tu `routes/tickets.js` o reemplazar la ruta de generar por esa función.

La app solo envía `cantidad` y `precio`; no hace falta cambiar nada en el cliente.
