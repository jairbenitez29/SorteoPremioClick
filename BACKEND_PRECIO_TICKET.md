# Backend: guardar y devolver precio unitario del ticket

Para que el **precio unitario** que el admin edita se vea **en todos lados** (app en cualquier teléfono, web, otros usuarios), el servidor debe **guardar** `precio_ticket` al actualizar un sorteo y **devolverlo** cuando se pide un sorteo (GET).

---

## 1. Base de datos: añadir columna en `sorteos`

En tu base de datos (MySQL/MariaDB), ejecuta:

```sql
ALTER TABLE sorteos ADD COLUMN precio_ticket DECIMAL(10,2) NULL;
```

- Si la tabla se llama distinto (ej. `raffles`), cambia `sorteos` por el nombre correcto.
- Si ya existe la columna, no hace falta volver a ejecutar.

(Opcional) Rellenar con el precio del primer ticket para sorteos que ya existan:

```sql
UPDATE sorteos s
SET s.precio_ticket = (
  SELECT t.precio FROM tickets t WHERE t.sorteo_id = s.id ORDER BY t.id LIMIT 1
)
WHERE s.precio_ticket IS NULL;
```

---

## 2. PUT /api/sorteos/:id — guardar `precio_ticket`

En el archivo donde actualizas el sorteo (ej. `routes/sorteos.js`), en la ruta **PUT** que hace el `UPDATE` a la tabla de sorteos:

1. Lee `precio_ticket` del body: `req.body.precio_ticket`.
2. Inclúyelo en el `UPDATE`.

**Ejemplo** (Node/Express + MySQL):

```javascript
// Dentro de tu ruta PUT /sorteos/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titulo,
      descripcion,
      fecha_sorteo,
      estado,
      link,
      imagen_portada,
      imagenes,
      productos,
      precio_ticket   // <-- leer del body
    } = req.body;

    // Construir UPDATE incluyendo precio_ticket
    const updates = [];
    const values = [];

    if (titulo !== undefined) { updates.push('titulo = ?'); values.push(titulo); }
    if (descripcion !== undefined) { updates.push('descripcion = ?'); values.push(descripcion); }
    if (fecha_sorteo !== undefined) { updates.push('fecha_sorteo = ?'); values.push(fecha_sorteo); }
    if (estado !== undefined) { updates.push('estado = ?'); values.push(estado); }
    if (link !== undefined) { updates.push('link = ?'); values.push(link); }
    if (imagen_portada !== undefined) { updates.push('imagen_portada = ?'); values.push(imagen_portada); }
    if (imagenes !== undefined) { updates.push('imagenes = ?'); values.push(typeof imagenes === 'string' ? imagenes : JSON.stringify(imagenes)); }
    if (productos !== undefined) { updates.push('productos = ?'); values.push(typeof productos === 'string' ? productos : JSON.stringify(productos)); }

    // Importante: guardar precio_ticket
    if (precio_ticket !== undefined && precio_ticket !== null) {
      updates.push('precio_ticket = ?');
      values.push(parseFloat(precio_ticket));
    } else {
      updates.push('precio_ticket = ?');
      values.push(null);
    }

    values.push(id);
    await pool.execute(
      `UPDATE sorteos SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Opcional: devolver el sorteo actualizado
    const [rows] = await pool.execute('SELECT * FROM sorteos WHERE id = ?', [id]);
    return res.json(rows[0] || {});
  } catch (error) {
    console.error('Error al actualizar sorteo:', error);
    return res.status(500).json({ error: 'Error al actualizar sorteo' });
  }
});
```

Lo esencial: en el `UPDATE` debe aparecer **`precio_ticket`** y tomar el valor de `req.body.precio_ticket`.

---

## 3. GET /api/sorteos y GET /api/sorteos/:id — devolver `precio_ticket`

En las rutas que devuelven uno o varios sorteos, la respuesta debe incluir la columna `precio_ticket`.

- Si usas `SELECT * FROM sorteos`, ya se incluirá al tener la columna en la tabla.
- Si usas `SELECT` con columnas fijas, añade `precio_ticket`:

```sql
SELECT id, titulo, descripcion, fecha_sorteo, estado, link, imagen_portada, imagenes, productos, precio_ticket
FROM sorteos
WHERE id = ?
```

Y en el JSON que envías al cliente, que no se elimine ni se renombre ese campo (debe llegar como `precio_ticket`).

---

## 4. Comprobar que funciona

1. En la **app (admin)** edita un sorteo y cambia el “Precio unitario del ticket”. Guarda.
2. En la **API** (Postman o navegador):
   - `GET https://tu-dominio.com/api/sorteos/1` (o el id del sorteo).
   - La respuesta debe llevar `"precio_ticket": 3000` (o el valor que hayas puesto).
3. Abre ese mismo sorteo en la **app como usuario** o en **otro teléfono**: debe verse el precio nuevo.
4. En la **web**, si usa el mismo `GET /api/sorteos` o `GET /api/sorteos/:id`, también debe mostrarse el precio actualizado.

---

## Resumen

| Dónde              | Qué hacer |
|--------------------|-----------|
| Base de datos      | `ALTER TABLE sorteos ADD COLUMN precio_ticket DECIMAL(10,2) NULL;` |
| PUT /api/sorteos/:id | Leer `req.body.precio_ticket` y guardarlo en `sorteos.precio_ticket` |
| GET /api/sorteos   | Incluir `precio_ticket` en el SELECT / en el JSON |
| GET /api/sorteos/:id | Incluir `precio_ticket` en el SELECT / en el JSON |

Cuando el servidor haga esto, el precio unitario se actualizará en todo: app (cualquier usuario y dispositivo) y web.
