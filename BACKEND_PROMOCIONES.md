# Cómo solucionar el error al crear/actualizar promociones (backend)

La app envía estos datos. El backend (premioclick.cl) debe aceptarlos y no devolver 500.

---

## Crear promoción (POST `/api/promociones`)

**Body que envía la app:**
```json
{
  "sorteo_id": 3,
  "cantidad_tickets": 5,
  "precio": 4000,
  "precio_total": "4000.00",
  "descripcion": ""
}
```

**Qué revisar en el backend:**
- Asegurarse de que la ruta POST exista y reciba este body.
- Si la tabla tiene columna `precio_total`, usarla; si no, guardar `precio` y opcionalmente calcular `precio_total = precio`.
- No devolver 500 si `descripcion` viene vacía.
- Validar que `sorteo_id` exista y que `cantidad_tickets` y `precio` sean números válidos (> 0).

---

## Actualizar promoción (PUT `/api/promociones/{id}`)

**Body que envía la app:**
```json
{
  "cantidad_tickets": 5,
  "precio": 4000,
  "precio_total": "4000.00",
  "descripcion": "",
  "activa": 1,
  "descuento": "0.00"
}
```

**Qué revisar en el backend:**
- Asegurarse de que la ruta PUT reciba el body y actualice solo los campos enviados.
- Si la tabla no tiene `descuento` o `activa`, ignorar esos campos en lugar de fallar.
- Guardar `precio` y/o `precio_total` según las columnas que tenga la tabla.

---

## Cómo encontrar el error en el backend

1. **Ver el error real:** En el servidor (PHP/Laravel/Node), revisar los logs cuando la app hace POST o PUT a promociones. Ahí suele salir la excepción (validación, SQL, tipo de dato).
2. **Probar con Postman/Insomnia:** Hacer un POST y un PUT con el mismo body que arriba y ver la respuesta y el log del servidor.
3. **Respuesta de error:** Si devuelves algo como `{ "error": "mensaje" }` o `{ "message": "..." }` en el cuerpo cuando hay error, la app podrá mostrarlo en pantalla.

Cuando tengas el mensaje de error exacto del backend (o el código de la ruta), se puede ajustar la validación o la base de datos para que deje de dar 500.
