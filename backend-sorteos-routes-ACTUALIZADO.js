const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Obtener todos los sorteos
router.get('/', async (req, res) => {
  try {
    console.log('🔍 ========== INICIANDO GET /sorteos ==========');
    const { DB_TYPE } = require('../config/database');
    console.log('🔍 DB_TYPE:', DB_TYPE);

    let query;
    let sorteos;

    if (DB_TYPE === 'postgres') {
      console.log('🔍 Usando PostgreSQL');
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

      console.log('🔍 Intentando query con imagen_portada...');
      try {
        const result = await pool.execute(queryWithPortada, []);
        sorteos = result[0];
        console.log('✅ Query ejecutado con imagen_portada exitosamente');
        console.log('🔍 Cantidad de sorteos obtenidos:', sorteos?.length || 0);
        if (sorteos && sorteos.length > 0) {
          console.log('🔍 Primer sorteo - imagen_portada:', sorteos[0].imagen_portada ? 'SÍ' : 'NO');
          console.log('🔍 Primer sorteo - título:', sorteos[0].titulo);
        }
      } catch (error) {
        console.error('❌ Error al ejecutar query con imagen_portada:');
        console.error('❌ Error message:', error.message);
        console.error('❌ Error code:', error.code);
        if (error.message?.includes('column') && error.message?.includes('imagen_portada')) {
          console.log('⚠️ La columna imagen_portada no existe, usando query sin ella...');
        } else {
          console.error('❌ Error stack:', error.stack);
          console.log('⚠️ Intentando query sin imagen_portada...');
        }

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
          console.log('✅ Query sin imagen_portada ejecutado exitosamente');
          console.log('🔍 Cantidad de sorteos obtenidos:', sorteos?.length || 0);

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

              console.log('✅ imagen_portada obtenida para todos los sorteos');
              if (sorteos.length > 0) {
                console.log('🔍 Primer sorteo después de obtener portadas - imagen_portada:', sorteos[0].imagen_portada ? 'SÍ' : 'NO');
              }
            } catch (portadaError) {
              console.error('❌ Error al obtener imagen_portada:', portadaError);
              sorteos.forEach(s => { s.imagen_portada = null; });
            }
          }
        } catch (error2) {
          console.error('❌ Error también con query sin imagen_portada:');
          console.error('❌ Error message:', error2.message);
          console.error('❌ Error code:', error2.code);
          console.error('❌ Error stack:', error2.stack);
          throw error2;
        }
      }
    } else {
      console.log('🔍 Usando MySQL');
      query = `
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
      console.log('🔍 Ejecutando query MySQL...');
      const result = await pool.execute(query, []);
      sorteos = result[0];
      console.log('✅ Query MySQL ejecutado exitosamente');
      console.log('🔍 Cantidad de sorteos obtenidos:', sorteos?.length || 0);
    }

    sorteos = Array.isArray(sorteos) ? sorteos.map((s) => ({ ...s })) : [];

    console.log('🔍 Obteniendo productos para cada sorteo...');
    for (let sorteo of sorteos) {
      const [productosRaw] = await pool.execute(
        'SELECT * FROM productos WHERE sorteo_id = ? ORDER BY posicion_premio',
        [sorteo.id]
      );

      const productos = Array.isArray(productosRaw) ? productosRaw.map((p) => ({ ...p })) : [];

      sorteo.productos = productos.map(producto => {
        if (producto.imagenes) {
          try {
            if (typeof producto.imagenes === 'string') {
              producto.imagenes = JSON.parse(producto.imagenes);
            } else if (Array.isArray(producto.imagenes)) {
              producto.imagenes = producto.imagenes;
            } else {
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
          } else if (Array.isArray(sorteo.imagenes)) {
            sorteo.imagenes = sorteo.imagenes;
          } else {
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

    console.log('✅ Todos los sorteos procesados correctamente');
    console.log('🔍 Total de sorteos a retornar:', sorteos?.length || 0);

    if (sorteos && sorteos.length > 0) {
      console.log('🔍 Verificando imagen_portada en sorteos...');
      sorteos.forEach((s, index) => {
        console.log(`🔍 Sorteo ${index + 1} (${s.titulo}):`);
        console.log(`  - imagen_portada: ${s.imagen_portada ? 'SÍ (' + (s.imagen_portada.length > 50 ? s.imagen_portada.substring(0, 50) + '...' : s.imagen_portada) + ')' : 'NO'}`);
        console.log(`  - productos: ${s.productos?.length || 0}`);
        if (s.productos && s.productos.length > 0) {
          console.log(`  - Primer producto imagenes: ${s.productos[0].imagenes?.length || 0} imágenes`);
        }
      });
    }

    console.log('🔍 ========== FIN GET /sorteos (ÉXITO) ==========');
    res.json(sorteos);
  } catch (error) {
    console.error('❌ ========== ERROR EN GET /sorteos ==========');
    console.error('❌ Error completo:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error name:', error.name);
    console.error('❌ Stack completo:', error.stack);
    console.error('❌ ========== FIN ERROR ==========');
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

    console.log('🔍 ========== GET /sorteos/:id ==========');
    console.log('🔍 Sorteo ID:', id);
    console.log('🔍 Sorteo - imagen_portada (raw):', sorteo.imagen_portada);
    console.log('🔍 Sorteo - tiene imagen_portada?:', !!sorteo.imagen_portada);
    if (sorteo.imagen_portada) {
      console.log('🔍 Sorteo - imagen_portada length:', sorteo.imagen_portada.length);
      console.log('🔍 Sorteo - imagen_portada preview:', sorteo.imagen_portada.substring(0, 100));
    }

    console.log('🔍 ========== OBTENIENDO PRECIO DEL TICKET ==========');
    console.log('🔍 Sorteo ID:', id);

    let [tickets] = await pool.execute(
      'SELECT precio FROM tickets WHERE sorteo_id = ? AND estado = ? LIMIT 1',
      [id, 'disponible']
    );

    console.log('🔍 Tickets disponibles encontrados:', tickets.length);
    if (tickets.length > 0) {
      console.log('🔍 Precio del ticket disponible:', tickets[0].precio);
    }

    if (tickets.length === 0) {
      console.log('🔍 No hay tickets disponibles, buscando cualquier ticket del sorteo...');
      [tickets] = await pool.execute(
        'SELECT precio FROM tickets WHERE sorteo_id = ? LIMIT 1',
        [id]
      );
      console.log('🔍 Tickets totales encontrados:', tickets.length);
      if (tickets.length > 0) {
        console.log('🔍 Precio del ticket encontrado:', tickets[0].precio);
      }
    }

    // Usar precio_ticket guardado en el sorteo; si no hay, usar precio del primer ticket
    const precioFromDb = sorteo.precio_ticket != null && !isNaN(parseFloat(sorteo.precio_ticket)) && parseFloat(sorteo.precio_ticket) > 0
      ? parseFloat(sorteo.precio_ticket)
      : null;
    if (precioFromDb != null) {
      sorteo.precio_ticket = precioFromDb;
      console.log('✅ Precio del ticket desde sorteo.precio_ticket:', sorteo.precio_ticket);
    } else if (tickets.length > 0 && tickets[0].precio) {
      const precio = parseFloat(tickets[0].precio);
      sorteo.precio_ticket = precio;
      console.log('✅ Precio del ticket desde tickets[0].precio:', sorteo.precio_ticket);
    } else {
      sorteo.precio_ticket = 0;
      console.log('⚠️ No se encontraron tickets para este sorteo, precio establecido en 0');
      console.log('🔍 Tickets encontrados:', tickets.length);
      if (tickets.length > 0) {
        console.log('🔍 Ticket sin precio:', tickets[0]);
      }
    }

    console.log('🔍 ========== FIN OBTENCIÓN PRECIO ==========');

    const [productos] = await pool.execute(
      'SELECT * FROM productos WHERE sorteo_id = ? ORDER BY posicion_premio',
      [id]
    );

    console.log('🔍 Productos encontrados:', productos.length);
    sorteo.productos = productos.map((producto, index) => {
      console.log(`🔍 Producto ${index + 1} (${producto.nombre}):`);
      console.log(`  - imagenes (raw):`, producto.imagenes);
      console.log(`  - tipo de imagenes:`, typeof producto.imagenes);

      if (producto.imagenes) {
        try {
          if (typeof producto.imagenes === 'string') {
            producto.imagenes = JSON.parse(producto.imagenes);
            console.log(`  - imagenes parseadas:`, producto.imagenes);
          } else if (Array.isArray(producto.imagenes)) {
            producto.imagenes = producto.imagenes;
            console.log(`  - imagenes ya es array:`, producto.imagenes);
          } else {
            producto.imagenes = [];
            console.log(`  - imagenes no es string ni array, establecido como []`);
          }
        } catch (e) {
          console.error(`❌ Error al parsear imágenes del producto ${index + 1}:`, e);
          producto.imagenes = [];
        }
      } else {
        producto.imagenes = [];
        console.log(`  - no hay imagenes, establecido como []`);
      }
      console.log(`  - imagenes final:`, producto.imagenes);
      console.log(`  - cantidad de imagenes:`, producto.imagenes.length);
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

    console.log('🔍 Imágenes en BD (raw) para sorteo', id, ':', sorteo.imagenes);
    console.log('🔍 Tipo de imagenes en BD:', typeof sorteo.imagenes);

    if (sorteo.imagenes) {
      try {
        if (typeof sorteo.imagenes === 'string') {
          const parsed = JSON.parse(sorteo.imagenes);
          sorteo.imagenes = Array.isArray(parsed) ? parsed : [];
        } else if (Array.isArray(sorteo.imagenes)) {
          sorteo.imagenes = sorteo.imagenes;
        } else {
          sorteo.imagenes = [];
        }
        console.log('🔍 Imágenes parseadas:', sorteo.imagenes);
        console.log('🔍 Cantidad final:', sorteo.imagenes.length);
      } catch (e) {
        console.error('❌ Error al parsear imágenes:', e);
        sorteo.imagenes = [];
      }
    } else {
      console.log('⚠️ No hay imágenes en el sorteo');
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

    console.log('🔍 Sorteo final antes de retornar:');
    console.log('  - imagen_portada:', sorteo.imagen_portada ? 'SÍ' : 'NO');
    console.log('  - productos:', sorteo.productos?.length || 0);
    if (sorteo.productos && sorteo.productos.length > 0) {
      console.log('  - Primer producto imagenes:', sorteo.productos[0].imagenes?.length || 0);
    }
    console.log('🔍 ========== FIN GET /sorteos/:id ==========');

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

    console.log('🔍 Imágenes recibidas en backend:', imagenes);
    console.log('🔍 Imágenes procesadas:', imagenesArray);
    console.log('🔍 Cantidad de imágenes:', imagenesArray.length);

    const imagenesJson = imagenesArray.length > 0 ? JSON.stringify(imagenesArray) : null;

    const { DB_TYPE } = require('../config/database');
    let insertQuery = 'INSERT INTO sorteos (titulo, descripcion, fecha_sorteo, imagenes, imagen_portada, link, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)';

    if (DB_TYPE === 'postgres') {
      insertQuery += ' RETURNING id';
    }

    console.log('🔍 Creando sorteo con datos:', { titulo, descripcion, fecha_sorteo, link, tieneImagenPortada: !!imagen_portada, created_by: req.user.id });

    const [result] = await pool.execute(
      insertQuery,
      [titulo, descripcion || null, fecha_sorteo, imagenesJson, imagen_portada || null, link || null, req.user.id]
    );

    console.log('🔍 Resultado de INSERT sorteo (raw):', result);
    console.log('🔍 Tipo de result:', Array.isArray(result) ? 'array' : typeof result);
    console.log('🔍 DB_TYPE:', DB_TYPE);

    let sorteoId;
    if (DB_TYPE === 'postgres') {
      const firstRow = result[0] || {};
      sorteoId = firstRow.id || result.insertId;
      console.log('🔍 PostgreSQL - result:', result);
      console.log('🔍 PostgreSQL - firstRow:', firstRow);
      console.log('🔍 PostgreSQL - result.insertId:', result.insertId);
      console.log('🔍 PostgreSQL - sorteoId obtenido:', sorteoId);

      if (!sorteoId) {
        console.warn('⚠️ No se pudo obtener ID de RETURNING, consultando último sorteo...');
        try {
          const [ultimosSorteos] = await pool.execute(
            'SELECT id FROM sorteos WHERE created_by = ? ORDER BY id DESC LIMIT 1',
            [req.user.id]
          );
          if (ultimosSorteos && ultimosSorteos.length > 0) {
            sorteoId = ultimosSorteos[0].id;
            console.log('✅ SorteoId obtenido de consulta:', sorteoId);
          } else {
            console.error('❌ No se encontró ningún sorteo recién creado');
          }
        } catch (fallbackError) {
          console.error('❌ Error en fallback para obtener sorteoId:', fallbackError);
        }
      }
    } else {
      sorteoId = result.insertId;
      console.log('🔍 MySQL - sorteoId obtenido:', sorteoId);
    }

    if (!sorteoId) {
      console.error('❌ No se pudo obtener el ID del sorteo. Result completo:', JSON.stringify(result, null, 2));
      throw new Error('No se pudo obtener el ID del sorteo creado');
    }

    console.log('✅ Sorteo creado con ID:', sorteoId);

    if (productos && productos.length > 0) {
      for (let i = 0; i < productos.length; i++) {
        const producto = productos[i];
        try {
          console.log(`🔍 Procesando producto ${i + 1}/${productos.length}:`, producto.nombre);

          let imagenesJson = null;
          if (producto.imagenes && Array.isArray(producto.imagenes) && producto.imagenes.length > 0) {
            imagenesJson = JSON.stringify(producto.imagenes);
            console.log(`🔍 Producto tiene ${producto.imagenes.length} imágenes`);
          } else {
            console.log('🔍 Producto sin imágenes');
          }

          try {
            console.log('🔍 Intentando INSERT con columna "imagenes"');
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
            console.log(`✅ Producto "${producto.nombre}" creado exitosamente`);
          } catch (insertError) {
            console.error('❌ Error al insertar con columna "imagenes":', insertError.message);
            if (insertError.message && (insertError.message.includes('imagenes') || insertError.message.includes('column') || insertError.code === '42703')) {
              console.warn('⚠️ Columna "imagenes" no existe, usando "imagen_url" (estructura antigua)');
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
              console.log(`✅ Producto "${producto.nombre}" creado con imagen_url`);
            } else {
              throw insertError;
            }
          }
        } catch (productoError) {
          console.error('❌ Error al crear producto:', productoError);
          console.error('❌ Stack:', productoError.stack);
          console.error('❌ Producto que falló:', JSON.stringify(producto, null, 2));
          throw new Error(`Error al crear producto "${producto.nombre}": ${productoError.message}`);
        }
      }
      console.log('✅ Todos los productos creados exitosamente');
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
    console.error('Stack:', error.stack);
    console.error('Request body:', req.body);
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
      imagenesArray = imagenes.slice(0, 5);
    }

    console.log('🔍 Imágenes recibidas para actualizar:', imagenes);
    console.log('🔍 Imágenes procesadas:', imagenesArray);
    console.log('🔍 Cantidad de imágenes:', imagenesArray.length);

    const imagenesJson = imagenesArray.length > 0 ? JSON.stringify(imagenesArray) : null;

    // Actualizar sorteo (incluye precio_ticket para precio unitario del ticket)
    const precioTicketValue = (precio_ticket !== undefined && precio_ticket !== null && precio_ticket !== '')
      ? parseFloat(precio_ticket)
      : null;
    await pool.execute(
      'UPDATE sorteos SET titulo = ?, descripcion = ?, fecha_sorteo = ?, estado = ?, imagenes = ?, imagen_portada = ?, link = ?, precio_ticket = ? WHERE id = ?',
      [titulo, descripcion, fecha_sorteo, estado, imagenesJson, imagen_portada || null, link || null, precioTicketValue, id]
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
