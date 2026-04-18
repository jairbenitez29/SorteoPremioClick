const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Todas las rutas requieren autenticación y ser admin
router.use(authenticateToken);
router.use(isAdmin);

// Estadísticas del dashboard
router.get('/stats', async (req, res) => {
  try {
    // Total de usuarios
    const [usuarios] = await pool.execute('SELECT COUNT(*) as total FROM usuarios', []);
    const total_usuarios = usuarios[0].total;

    // Total de sorteos
    const [sorteos] = await pool.execute('SELECT COUNT(*) as total FROM sorteos', []);
    const total_sorteos = sorteos[0].total;

    // Total de tickets
    const [tickets] = await pool.execute('SELECT COUNT(*) as total FROM tickets', []);
    const total_tickets = tickets[0].total;

    // Tickets vendidos
    const [vendidos] = await pool.execute(
      "SELECT COUNT(*) as total FROM tickets WHERE estado = 'vendido'",
      []
    );
    const tickets_vendidos = vendidos[0].total;

    // Ingresos totales
    const [ingresos] = await pool.execute(`
      SELECT COALESCE(SUM(monto), 0) as total 
      FROM pagos 
      WHERE estado = 'completado'
    `, []);
    const ingresos_totales = ingresos[0].total || 0;

    // Sorteos activos
    const [activos] = await pool.execute(
      "SELECT COUNT(*) as total FROM sorteos WHERE estado = 'activo'",
      []
    );
    const sorteos_activos = activos[0].total;

    res.json({
      total_usuarios,
      total_sorteos,
      total_tickets,
      tickets_vendidos,
      ingresos_totales: parseFloat(ingresos_totales),
      sorteos_activos,
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Obtener todos los usuarios
router.get('/usuarios', async (req, res) => {
  try {
    const [usuarios] = await pool.execute(`
      SELECT id, nombre, email, telefono, rol, created_at
      FROM usuarios
      ORDER BY created_at DESC
    `, []);
    res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Actualizar rol de usuario
router.put('/usuarios/:id/rol', async (req, res) => {
  try {
    const { id } = req.params;
    const { rol } = req.body;

    if (!['usuario', 'admin'].includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    await pool.execute('UPDATE usuarios SET rol = ? WHERE id = ?', [rol, id]);
    res.json({ message: 'Rol actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar rol:', error);
    res.status(500).json({ error: 'Error al actualizar rol' });
  }
});

// Obtener todos los tickets con información del sorteo
router.get('/tickets', async (req, res) => {
  try {
    // Usar LEFT JOIN para incluir tickets incluso si el sorteo fue eliminado
    const query = `
      SELECT 
        t.id,
        t.sorteo_id,
        t.usuario_id,
        t.numero_ticket,
        t.precio,
        t.estado,
        t.fecha_compra,
        t.created_at,
        COALESCE(s.titulo, 'Sorteo eliminado') as sorteo_titulo
      FROM tickets t
      LEFT JOIN sorteos s ON t.sorteo_id = s.id
      ORDER BY 
        COALESCE(s.titulo, '') ASC,
        t.numero_ticket ASC
    `;
    
    console.log('🔍 Ejecutando consulta de tickets...');
    const [tickets] = await pool.execute(query, []);
    console.log(`✅ Se obtuvieron ${tickets.length} tickets`);

    res.json(tickets);
  } catch (error) {
    console.error('❌ Error al obtener tickets:', error);
    console.error('📋 Mensaje:', error.message);
    console.error('📚 Stack:', error.stack);
    res.status(500).json({ 
      error: 'Error al obtener tickets',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;

