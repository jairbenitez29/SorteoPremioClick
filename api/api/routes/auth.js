const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Registro
router.post('/register', [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, email, password, telefono } = req.body;

    // Verificar si el usuario ya existe
    const [existingUsers] = await pool.execute(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    // En PostgreSQL necesitamos usar RETURNING id
    const { DB_TYPE } = require('../config/database');
    let insertQuery = 'INSERT INTO usuarios (nombre, email, password, telefono) VALUES (?, ?, ?, ?)';
    
    if (DB_TYPE === 'postgres') {
      insertQuery += ' RETURNING id';
    }
    
    const [result] = await pool.execute(
      insertQuery,
      [nombre, email, hashedPassword, telefono || null]
    );

    // Obtener el ID del usuario creado
    const userId = DB_TYPE === 'postgres' ? (result[0]?.id || result.insertId) : result.insertId;

    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'tu_secret_key_super_segura_aqui',
      { expiresIn: '7d' }
    );

    // Obtener el usuario con su rol
    const [newUser] = await pool.execute(
      'SELECT id, nombre, email, rol, telefono FROM usuarios WHERE id = ?',
      [userId]
    );

    res.status(201).json({
      message: 'Usuario registrado correctamente',
      token,
      user: newUser[0]
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('La contraseña es requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Buscar usuario
    const [users] = await pool.execute(
      'SELECT id, nombre, email, password FROM usuarios WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = users[0];

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'tu_secret_key_super_segura_aqui',
      { expiresIn: '7d' }
    );

    // Obtener el usuario con su rol
    const [userWithRole] = await pool.execute(
      'SELECT id, nombre, email, rol, telefono FROM usuarios WHERE id = ?',
      [user.id]
    );

    const userData = userWithRole[0];
    console.log('Usuario logueado (backend):', userData); // Debug

    res.json({
      message: 'Login exitoso',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Verificar token
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secret_key_super_segura_aqui');
    
    const [users] = await pool.execute(
      'SELECT id, nombre, email, rol, telefono FROM usuarios WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Usuario no válido' });
    }

    const userData = users[0];
    console.log('Usuario verificado (backend verify):', userData); // Debug
    
    res.json({ user: userData });
  } catch (error) {
    res.status(403).json({ error: 'Token inválido' });
  }
});

// Actualizar perfil
router.put('/profile', authenticateToken, [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('email').isEmail().withMessage('Email inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, email, telefono } = req.body;

    // Verificar si el email ya está en uso por otro usuario
    const [existingUsers] = await pool.execute(
      'SELECT id FROM usuarios WHERE email = ? AND id != ?',
      [email, req.user.id]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'El email ya está en uso' });
    }

    // Actualizar usuario
    await pool.execute(
      'UPDATE usuarios SET nombre = ?, email = ?, telefono = ? WHERE id = ?',
      [nombre, email, telefono || null, req.user.id]
    );

    // Obtener usuario actualizado
    const [updatedUsers] = await pool.execute(
      'SELECT id, nombre, email, telefono, rol FROM usuarios WHERE id = ?',
      [req.user.id]
    );

    res.json({
      message: 'Perfil actualizado correctamente',
      user: updatedUsers[0]
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// Cambiar contraseña
router.put('/change-password', authenticateToken, [
  body('password_actual').notEmpty().withMessage('La contraseña actual es requerida'),
  body('nueva_password').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { password_actual, nueva_password } = req.body;

    // Obtener usuario con contraseña
    const [users] = await pool.execute(
      'SELECT password FROM usuarios WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar contraseña actual
    const isValidPassword = await bcrypt.compare(password_actual, users[0].password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(nueva_password, 10);

    // Actualizar contraseña
    await pool.execute(
      'UPDATE usuarios SET password = ? WHERE id = ?',
      [hashedPassword, req.user.id]
    );

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
});

module.exports = router;

