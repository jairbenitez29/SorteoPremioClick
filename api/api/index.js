// Handler para Vercel (Serverless)
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { initializeDatabase } = require('../config/database');
const { pool } = require('../config/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir archivos estáticos (imágenes subidas)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Servir página web
app.use(express.static(path.join(__dirname, '../../web')));

// Rutas
const authRoutes = require('../routes/auth');
const sorteoRoutes = require('../routes/sorteos');
const ticketRoutes = require('../routes/tickets');
const pagoRoutes = require('../routes/pagos');
const tombolaRoutes = require('../routes/tombola');
const adminRoutes = require('../routes/admin');
const promocionesRoutes = require('../routes/promociones');

app.use('/api/auth', authRoutes);
app.use('/api/sorteos', sorteoRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api/tombola', tombolaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/promociones', promocionesRoutes);

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor funcionando correctamente' });
});

// Inicializar base de datos (solo una vez)
let dbInitialized = false;

async function initDatabase() {
  if (!dbInitialized) {
    try {
      await initializeDatabase();
      dbInitialized = true;
      console.log('✅ Base de datos inicializada');
    } catch (error) {
      console.error('❌ Error al inicializar base de datos:', error);
    }
  }
}

// Inicializar base de datos al cargar el módulo
initDatabase();

// Socket.io para chat
const connectedUsers = new Map(); // socket.id -> { userId, nombre, rol }
let userCount = 0;

// Middleware para autenticar sockets
async function authenticateSocket(socket, next) {
  const token = socket.handshake.auth?.token;
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secret_key_super_segura_aqui');
      const [users] = await pool.execute(
        'SELECT id, nombre, email, rol FROM usuarios WHERE id = ?',
        [decoded.userId]
      );
      
      if (users.length > 0) {
        socket.user = users[0];
      }
    } catch (error) {
      console.log('Token inválido en socket:', error.message);
    }
  }
  
  next();
}

io.use(authenticateSocket);

io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);
  userCount++;
  io.emit('user-count', userCount);

  // Autenticar usuario cuando se conecta
  socket.on('authenticate', async (data) => {
    if (data.token) {
      try {
        const decoded = jwt.verify(data.token, process.env.JWT_SECRET || 'tu_secret_key_super_segura_aqui');
        const [users] = await pool.execute(
          'SELECT id, nombre, email, rol FROM usuarios WHERE id = ?',
          [decoded.userId]
        );
        
        if (users.length > 0) {
          const user = users[0];
          connectedUsers.set(socket.id, {
            userId: user.id,
            nombre: user.nombre,
            rol: user.rol
          });
          socket.user = user;
          console.log(`Usuario autenticado en socket: ${user.nombre} (${user.rol})`);
        }
      } catch (error) {
        console.log('Error al autenticar socket:', error.message);
      }
    }
  });

  socket.on('chat-message', (data) => {
    console.log('🔍 Mensaje recibido en chat:', data);
    const userInfo = connectedUsers.get(socket.id) || socket.user;
    let userName = 'Usuario';
    let isAdmin = false;
    
    if (userInfo) {
      userName = userInfo.nombre || userInfo.nombre || 'Usuario';
      isAdmin = userInfo.rol === 'admin' || (userInfo.rol && userInfo.rol.toLowerCase() === 'admin');
    }
    
    console.log('🔍 Enviando mensaje a todos:', { user: userName, message: data.message, isAdmin });
    
    io.emit('chat-message', {
      user: userName,
      message: data.message,
      isAdmin: isAdmin,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado:', socket.id);
    const userInfo = connectedUsers.get(socket.id);
    if (userInfo) {
      connectedUsers.delete(socket.id);
      socket.broadcast.emit('chat-message', {
        user: 'Sistema',
        message: `${userInfo.nombre || 'Usuario'} abandonó el chat`,
        isAdmin: false,
        timestamp: new Date()
      });
    }
    userCount--;
    io.emit('user-count', userCount);
  });
});

// Exportar para Vercel
module.exports = app;


