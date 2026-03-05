/**
 * REEMPLAZA en tu server.js el bloque final (desde "// Inicializar servidor"
 * o "const PORT = process.env.PORT" hasta el final del archivo) por este código.
 * Así la app funciona en Vercel (exporta app) y en local/servidor (listen).
 */

// Inicializar servidor
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// En Vercel: exportar la app para serverless. No hacer listen().
if (process.env.VERCEL) {
  initializeDatabase()
    .then(() => {
      console.log('Base de datos lista (Vercel)');
    })
    .catch((err) => {
      console.error('Error init DB en Vercel:', err);
    });
  module.exports = app;
} else {
  // Local o servidor normal: arrancar con listen
  initializeDatabase()
    .then(() => {
      server.listen(PORT, HOST, () => {
        console.log(`Servidor corriendo en puerto ${PORT}`);
        console.log(`API: http://localhost:${PORT}/api`);
      });
    })
    .catch((error) => {
      console.error('Error al iniciar el servidor:', error);
      process.exit(1);
    });
}
