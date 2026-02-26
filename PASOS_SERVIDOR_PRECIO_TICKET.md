# Pasos en el servidor (premioclick) — precio unitario del ticket

Todo está en el servidor; la base de datos la reinicias/administras desde la terminal del PC. Sigue estos pasos en orden.

---

## Paso 1: Base de datos (desde la terminal del PC)

Conéctate al servidor como siempre y entra a MySQL/MariaDB (o ejecuta el SQL desde tu cliente).

**1.1** Añadir la columna en la tabla `sorteos`:

```sql
ALTER TABLE sorteos ADD COLUMN precio_ticket DECIMAL(10,2) NULL;
```

Si sale error tipo "column already exists", la columna ya está; sigue al Paso 2.

**1.2** (Opcional) Rellenar precio para sorteos que ya existan, usando el precio del primer ticket:

```sql
UPDATE sorteos s
SET s.precio_ticket = (
  SELECT t.precio FROM tickets t WHERE t.sorteo_id = s.id ORDER BY t.id LIMIT 1
)
WHERE s.precio_ticket IS NULL;
```

---

## Paso 2: Archivos del backend (cPanel → Administrador de archivos)

En **Administrador de archivos** estás en `/home/premioclick`. El backend de la API suele estar en algo como:

- `public_html/api/`  
- `public_html/` (y dentro una carpeta tipo `api`, `backend`, `node`)  
- o `nodevenv` si usas Node en el servidor  

**2.1** Localiza el archivo donde se actualiza el sorteo (ruta PUT). Suele llamarse:

- `routes/sorteos.js`  
- o `sorteos.js` dentro de una carpeta `routes` o `api`  

**2.2** En la ruta **PUT** (actualizar sorteo por id):

- Añade en el destructuring del `req.body`: **`precio_ticket`**  
- En el `UPDATE` a la tabla `sorteos`, incluye la columna **`precio_ticket`** y asígnale el valor que venga en `req.body.precio_ticket` (por ejemplo `parseFloat(req.body.precio_ticket)` o `null` si no viene).  

Si tu UPDATE ya usa una lista de columnas, añade algo como:

```javascript
if (precio_ticket !== undefined && precio_ticket !== null) {
  updates.push('precio_ticket = ?');
  values.push(parseFloat(precio_ticket));
} else {
  updates.push('precio_ticket = ?');
  values.push(null);
}
```

(y asegúrate de leer `precio_ticket` del `req.body` al inicio de la ruta).

**2.3** En las rutas **GET** que devuelven sorteos (lista o por id):

- Si usas `SELECT * FROM sorteos`, no hace falta cambiar nada; al tener la columna `precio_ticket` en la tabla, ya se devolverá.  
- Si usas `SELECT` con columnas listadas a mano, añade **`precio_ticket`** en esa lista para que el JSON de respuesta incluya el precio.

---

## Paso 3: Reiniciar / recargar (si aplica)

- Si la API corre con **Node** (PM2, nodevenv, etc.), reinicia el proceso después de guardar los archivos.  
- Si usas PHP o el servidor recarga solo, con guardar los archivos suele bastar.

---

## Paso 4: Probar

1. En la **app (admin)** edita un sorteo y cambia el "Precio unitario del ticket". Guarda.  
2. Abre en el navegador o en Postman:  
   `https://premioclick.cl/api/sorteos/1`  
   (cambia `1` por el id del sorteo).  
3. En la respuesta JSON debe aparecer **`"precio_ticket": 3000`** (o el valor que pusiste).  
4. Entra como **usuario** en la app o en **otro teléfono** y en la **web**: debe mostrarse el precio nuevo.

---

**Código de ejemplo completo** para PUT y GET: ver **`BACKEND_PRECIO_TICKET.md`** en este mismo proyecto.
