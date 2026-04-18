/**
 * Script para probar si la conexión a MySQL funciona desde TU PC.
 * Ejecutar desde la carpeta api/api:  node test-db-connection.js
 *
 * Si conecta aquí pero la API en Vercel da 500, la base no es accesible desde internet.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || '172.99.21.54',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'premioclick_premioclick_user',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'premioclick_premioclick_db',
  connectTimeout: 10000,
};

async function test() {
  console.log('Intentando conectar a MySQL...');
  console.log('  Host:', config.host);
  console.log('  Puerto:', config.port);
  console.log('  Usuario:', config.user);
  console.log('  Base de datos:', config.database);
  console.log('  (contraseña oculta)\n');

  if (!config.password) {
    console.error('❌ Falta DB_PASSWORD. Ponla en .env o: set DB_PASSWORD=tu_password && node test-db-connection.js');
    process.exit(1);
  }

  try {
    const conn = await mysql.createConnection(config);
    console.log('✅ CONEXIÓN OK desde tu PC.');
    const [rows] = await conn.execute('SELECT COUNT(*) as total FROM sorteos');
    console.log('   Sorteos en la base:', rows[0].total);
    await conn.end();
    console.log('\nSi la API en Vercel sigue con 500, la base NO es accesible desde internet (solo desde tu red).');
  } catch (err) {
    console.error('❌ ERROR al conectar:');
    console.error('   Código:', err.code);
    console.error('   Mensaje:', err.message);
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
      console.error('\n   La IP puede ser interna o el firewall bloquea. Pide al del servidor host público para MySQL.');
    }
    process.exit(1);
  }
}

test();
