const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secret_key_super_segura_aqui');
    
    // Verificar que el usuario existe
    const [users] = await pool.execute(
      'SELECT id, nombre, email, rol FROM usuarios WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Usuario no válido' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    console.error('Error en authenticateToken:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expirado. Por favor, inicia sesión nuevamente' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Token inválido' });
    }
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};

// Middleware para verificar que el usuario es administrador
const isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Error al verificar permisos' });
  }
};

module.exports = { authenticateToken, isAdmin };

