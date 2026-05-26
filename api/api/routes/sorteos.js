const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Obtener todos los sorteos
router.get('/', async (req, res) => {
  try {
    const { DB_TYPE } = require('../config/database');

    let sorteos;

    if (DB_TYPE === 'postgres') {
      let queryWithPortada = `
        SELECT s.id, s.titulo, s.descripcion, s.fecha_sorteo, s.estado,
               s.created_by, s.created_at, s.updated_at, s.imagenes,
               s.imagen_portada,
               s.link,
               s.precio_ticket,
               COUNT(DISTINCT t.id) as total_tickets,
               COUNT(DISTINCT CASE WHEN t.estado = 'vendido' THEN t.id END) as tickets_vendidos,
               COUNT(DISTINCT p.id) as total_productos
        FROM sorteos s
        LEFT JOIN tickets t ON s.id = t.sorteo_id
        LEFT JOIN productos p ON s.id = p.sorteo_id
        GROUP BY s.id, s.titulo, s.descripcion, s.fecha_sorteo, s.estado,
                 s.created_by, s.created_at, s.updated_at, s.imagenes, s.imagen_portada, s.link, s.precio_ticket
        ORDER BY s.fecha_sorteo DESC
      `;

      try {
        const result = await pool.execute(queryWithPortada, []);
        sorteos = result[0];
      } catch (error) {
        const queryWithoutPortada = `
          SELECT s.id, s.titulo, s.descripcion, s.fecha_sorteo, s.estado,
                 s.created_by, s.created_at, s.updated_at, s.imagenes, s.link,
                 s.precio_ticket,
                 COUNT(DISTINCT t.id) as total_tickets,
                 COUNT(DISTINCT CASE WHEN t.estado = 'vendido' THEN t.id END) as tickets_vendidos,
                 COUNT(DISTINCT p.id) as total_productos
          FROM sorteos s
          LEFT JOIN tickets t ON s.id = t.sorteo_id
          LEFT JOIN productos p ON s.id = p.sorteo_id
          GROUP BY s.id, s.titulo, s.descripcion, s.fecha_sorteo, s.estado,
                   s.created_by, s.created_at, s.updated_at, s.imagenes, s.link, s.precio_ticket
          ORDER BY s.fecha_sorteo DESC
        `;

        try {
          const result = await pool.execute(queryWithoutPortada, []);
          sorteos = result[0];

          if (sorteos && sorteos.length > 0) {
            const sorteoIds = sorteos.map(s => s.id);
            try {
              const [portadasResult] = await pool.execute(
                `SELECT id, imagen_portada FROM sorteos WHERE id IN (${sorteos.map(() => '?').join(',')})`,
                sorteoIds
              );

              const portadasMap = {};
              portadasResult.forEach(row => {
                portadasMap[row.id] = row.imagen_portada;
              });

              sorteos.forEach(sorteo => {
                sorteo.imagen_portada = portadasMap[sorteo.id] || null;
              });
            } catch (portadaError) {
              console.error('Error al obtener imagen_portada:', portadaError);
              sorteos.forEach(s => { s.imagen_portada = null; });
            }
          }
        } catch (error2) {
          throw error2;
        }
      }
    } else {
      const query = `
        SELECT s.*,
               COUNT(DISTINCT t.id) as total_tickets,
               COUNT(DISTINCT CASE WHEN t.estado = 'vendido' THEN t.id END) as tickets_vendidos,
               COUNT(DISTINCT p.id) as total_productos
        FROM sorteos s
        LEFT JOIN tickets t ON s.id = t.sorteo_id
        LEFT JOIN productos p ON s.id = p.sorteo_id
        GROUP BY s.id
        ORDER BY s.fecha_sorteo DESC
      `;
      const result = await pool.execute(query, []);
      sorteos = result[0];
    }

    sorteos = Array.isArray(sorteos) ? sorteos.map((s) => ({ ...s })) : [];

    let productosBySorteo = {};
    if (sorteos.length > 0) {
      const sorteoIds = sorteos.map(s => s.id);
      try {
        const { DB_TYPE: dbType } = require('../config/database');
        let allProductosRaw;
        if (dbType === 'postgres') {
          const placeholders = sorteoIds.map((_, i) => `$${i + 1}`).join(', ');
          const result = await pool.query(
            `SELECT * FROM productos WHERE sorteo_id IN (${placeholders}) ORDER BY posicion_premio`,
            sorteoIds
          );
          allProductosRaw = result.rows;
        } else {
          const [rows] = await pool.query(
            `SELECT * FROM productos WHERE sorteo_id IN (?) ORDER BY posicion_premio`,
            [sorteoIds]
          );
          allProductosRaw = rows;
        }

        allProductosRaw.forEach(p => {
          if (!productosBySorteo[p.sorteo_id]) {
            productosBySorteo[p.sorteo_id] = [];
          }
          productosBySorteo[p.sorteo_id].push({ ...p });
        });
      } catch (e) {
        console.error('Error al obtener todos los productos:', e);
      }
    }

    for (let sorteo of sorteos) {
      const productosRaw = productosBySorteo[sorteo.id] || [];

      const productos = Array.isArray(productosRaw) ? productosRaw.map((p) => ({ ...p })) : [];

      sorteo.productos = productos.map(producto => {
        if (producto.imagenes) {
          try {
            if (typeof producto.imagenes === 'string') {
              producto.imagenes = JSON.parse(producto.imagenes);
            } else if (!Array.isArray(producto.imagenes)) {
              producto.imagenes = [];
            }
          } catch (e) {
            console.error('Error al parsear imágenes del producto:', e);
            producto.imagenes = [];
          }
        } else {
          producto.imagenes = [];
        }
        return producto;
      });

      if (sorteo.imagenes) {
        try {
          if (typeof sorteo.imagenes === 'string') {
            const parsed = JSON.parse(sorteo.imagenes);
            sorteo.imagenes = Array.isArray(parsed) ? parsed : [];
          } else if (!Array.isArray(sorteo.imagenes)) {
            sorteo.imagenes = [];
          }
        } catch (e) {
          console.error('Error al parsear imágenes:', e);
          sorteo.imagenes = [];
        }
      } else {
        sorteo.imagenes = [];
      }
    }

    res.json(sorteos);
  } catch (error) {
    console.error('Error al obtener sorteos:', error);
    res.status(500).json({
      error: 'Error al obtener sorteos',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Obtener un sorteo por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [sorteos] = await pool.execute(
      'SELECT * FROM sorteos WHERE id = ?',
      [id]
    );

    if (sorteos.length === 0) {
      return res.status(404).json({ error: 'Sorteo no encontrado' });
    }

    const sorteo = sorteos[0];

    let [tickets] = await pool.execute(
      'SELECT precio FROM tickets WHERE sorteo_id = ? AND estado = ? LIMIT 1',
      [id, 'disponible']
    );

    if (tickets.length === 0) {
      [tickets] = await pool.execute(
        'SELECT precio FROM tickets WHERE sorteo_id = ? LIMIT 1',
        [id]
      );
    }

    // Usar precio_ticket guardado en el sorteo; si no hay, usar precio del primer ticket
    const precioFromDb = sorteo.precio_ticket != null && !isNaN(parseFloat(sorteo.precio_ticket)) && parseFloat(sorteo.precio_ticket) > 0
      ? parseFloat(sorteo.precio_ticket)
      : null;
    if (precioFromDb != null) {
      sorteo.precio_ticket = precioFromDb;
    } else if (tickets.length > 0 && tickets[0].precio) {
      sorteo.precio_ticket = parseFloat(tickets[0].precio);
    } else {
      sorteo.precio_ticket = 0;
    }

    const [productos] = await pool.execute(
      'SELECT * FROM productos WHERE sorteo_id = ? ORDER BY posicion_premio',
      [id]
    );

    sorteo.productos = productos.map((producto) => {
      if (producto.imagenes) {
        try {
          if (typeof producto.imagenes === 'string') {
            producto.imagenes = JSON.parse(producto.imagenes);
          } else if (!Array.isArray(producto.imagenes)) {
            producto.imagenes = [];
          }
        } catch (e) {
          console.error('Error al parsear imágenes del producto:', e);
          producto.imagenes = [];
        }
      } else {
        producto.imagenes = [];
      }
      return producto;
    });

    const [promociones] = await pool.execute(
      'SELECT * FROM promociones WHERE sorteo_id = ? AND activa = TRUE ORDER BY cantidad_tickets ASC',
      [id]
    );
    sorteo.promociones = promociones.map((promo) => ({
      ...promo,
      precio: promo.precio_total || promo.precio,
    }));

    if (sorteo.imagenes) {
      try {
        if (typeof sorteo.imagenes === 'string') {
          const parsed = JSON.parse(sorteo.imagenes);
          sorteo.imagenes = Array.isArray(parsed) ? parsed : [];
        } else if (!Array.isArray(sorteo.imagenes)) {
          sorteo.imagenes = [];
        }
      } catch (e) {
        console.error('Error al parsear imágenes:', e);
        sorteo.imagenes = [];
      }
    } else {
      sorteo.imagenes = [];
    }

    const [stats] = await pool.execute(`
      SELECT
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN estado = 'vendido' THEN 1 END) as tickets_vendidos,
        COUNT(CASE WHEN estado = 'disponible' THEN 1 END) as tickets_disponibles
      FROM tickets
      WHERE sorteo_id = ?
    `, [id]);
    sorteo.estadisticas = stats[0];

    if (sorteo.estado === 'finalizado') {
      const [ganadores] = await pool.execute(`
        SELECT g.*, t.numero_ticket, p.nombre as producto_nombre, u.nombre as ganador_nombre, u.email as ganador_email
        FROM ganadores g
        JOIN tickets t ON g.ticket_id = t.id
        JOIN productos p ON g.producto_id = p.id
        LEFT JOIN usuarios u ON t.usuario_id = u.id
        WHERE g.sorteo_id = ?
        ORDER BY g.posicion_premio
      `, [id]);
      sorteo.ganadores = ganadores;
    }

    res.json(sorteo);
  } catch (error) {
    console.error('Error al obtener sorteo:', error);
    res.status(500).json({ error: 'Error al obtener sorteo' });
  }
});

// Crear sorteo (requiere autenticación)
router.post('/', authenticateToken, [
  body('titulo').notEmpty().withMessage('El título es requerido'),
  body('fecha_sorteo').notEmpty().withMessage('La fecha del sorteo es requerida'),
  body('productos').isArray({ min: 1 }).withMessage('Debe haber al menos un producto')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { titulo, descripcion, fecha_sorteo, productos, imagenes, link, imagen_portada } = req.body;

    let imagenesArray = [];
    if (imagenes && Array.isArray(imagenes)) {
      imagenesArray = imagenes.slice(0, 5);
    }

    const imagenesJson = imagenesArray.length > 0 ? JSON.stringify(imagenesArray) : null;

    const { DB_TYPE } = require('../config/database');
    let insertQuery = 'INSERT INTO sorteos (titulo, descripcion, fecha_sorteo, imagenes, imagen_portada, link, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)';

    if (DB_TYPE === 'postgres') {
      insertQuery += ' RETURNING id';
    }

    const [result] = await pool.execute(
      insertQuery,
      [titulo, descripcion || null, fecha_sorteo, imagenesJson, imagen_portada || null, link || null, req.user.id]
    );

    let sorteoId;
    if (DB_TYPE === 'postgres') {
      const firstRow = result[0] || {};
      sorteoId = firstRow.id || result.insertId;

      if (!sorteoId) {
        try {
          const [ultimosSorteos] = await pool.execute(
            'SELECT id FROM sorteos WHERE created_by = ? ORDER BY id DESC LIMIT 1',
            [req.user.id]
          );
          if (ultimosSorteos && ultimosSorteos.length > 0) {
            sorteoId = ultimosSorteos[0].id;
          }
        } catch (fallbackError) {
          console.error('Error en fallback para obtener sorteoId:', fallbackError);
        }
      }
    } else {
      sorteoId = result.insertId;
    }

    if (!sorteoId) {
      throw new Error('No se pudo obtener el ID del sorteo creado');
    }

    if (productos && productos.length > 0) {
      for (let i = 0; i < productos.length; i++) {
        const producto = productos[i];
        try {
          let imagenesJson = null;
          if (producto.imagenes && Array.isArray(producto.imagenes) && producto.imagenes.length > 0) {
            imagenesJson = JSON.stringify(producto.imagenes);
          }

          try {
            await pool.execute(
              'INSERT INTO productos (sorteo_id, nombre, descripcion, imagenes, posicion_premio) VALUES (?, ?, ?, ?, ?)',
              [
                sorteoId,
                producto.nombre,
                producto.descripcion || null,
                imagenesJson,
                producto.posicion_premio || 1
              ]
            );
          } catch (insertError) {
            if (insertError.message && (insertError.message.includes('imagenes') || insertError.message.includes('column') || insertError.code === '42703')) {
              let imagenUrl = null;
              if (producto.imagenes && Array.isArray(producto.imagenes) && producto.imagenes.length > 0) {
                imagenUrl = producto.imagenes[0];
              }
              await pool.execute(
                'INSERT INTO productos (sorteo_id, nombre, descripcion, imagen_url, posicion_premio) VALUES (?, ?, ?, ?, ?)',
                [
                  sorteoId,
                  producto.nombre,
                  producto.descripcion || null,
                  imagenUrl,
                  producto.posicion_premio || 1
                ]
              );
            } else {
              throw insertError;
            }
          }
        } catch (productoError) {
          console.error('Error al crear producto:', productoError);
          throw new Error(`Error al crear producto "${producto.nombre}": ${productoError.message}`);
        }
      }
    }

    const [sorteos] = await pool.execute(
      'SELECT * FROM sorteos WHERE id = ?',
      [sorteoId]
    );

    const sorteo = sorteos[0];
    const [productosList] = await pool.execute(
      'SELECT * FROM productos WHERE sorteo_id = ? ORDER BY posicion_premio',
      [sorteoId]
    );
    sorteo.productos = productosList;

    if (sorteo.imagenes) {
      try {
        sorteo.imagenes = typeof sorteo.imagenes === 'string' ? JSON.parse(sorteo.imagenes) : sorteo.imagenes;
      } catch (e) {
        sorteo.imagenes = [];
      }
    } else {
      sorteo.imagenes = [];
    }

    res.status(201).json(sorteo);
  } catch (error) {
    console.error('Error al crear sorteo:', error);
    res.status(500).json({
      error: 'Error al crear sorteo',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Actualizar sorteo
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, fecha_sorteo, estado, productos, imagenes, link, imagen_portada, precio_ticket } = req.body;

    let query = 'SELECT * FROM sorteos WHERE id = ?';
    let params = [id];

    if (req.user.rol !== 'admin') {
      query += ' AND created_by = ?';
      params.push(req.user.id);
    }

    const [sorteos] = await pool.execute(query, params);

    if (sorteos.length === 0) {
      return res.status(404).json({ error: 'Sorteo no encontrado o no tienes permisos' });
    }

    let imagenesArray = [];
    if (imagenes && Array.isArray(imagenes)) {
      imagenesArray = imagenes.slice(0, 10);
    }

    const imagenesJson = imagenesArray.length > 0 ? JSON.stringify(imagenesArray) : null;

    // Preservar imagen_portada existente si no se envía una nueva
    const sorteoActual = sorteos[0];
    const nuevaPortada = imagen_portada !== undefined
      ? (imagen_portada || null)
      : sorteoActual.imagen_portada;

    // Preservar imagenes existentes si no se envían nuevas
    const nuevasImagenes = imagenes !== undefined
      ? imagenesJson
      : sorteoActual.imagenes;

    // El estado se determina automáticamente por la fecha: si es futura → activo, si pasó → finalizado
    const estadoCalculado = new Date(fecha_sorteo) > new Date() ? 'activo' : 'finalizado';

    const precioTicketValue = (precio_ticket !== undefined && precio_ticket !== null && precio_ticket !== '')
      ? parseFloat(precio_ticket)
      : null;
    await pool.execute(
      'UPDATE sorteos SET titulo = ?, descripcion = ?, fecha_sorteo = ?, estado = ?, imagenes = ?, imagen_portada = ?, link = ?, precio_ticket = ? WHERE id = ?',
      [titulo, descripcion, fecha_sorteo, estadoCalculado, nuevasImagenes, nuevaPortada, link || null, precioTicketValue, id]
    );

    if (productos && Array.isArray(productos)) {
      await pool.execute('DELETE FROM productos WHERE sorteo_id = ?', [id]);

      for (const producto of productos) {
        let imagenesJson = null;
        if (producto.imagenes && Array.isArray(producto.imagenes) && producto.imagenes.length > 0) {
          imagenesJson = JSON.stringify(producto.imagenes);
        }

        await pool.execute(
          'INSERT INTO productos (sorteo_id, nombre, descripcion, imagenes, posicion_premio) VALUES (?, ?, ?, ?, ?)',
          [
            id,
            producto.nombre,
            producto.descripcion || null,
            imagenesJson,
            producto.posicion_premio || 1
          ]
        );
      }
    }

    res.json({ message: 'Sorteo actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar sorteo:', error);
    res.status(500).json({ error: 'Error al actualizar sorteo' });
  }
});

// Eliminar sorteo
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    let query = 'SELECT * FROM sorteos WHERE id = ?';
    let params = [id];

    if (req.user.rol !== 'admin') {
      query += ' AND created_by = ?';
      params.push(req.user.id);
    }

    const [sorteos] = await pool.execute(query, params);

    if (sorteos.length === 0) {
      return res.status(404).json({ error: 'Sorteo no encontrado o no tienes permisos' });
    }

    await pool.execute('DELETE FROM sorteos WHERE id = ?', [id]);

    res.json({ message: 'Sorteo eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar sorteo:', error);
    res.status(500).json({ error: 'Error al eliminar sorteo' });
  }
});

module.exports = router;
