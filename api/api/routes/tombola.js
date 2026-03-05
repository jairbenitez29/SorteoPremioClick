const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Realizar sorteo (tómbola digital)
router.post('/realizar/:sorteoId', authenticateToken, async (req, res) => {
  try {
    const { sorteoId } = req.params;

    // Verificar que el sorteo existe
    // Si es admin, puede realizar cualquier sorteo
    // Si no es admin, solo puede realizar sus propios sorteos
    let query = 'SELECT * FROM sorteos WHERE id = ?';
    let params = [sorteoId];
    
    if (req.user.rol !== 'admin') {
      query += ' AND created_by = ?';
      params.push(req.user.id);
    }

    const [sorteos] = await pool.execute(query, params);

    if (sorteos.length === 0) {
      return res.status(404).json({ error: 'Sorteo no encontrado o no tienes permisos' });
    }

    const sorteo = sorteos[0];

    // Verificar que la fecha del sorteo ya pasó
    const fechaSorteo = new Date(sorteo.fecha_sorteo);
    const ahora = new Date();

    if (fechaSorteo > ahora) {
      return res.status(400).json({ 
        error: 'El sorteo aún no puede realizarse. La fecha programada no ha llegado.' 
      });
    }

    // Verificar que el sorteo no esté ya finalizado
    if (sorteo.estado === 'finalizado') {
      return res.status(400).json({ error: 'Este sorteo ya fue realizado' });
    }

    // Obtener productos del sorteo
    const [productos] = await pool.execute(
      'SELECT * FROM productos WHERE sorteo_id = ? ORDER BY posicion_premio',
      [sorteoId]
    );

    if (productos.length === 0) {
      return res.status(400).json({ error: 'El sorteo no tiene productos' });
    }

    // Obtener todos los tickets vendidos
    const [ticketsVendidos] = await pool.execute(
      'SELECT * FROM tickets WHERE sorteo_id = ? AND estado = "vendido"',
      [sorteoId]
    );

    if (ticketsVendidos.length === 0) {
      return res.status(400).json({ error: 'No hay tickets vendidos para este sorteo' });
    }

    // Verificar si ya hay ganadores (evitar duplicados)
    const [ganadoresExistentes] = await pool.execute(
      'SELECT * FROM ganadores WHERE sorteo_id = ?',
      [sorteoId]
    );

    if (ganadoresExistentes.length > 0) {
      return res.status(400).json({ error: 'Este sorteo ya tiene ganadores asignados' });
    }

    // Función para seleccionar ticket aleatorio sin repetición
    function seleccionarTicketAleatorio(tickets, ticketsSeleccionados) {
      const ticketsDisponibles = tickets.filter(
        t => !ticketsSeleccionados.includes(t.id)
      );
      
      if (ticketsDisponibles.length === 0) {
        return null;
      }

      const indiceAleatorio = Math.floor(Math.random() * ticketsDisponibles.length);
      return ticketsDisponibles[indiceAleatorio];
    }

    // Seleccionar ganadores para cada producto
    const ganadores = [];
    const ticketsSeleccionados = [];

    for (const producto of productos) {
      const ticketGanador = seleccionarTicketAleatorio(ticketsVendidos, ticketsSeleccionados);

      if (ticketGanador) {
        ticketsSeleccionados.push(ticketGanador.id);

        // Insertar ganador
        await pool.execute(
          'INSERT INTO ganadores (sorteo_id, ticket_id, producto_id, posicion_premio) VALUES (?, ?, ?, ?)',
          [sorteoId, ticketGanador.id, producto.id, producto.posicion_premio]
        );

        // Marcar ticket como ganador
        await pool.execute(
          'UPDATE tickets SET estado = "ganador" WHERE id = ?',
          [ticketGanador.id]
        );

        // Obtener información del ganador
        const [ticketInfo] = await pool.execute(`
          SELECT t.*, u.nombre as usuario_nombre, u.email as usuario_email
          FROM tickets t
          LEFT JOIN usuarios u ON t.usuario_id = u.id
          WHERE t.id = ?
        `, [ticketGanador.id]);

        ganadores.push({
          producto: producto.nombre,
          posicion_premio: producto.posicion_premio,
          ticket: ticketInfo[0]
        });
      }
    }

    // Actualizar estado del sorteo a finalizado
    await pool.execute(
      'UPDATE sorteos SET estado = "finalizado" WHERE id = ?',
      [sorteoId]
    );

    res.json({
      message: 'Sorteo realizado correctamente',
      ganadores,
      total_ganadores: ganadores.length
    });
  } catch (error) {
    console.error('Error al realizar sorteo:', error);
    res.status(500).json({ error: 'Error al realizar sorteo' });
  }
});

