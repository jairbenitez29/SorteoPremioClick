/**
 * RUTAS DE PROMOCIONES - Ajustado a tu tabla real
 * Tabla: id, sorteo_id, cantidad_tickets, precio_total, descuento, activa, created_at
 * (NO hay columnas "precio" ni "descripcion")
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database'); // ajusta la ruta a tu config

// GET /api/promociones/sorteo/:sorteoId - Listar promociones de un sorteo
router.get('/sorteo/:sorteoId', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM promociones WHERE sorteo_id = ? ORDER BY id',
      [req.params.sorteoId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al listar promociones:', error);
    res.status(500).json({ error: 'Error al listar promociones' });
  }
});

// POST /api/promociones - Crear promoción (tabla solo tiene precio_total, no precio ni descripcion)
router.post('/', async (req, res) => {
  try {
    const { sorteo_id, cantidad_tickets, precio, precio_total } = req.body;
    if (!sorteo_id || cantidad_tickets == null) {
      return res.status(400).json({ error: 'Faltan sorteo_id o cantidad_tickets' });
    }
    const cantidad = parseInt(cantidad_tickets) || 1;
    const precioTotal = parseFloat(precio_total ?? precio) || 0;

    const [result] = await pool.execute(
      `INSERT INTO promociones (sorteo_id, cantidad_tickets, precio_total, descuento, activa)
       VALUES (?, ?, ?, '0.00', 1)`,
      [sorteo_id, cantidad, precioTotal]
    );
    const [newRow] = await pool.execute('SELECT * FROM promociones WHERE id = ?', [result.insertId]);
    res.status(201).json(newRow[0]);
  } catch (error) {
    console.error('Error al crear promoción:', error);
    res.status(500).json({ error: 'Error al crear promoción', message: error.message });
  }
});

// PUT /api/promociones/:id - Actualizar promoción (solo columnas: cantidad_tickets, precio_total, descuento, activa)
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { cantidad_tickets, precio, precio_total, activa, descuento } = req.body;
    const cantidad = cantidad_tickets != null ? parseInt(cantidad_tickets) : null;
    const precioTotal = (precio_total != null ? parseFloat(precio_total) : parseFloat(precio)) || null;

    const updates = [];
    const values = [];
    if (cantidad != null) { updates.push('cantidad_tickets = ?'); values.push(cantidad); }
    if (precioTotal != null) { updates.push('precio_total = ?'); values.push(precioTotal); }
    if (activa !== undefined) { updates.push('activa = ?'); values.push(activa ? 1 : 0); }
    if (descuento !== undefined) { updates.push('descuento = ?'); values.push(String(descuento)); }

    if (updates.length === 0) {
      const [rows] = await pool.execute('SELECT * FROM promociones WHERE id = ?', [id]);
      return rows[0] ? res.json(rows[0]) : res.status(404).json({ error: 'Promoción no encontrada' });
    }
    values.push(id);
    await pool.execute(
      `UPDATE promociones SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    const [rows] = await pool.execute('SELECT * FROM promociones WHERE id = ?', [id]);
    res.json(rows[0] || { id });
  } catch (error) {
    console.error('Error al actualizar promoción:', error);
    res.status(500).json({ error: 'Error al actualizar promoción', message: error.message });
  }
});

// DELETE /api/promociones/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM promociones WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Promoción no encontrada' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar promoción:', error);
    res.status(500).json({ error: 'Error al eliminar promoción' });
  }
});

module.exports = router;
