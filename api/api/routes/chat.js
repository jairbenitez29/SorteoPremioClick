const express = require('express');
const Pusher = require('pusher');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Inicializar Pusher con variables de entorno
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER || 'us2',
  useTLS: true,
});

// Tabla de mensajes en memoria como fallback (máx. 50 mensajes)
const mensajesCache = [];
const MAX_CACHE = 50;

function guardarEnCache(msg) {
  mensajesCache.push(msg);
  if (mensajesCache.length > MAX_CACHE) {
    mensajesCache.shift();
  }
}

// GET /api/chat/mensajes — historial de mensajes
router.get('/mensajes', async (req, res) => {
  try {
    // Intentar obtener mensajes de la BD
    const [rows] = await pool.execute(
      `SELECT cm.id, u.nombre as user, cm.mensaje as message,
              (u.rol = 'admin') as isAdmin, cm.created_at as timestamp
       FROM chat_mensajes cm
       JOIN usuarios u ON u.id = cm.usuario_id
       ORDER BY cm.created_at DESC
       LIMIT 50`
    );
    const mensajes = rows.reverse().map(r => ({
      ...r,
      isAdmin: !!r.isAdmin,
    }));
    return res.json(mensajes);
  } catch (err) {
    // Si la tabla no existe aún, devolver caché en memoria
    console.warn('chat_mensajes no disponible, usando caché:', err.message);
    return res.json(mensajesCache);
  }
});

// POST /api/chat/mensajes — enviar mensaje (requiere auth)
router.post('/mensajes', authenticateToken, async (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Mensaje vacío' });
  }

  const userName = req.user.nombre || 'Usuario';
  const isAdmin = req.user.rol === 'admin';
  const timestamp = new Date();

  const msgData = {
    user: userName,
    message: message.trim(),
    isAdmin,
    timestamp,
  };

  // Guardar en BD si existe la tabla (sin bloquear la respuesta)
  try {
    await pool.execute(
      'INSERT INTO chat_mensajes (usuario_id, mensaje) VALUES (?, ?)',
      [req.user.id, message.trim()]
    );
  } catch (err) {
    // Si la tabla no existe, guardar en caché
    console.warn('No se pudo guardar en BD, usando caché:', err.message);
    guardarEnCache(msgData);
  }

  // Publicar evento en Pusher para todos los clientes en tiempo real
  try {
    await pusher.trigger('chat', 'new-message', msgData);
  } catch (pusherErr) {
    console.error('Error al publicar en Pusher:', pusherErr.message);
    return res.status(500).json({ error: 'Error al enviar mensaje en tiempo real' });
  }

  return res.json({ ok: true, ...msgData });
});

module.exports = router;