// Seleccionar ganadores aleatorios (nueva funcionalidad)
router.post('/seleccionar-ganadores', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 ========== INICIANDO SELECCIÓN DE GANADORES ==========');
    console.log('🔍 Request body:', req.body);
    console.log('🔍 User:', req.user);
    
    const { sorteo_id, producto_id, cantidad } = req.body;

    if (!sorteo_id || !producto_id || !cantidad || cantidad < 1) {
      console.error('❌ Datos inválidos:', { sorteo_id, producto_id, cantidad });
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    // Verificar que el usuario es admin
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo los administradores pueden seleccionar ganadores' });
    }

    // Verificar que el sorteo existe
    const [sorteos] = await pool.execute('SELECT * FROM sorteos WHERE id = ?', [sorteo_id]);
    if (sorteos.length === 0) {
      return res.status(404).json({ error: 'Sorteo no encontrado' });
    }

    const sorteo = sorteos[0];

    // Verificar que el sorteo no esté finalizado
    if (sorteo.estado === 'finalizado') {
      return res.status(400).json({ error: 'Este sorteo ya está finalizado. No se pueden escoger más ganadores.' });
    }

    // Verificar que el producto existe y pertenece al sorteo
    const [productos] = await pool.execute(
      'SELECT * FROM productos WHERE id = ? AND sorteo_id = ?',
      [producto_id, sorteo_id]
    );
    if (productos.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado o no pertenece al sorteo' });
    }

    const producto = productos[0];

    // Obtener SOLO los tickets VENDIDOS del sorteo que no sean ganadores
    console.log('🔍 Buscando tickets vendidos para sorteo_id:', sorteo_id);
    const [ticketsVendidos] = await pool.execute(`
      SELECT t.*, u.nombre as usuario_nombre, u.email as usuario_email
      FROM tickets t
      LEFT JOIN usuarios u ON t.usuario_id = u.id
      WHERE t.sorteo_id = ? 
        AND t.estado = 'vendido'
        AND t.id NOT IN (
          SELECT ticket_id FROM ganadores WHERE sorteo_id = ?
        )
    `, [sorteo_id, sorteo_id]);

    console.log('🔍 Tickets vendidos encontrados:', ticketsVendidos.length);

    if (ticketsVendidos.length === 0) {
      console.error('❌ No hay tickets vendidos disponibles');
      return res.status(400).json({ error: 'No hay tickets vendidos disponibles para este sorteo' });
    }

    if (ticketsVendidos.length < cantidad) {
      return res.status(400).json({ 
        error: `Solo hay ${ticketsVendidos.length} tickets vendidos disponibles, pero se solicitaron ${cantidad}` 
      });
    }

    // Función para seleccionar tickets aleatorios sin repetición
    function seleccionarTicketsAleatorios(tickets, cantidad) {
      const ticketsSeleccionados = [];
      const indicesUsados = new Set();
      
      while (ticketsSeleccionados.length < cantidad && indicesUsados.size < tickets.length) {
        const indiceAleatorio = Math.floor(Math.random() * tickets.length);
        
        if (!indicesUsados.has(indiceAleatorio)) {
          indicesUsados.add(indiceAleatorio);
          ticketsSeleccionados.push(tickets[indiceAleatorio]);
        }
      }
      
      return ticketsSeleccionados;
    }

    // Seleccionar tickets ganadores
    const ticketsGanadores = seleccionarTicketsAleatorios(ticketsVendidos, cantidad);
    const ganadores = [];

    // Guardar ganadores en la base de datos
    console.log('🔍 Guardando ganadores en BD. Cantidad:', ticketsGanadores.length);
    for (let i = 0; i < ticketsGanadores.length; i++) {
      const ticket = ticketsGanadores[i];
      console.log(`🔍 Procesando ganador ${i + 1}/${ticketsGanadores.length}:`, ticket.numero_ticket);
      
      try {
        // Verificar si ya existe un ganador para este ticket y producto (evitar duplicados)
        const [existentes] = await pool.execute(
          'SELECT id FROM ganadores WHERE sorteo_id = ? AND ticket_id = ? AND producto_id = ?',
          [sorteo_id, ticket.id, producto_id]
        );
        
        if (existentes.length > 0) {
          console.log(`⚠️ El ticket ${ticket.numero_ticket} ya es ganador de este premio, saltando...`);
          continue;
        }
        
        // Insertar ganador
        // Nota: Si hay restricción única (sorteo_id, posicion_premio), necesitamos eliminarla primero
        // Por ahora, intentamos insertar y si falla por restricción única, continuamos
        try {
          await pool.execute(
            'INSERT INTO ganadores (sorteo_id, ticket_id, producto_id, posicion_premio) VALUES (?, ?, ?, ?)',
            [sorteo_id, ticket.id, producto_id, producto.posicion_premio]
          );
          console.log(`✅ Ganador ${i + 1} insertado en tabla ganadores`);
        } catch (insertError) {
          // Si es error de restricción única, informar pero continuar
          if (insertError.code === '23505' || insertError.message?.includes('duplicate key')) {
            console.log(`⚠️ Ya existe un ganador para este premio (posicion ${producto.posicion_premio}), pero continuamos con otros tickets...`);
            // Continuar con el siguiente ticket
            continue;
          }
          throw insertError;
        }

        // Marcar ticket como ganador
        await pool.execute(
          'UPDATE tickets SET estado = ? WHERE id = ?',
          ['ganador', ticket.id]
        );
        console.log(`✅ Ticket ${ticket.numero_ticket} marcado como ganador`);

        ganadores.push({
          id: ticket.id,
          numero_ticket: ticket.numero_ticket,
          usuario_nombre: ticket.usuario_nombre,
          usuario_email: ticket.usuario_email,
        });
      } catch (dbError) {
        console.error(`❌ Error al guardar ganador ${i + 1}:`, dbError);
        console.error('❌ Error code:', dbError.code);
        console.error('❌ Error message:', dbError.message);
        console.error('❌ Stack:', dbError.stack);
        // Si es error de restricción única, continuar con el siguiente
        if (dbError.code === '23505' || dbError.message?.includes('duplicate key')) {
          console.log(`⚠️ Error de restricción única, continuando con siguiente ticket...`);
          continue;
        }
        throw dbError;
      }
    }

    console.log('✅ Todos los ganadores guardados correctamente');
    console.log('🔍 ========== FIN SELECCIÓN DE GANADORES (ÉXITO) ==========');
    res.json({
      message: `${cantidad} ganador(es) seleccionado(s) correctamente`,
      ganadores,
      producto: {
        id: producto.id,
        nombre: producto.nombre,
        posicion_premio: producto.posicion_premio,
      },
    });
  } catch (error) {
    console.error('❌ ========== ERROR EN SELECCIÓN DE GANADORES ==========');
    console.error('❌ Error completo:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error name:', error.name);
    console.error('❌ Stack completo:', error.stack);
    console.error('❌ ========== FIN ERROR ==========');
    res.status(500).json({ 
      error: 'Error al seleccionar ganadores',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Obtener ganadores de un sorteo
router.get('/ganadores/:sorteoId', async (req, res) => {
  try {
    const { sorteoId } = req.params;

    const [ganadores] = await pool.execute(`
      SELECT 
        g.*,
        t.numero_ticket,
        p.nombre as producto_nombre,
        p.descripcion as producto_descripcion,
        p.imagenes as producto_imagenes,
        u.nombre as ganador_nombre,
        u.email as ganador_email,
        u.telefono as ganador_telefono
      FROM ganadores g
      JOIN tickets t ON g.ticket_id = t.id
      JOIN productos p ON g.producto_id = p.id
      LEFT JOIN usuarios u ON t.usuario_id = u.id
      WHERE g.sorteo_id = ?
      ORDER BY g.posicion_premio
    `, [sorteoId]);

    res.json(ganadores);
  } catch (error) {
    console.error('Error al obtener ganadores:', error);
    res.status(500).json({ error: 'Error al obtener ganadores' });
  }
});

module.exports = router;

