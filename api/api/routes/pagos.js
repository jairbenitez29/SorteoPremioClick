const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const paypal = require('paypal-rest-sdk');
const axios = require('axios');

const router = express.Router();

// Configurar PayPal
// Validar que PAYPAL_MODE sea válido (debe ser "sandbox" o "live")
let paypalMode = (process.env.PAYPAL_MODE || 'sandbox').toLowerCase().trim();
if (paypalMode !== 'sandbox' && paypalMode !== 'live') {
  console.error('⚠️ ADVERTENCIA: PAYPAL_MODE debe ser "sandbox" o "live". Valor actual:', process.env.PAYPAL_MODE);
  console.error('   Usando "sandbox" por defecto');
  paypalMode = 'sandbox';
}

const paypalConfig = {
  mode: paypalMode,
  client_id: process.env.PAYPAL_CLIENT_ID || '',
  client_secret: process.env.PAYPAL_CLIENT_SECRET || ''
};

// Validar que las credenciales estén configuradas
console.log('🔍 ========== CONFIGURACIÓN DE PAYPAL ==========');
console.log('🔍 PAYPAL_MODE (raw):', process.env.PAYPAL_MODE);
console.log('🔍 PAYPAL_MODE (procesado):', paypalMode);
console.log('🔍 PAYPAL_CLIENT_ID (raw):', process.env.PAYPAL_CLIENT_ID ? process.env.PAYPAL_CLIENT_ID.substring(0, 30) + '...' : 'NO CONFIGURADO');
console.log('🔍 PAYPAL_CLIENT_ID (length):', process.env.PAYPAL_CLIENT_ID ? process.env.PAYPAL_CLIENT_ID.length : 0);
console.log('🔍 PAYPAL_CLIENT_SECRET (raw):', process.env.PAYPAL_CLIENT_SECRET ? 'CONFIGURADO (length: ' + process.env.PAYPAL_CLIENT_SECRET.length + ')' : 'NO CONFIGURADO');

if (!paypalConfig.client_id || !paypalConfig.client_secret) {
  console.error('⚠️ ADVERTENCIA: Las credenciales de PayPal no están configuradas en el archivo .env');
  console.error('   PAYPAL_CLIENT_ID:', paypalConfig.client_id ? '✅ Configurado' : '❌ Faltante');
  console.error('   PAYPAL_CLIENT_SECRET:', paypalConfig.client_secret ? '✅ Configurado' : '❌ Faltante');
  console.error('   ⚠️ PayPal NO se configurará hasta que las credenciales estén disponibles');
} else {
  console.log('✅ PayPal configurado correctamente');
  console.log('   Modo:', paypalConfig.mode);
  console.log('   Client ID (primeros 30 chars):', paypalConfig.client_id.substring(0, 30) + '...');
  console.log('   Client ID (longitud):', paypalConfig.client_id.length);
  console.log('   Client Secret (longitud):', paypalConfig.client_secret.length);
  console.log('   Client ID empieza con:', paypalConfig.client_id.substring(0, 2));
  
  // Solo configurar PayPal si las credenciales están disponibles
  try {
    paypal.configure(paypalConfig);
    console.log('✅ PayPal SDK configurado exitosamente');
  } catch (error) {
    console.error('❌ Error al configurar PayPal:', error.message);
    console.error('   El servidor continuará sin PayPal hasta que se corrijan las credenciales');
  }
}
console.log('🔍 ========== FIN CONFIGURACIÓN PAYPAL ==========');

// Endpoint para probar credenciales PayPal (sin autenticación de usuario)
// GET /api/pagos/paypal/test → { ok: true } o { ok: false, error, hint }
router.get('/paypal/test', async (req, res) => {
  const clientId = (process.env.PAYPAL_CLIENT_ID || '').trim();
  const clientSecret = (process.env.PAYPAL_CLIENT_SECRET || '').trim();
  const mode = (process.env.PAYPAL_MODE || 'sandbox').toLowerCase().trim();
  const baseUrl = mode === 'live' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';

  if (!clientId || !clientSecret) {
    return res.status(500).json({
      ok: false,
      error: 'Faltan variables de entorno',
      hint: 'En Vercel → Project → Settings → Environment Variables agrega PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET y PAYPAL_MODE (sandbox o live).',
      config: {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        mode
      }
    });
  }

  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const { status, data } = await axios({
      method: 'post',
      url: `${baseUrl}/v1/oauth2/token`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      },
      data: 'grant_type=client_credentials'
    });

    if (status === 200 && data.access_token) {
      return res.json({
        ok: true,
        message: 'Credenciales PayPal correctas',
        mode
      });
    }
    return res.status(500).json({
      ok: false,
      error: 'PayPal no devolvió token',
      hint: 'Revisa que PAYPAL_MODE coincida con el tipo de credenciales (sandbox vs live).'
    });
  } catch (err) {
    const status = err.response?.status;
    const details = err.response?.data;
    let hint = 'Verifica en Vercel → Environment Variables: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET y PAYPAL_MODE.';

    if (status === 401) {
      hint = 'Client ID o Client Secret incorrectos, o no corresponden al modo "' + mode + '". En developer.paypal.com: Sandbox → credenciales para PAYPAL_MODE=sandbox; Live → credenciales para PAYPAL_MODE=live. Sin espacios al copiar.';
    } else if (status === 400) {
      hint = 'Revisa que PAYPAL_MODE sea exactamente "sandbox" o "live" (minúsculas, sin espacios).';
    }

    return res.status(500).json({
      ok: false,
      error: status === 401 ? 'Error de autenticación con PayPal (401)' : (details?.error_description || err.message || 'Error al conectar con PayPal'),
      paypalError: details?.error,
      hint,
      config: { mode, hasClientId: !!clientId, hasClientSecret: !!clientSecret }
    });
  }
});

// Función de conversión CLP a USD (configurable por env)
// Por defecto: 1000 CLP = 1 USD. Para 50 CLP → 0.05 USD usa TASA_CLP_USD=1000
// Si en PayPal ves 1 USD en vez de 0.05 USD, revisa que los tickets en la BD tengan precio 50 (no 1000)
function convertirCLPaUSD(montoCLP) {
  const TASA_CAMBIO = parseFloat(process.env.TASA_CLP_USD) || 1000;
  const usd = montoCLP / TASA_CAMBIO;
  return Math.round(usd * 100) / 100; // máximo 2 decimales para PayPal
}

// Crear pago PayPal
router.post('/paypal/create', authenticateToken, async (req, res) => {
  try {
    const { ticketIds, monto } = req.body;
    
    // monto viene en CLP (pesos chilenos)
    // Convertir a USD para PayPal
    const montoCLP = parseFloat(monto);
    const montoUSD = convertirCLPaUSD(montoCLP);

    console.log('📝 Solicitud de pago PayPal recibida:', {
      ticketIds,
      montoCLP: montoCLP,
      montoUSD: montoUSD.toFixed(2),
      usuarioId: req.user.id,
      cantidadTickets: ticketIds?.length
    });
    if (montoCLP === 50 && montoUSD >= 1) {
      console.warn('⚠️ 50 CLP se convirtió en', montoUSD, 'USD. Revisa TASA_CLP_USD y que tickets.precio en BD sea 50.');
    }

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      console.error('❌ Error: No se proporcionaron tickets válidos');
      return res.status(400).json({ error: 'Se requieren tickets válidos' });
    }

    if (!montoCLP || montoCLP <= 0) {
      console.error('❌ Error: Monto inválido:', montoCLP);
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }
    
    if (montoUSD <= 0) {
      console.error('❌ Error: Monto en USD inválido después de conversión:', montoUSD);
      return res.status(400).json({ error: 'El monto convertido a USD debe ser mayor a 0' });
    }

    // Verificar que los tickets existan y estén disponibles
    const placeholders = ticketIds.map(() => '?').join(',');
    const [tickets] = await pool.execute(
      `SELECT * FROM tickets WHERE id IN (${placeholders}) AND estado = 'disponible'`,
      ticketIds
    );

    console.log('🎫 Tickets encontrados:', tickets.length, 'de', ticketIds.length, 'solicitados');

    if (tickets.length !== ticketIds.length) {
      console.error('❌ Error: Algunos tickets no están disponibles');
      console.error('   Tickets solicitados:', ticketIds);
      console.error('   Tickets encontrados:', tickets.map(t => t.id));
      return res.status(400).json({ 
        error: 'Algunos tickets no están disponibles o no existen',
        detalles: `Se solicitaron ${ticketIds.length} tickets pero solo se encontraron ${tickets.length} disponibles`
      });
    }

    // Verificar que los tickets pertenezcan al mismo sorteo
    const sorteoIds = [...new Set(tickets.map(t => t.sorteo_id))];
    if (sorteoIds.length > 1) {
      console.error('❌ Error: Los tickets pertenecen a diferentes sorteos:', sorteoIds);
      return res.status(400).json({ 
        error: 'Los tickets deben pertenecer al mismo sorteo' 
      });
    }

    console.log('✅ Validaciones pasadas. Creando pago en PayPal...');
    
    // Verificar que las credenciales de PayPal estén configuradas ANTES de intentar crear el pago
    if (!paypalConfig.client_id || !paypalConfig.client_secret) {
      console.error('❌ Error: Credenciales de PayPal no configuradas');
      console.error('   PAYPAL_CLIENT_ID:', paypalConfig.client_id ? '✅' : '❌ FALTANTE');
      console.error('   PAYPAL_CLIENT_SECRET:', paypalConfig.client_secret ? '✅' : '❌ FALTANTE');
      return res.status(500).json({ 
        error: 'Error de configuración: Las credenciales de PayPal no están configuradas',
        details: 'PAYPAL_CLIENT_ID o PAYPAL_CLIENT_SECRET faltantes en las variables de entorno',
        hint: 'Configura PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET y PAYPAL_MODE en cPanel Node.js App → Environment variables'
      });
    }

    const create_payment_json = {
      intent: 'sale',
      payer: {
        payment_method: 'paypal'
      },
      redirect_urls: {
        return_url: `${process.env.BACKEND_URL || 'https://premioclick.cl'}/api/pagos/paypal/return?success=true&source=web`,
        cancel_url: `${process.env.BACKEND_URL || 'https://premioclick.cl'}/api/pagos/paypal/return?success=false&source=web`
      },
      transactions: [{
        item_list: {
          items: [{
            name: `Ticket${ticketIds.length > 1 ? 's' : ''} de Sorteo`,
            sku: ticketIds.join(','),
            price: montoUSD.toFixed(2),
            currency: 'USD',
            quantity: 1
          }]
        },
        amount: {
          currency: 'USD',
          total: montoUSD.toFixed(2)
        },
        description: `Compra de ${ticketIds.length} ticket${ticketIds.length > 1 ? 's' : ''} (${montoCLP.toFixed(0)} CLP = ${montoUSD.toFixed(2)} USD)`
      }]
    };

    console.log('📝 Intentando crear pago PayPal con configuración:');
    console.log('   Mode:', paypalConfig.mode);
    console.log('   Client ID:', paypalConfig.client_id ? paypalConfig.client_id.substring(0, 20) + '...' : 'NO CONFIGURADO');
    console.log('   Client Secret:', paypalConfig.client_secret ? '✅ Configurado' : '❌ NO CONFIGURADO');
    console.log('   Monto CLP (original):', montoCLP.toFixed(0), 'CLP');
    console.log('   Monto USD (para PayPal):', montoUSD.toFixed(2), 'USD');
    console.log('   Tasa de cambio: 1000 CLP = 1 USD');
    console.log('   Cantidad de tickets:', ticketIds.length);
    
    paypal.payment.create(create_payment_json, async (error, payment) => {
      if (error) {
        console.error('❌ Error PayPal al crear pago:');
        console.error('   Mensaje:', error.message);
        console.error('   Response Status:', error.response?.status || error.httpStatusCode);
        console.error('   Response:', error.response);
        console.error('   Error Name:', error.response?.name || error.name);
        console.error('   Error Description:', error.response?.error_description || error.error_description);
        console.error('   Detalles completos:', JSON.stringify(error, null, 2));
        console.error('   PayPal Client ID configurado:', paypalConfig.client_id ? paypalConfig.client_id.substring(0, 20) + '...' : 'NO CONFIGURADO');
        console.error('   PayPal Client Secret configurado:', paypalConfig.client_secret ? 'SÍ (oculto)' : 'NO CONFIGURADO');
        console.error('   PayPal Mode:', paypalConfig.mode);
        
        // Verificar si es un error de autenticación
        if (error.response && (error.response.name === 'AUTHENTICATION_FAILURE' || error.response.status === 401 || error.httpStatusCode === 401)) {
          return res.status(401).json({ 
            error: 'Error de autenticación con PayPal',
            details: 'Response Status : 401 - Client Authentication failed',
            paypalError: error.response?.error || 'AUTHENTICATION_FAILURE',
            hint: 'Las credenciales de PayPal (Client ID o Client Secret) son incorrectas o no corresponden al modo ' + paypalConfig.mode + '. Verifica en cPanel Node.js App → Environment variables que PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET y PAYPAL_MODE estén correctamente configuradas.'
          });
        }
        
        // Verificar si es un error de modo incorrecto
        if (error.message && error.message.includes('Mode must be')) {
          return res.status(500).json({ 
            error: 'Error de configuración de PayPal',
            details: 'PAYPAL_MODE debe ser exactamente "sandbox" o "live"',
            paypalError: 'CONFIGURATION_ERROR',
            hint: 'Verifica que PAYPAL_MODE en cPanel sea exactamente "sandbox" o "live" (sin espacios, en minúsculas)'
          });
        }
        
        // Verificar si el error contiene información de 401 que no fue capturada antes
        if (error.httpStatusCode === 401 || error.response?.status === 401 || 
            error.response?.error === 'invalid_client' || 
            error.response?.error_description?.includes('Authentication failed')) {
          return res.status(401).json({ 
            error: 'Error de autenticación con PayPal',
            details: 'Response Status : 401 - Client Authentication failed',
            paypalError: error.response?.error || 'AUTHENTICATION_FAILURE',
            hint: 'Las credenciales de PayPal (Client ID o Client Secret) son incorrectas o no corresponden al modo ' + paypalConfig.mode + '. Verifica en cPanel Node.js App → Environment variables que PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET y PAYPAL_MODE estén correctamente configuradas. NO puedes usar credenciales de SANDBOX con PAYPAL_MODE=live ni viceversa.'
          });
        }
        
        // Error genérico de PayPal
        const errorMessage = error.response?.error_description || error.response?.message || error.message || 'Error desconocido de PayPal';
        const errorName = error.response?.error || error.response?.name || error.name || 'Error';
        return res.status(500).json({ 
          error: 'Error al crear pago PayPal',
          details: errorMessage,
          paypalError: errorName,
          hint: 'Revisa los logs del servidor para más detalles. Verifica que las credenciales de PayPal sean correctas y correspondan al modo ' + paypalConfig.mode + '.'
        });
      }

      // Guardar pago en BD (guardamos el monto original en CLP)
      const { DB_TYPE } = require('../config/database');
      let insertQuery = 'INSERT INTO pagos (usuario_id, monto, metodo_pago, estado, datos_pago) VALUES (?, ?, ?, ?, ?)';
      
      if (DB_TYPE === 'postgres') {
        insertQuery += ' RETURNING id';
      }
      
      // Guardar monto original en CLP y también el monto en USD en datos_pago para referencia
      const [pagoResult] = await pool.execute(
        insertQuery,
        [req.user.id, montoCLP, 'paypal', 'pendiente', JSON.stringify({ 
          paymentId: payment.id, 
          ticketIds,
          montoCLP: montoCLP,
          montoUSD: montoUSD,
          tasaCambio: '1000 CLP = 1 USD'
        })]
      );

      // Obtener el ID del pago insertado
      let pagoId;
      if (DB_TYPE === 'postgres') {
        pagoId = pagoResult[0]?.id || pagoResult.insertId;
      } else {
        pagoId = pagoResult.insertId;
      }

      // Buscar approval URL
      const approvalUrl = payment.links.find(link => link.rel === 'approval_url');

      if (!approvalUrl || !approvalUrl.href) {
        return res.status(500).json({ 
          error: 'No se pudo obtener la URL de aprobación de PayPal',
          details: 'PayPal no devolvió la URL de aprobación'
        });
      }

      res.json({
        paymentId: payment.id,
        approvalUrl: approvalUrl.href,
        pagoId: pagoId
      });
    });
  } catch (error) {
    console.error('Error al crear pago PayPal:', error);
    res.status(500).json({ error: 'Error al crear pago PayPal' });
  }
});

// Endpoint para manejar retorno de PayPal (sin autenticación, PayPal redirige aquí)
router.get('/paypal/return', async (req, res) => {
  try {
    const { paymentId, PayerID, success, source } = req.query;

    // Si viene de la web, redirigir a la página web
    if (source === 'web') {
      if (success === 'false' || !paymentId || !PayerID) {
        return res.redirect(`${process.env.FRONTEND_URL || 'https://premioclick.cl'}/pago-cancelado.html?paymentId=${paymentId || ''}`);
      }
      
      // Redirigir a la página de confirmación de pago en la web
      return res.redirect(`${process.env.FRONTEND_URL || 'https://premioclick.cl'}/pago-exitoso.html?paymentId=${paymentId}&PayerID=${PayerID}`);
    }

    // Si viene de la app móvil, usar deep linking
    if (success === 'false' || !paymentId || !PayerID) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:19006'}/pago/cancelado`);
    }

    // Redirigir a la app con los parámetros
    const redirectUrl = `sorteosapp://pago/paypal?paymentId=${paymentId}&PayerID=${PayerID}`;
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error en retorno PayPal:', error);
    const source = req.query.source;
    if (source === 'web') {
      return res.redirect(`${process.env.FRONTEND_URL || 'https://premioclick.cl'}/pago-error.html`);
    }
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:19006'}/pago/error`);
  }
});

// Ejecutar pago PayPal
router.post('/paypal/execute', authenticateToken, async (req, res) => {
  try {
    const { paymentId, payerId, pagoId } = req.body;

    if (!paymentId || !payerId) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos: paymentId y payerId son obligatorios' });
    }

    // Si no se proporciona pagoId, buscarlo por paymentId en datos_pago
    let pagoIdFinal = pagoId;
    if (!pagoIdFinal) {
      const { DB_TYPE } = require('../config/database');
      let searchQuery;
      
      if (DB_TYPE === 'postgres') {
        // PostgreSQL: buscar en JSON
        searchQuery = `SELECT id FROM pagos WHERE datos_pago::json->>'paymentId' = $1 AND estado = 'pendiente' ORDER BY created_at DESC LIMIT 1`;
      } else {
        // MySQL: buscar en JSON
        searchQuery = `SELECT id FROM pagos WHERE JSON_EXTRACT(datos_pago, '$.paymentId') = ? AND estado = 'pendiente' ORDER BY created_at DESC LIMIT 1`;
      }
      
      const [pagos] = await pool.execute(searchQuery, [paymentId]);
      if (pagos.length === 0) {
        return res.status(404).json({ error: 'No se encontró un pago pendiente con ese paymentId' });
      }
      pagoIdFinal = pagos[0].id;
    }

    const execute_payment_json = {
      payer_id: payerId
    };

    paypal.payment.execute(paymentId, execute_payment_json, async (error, payment) => {
      if (error) {
        console.error('Error al ejecutar pago PayPal:', error);
        
        // Actualizar pago como fallido
        await pool.execute(
          'UPDATE pagos SET estado = "fallido" WHERE id = ?',
          [pagoIdFinal]
        );

        return res.status(500).json({ error: 'Error al ejecutar pago PayPal' });
      }

      if (payment.state === 'approved') {
        // Obtener datos del pago
        const [pagos] = await pool.execute('SELECT * FROM pagos WHERE id = ?', [pagoIdFinal]);
        const pago = pagos[0];
        const datosPago = JSON.parse(pago.datos_pago || '{}');
        const ticketIds = datosPago.ticketIds || [];

        // Actualizar tickets como vendidos
        for (const ticketId of ticketIds) {
          await pool.execute(
            'UPDATE tickets SET usuario_id = ?, estado = "vendido", fecha_compra = NOW() WHERE id = ? AND estado = "disponible"',
            [req.user.id, ticketId]
          );
        }

        // Actualizar pago como completado
        await pool.execute(
          'UPDATE pagos SET estado = "completado", transaccion_id = ? WHERE id = ?',
          [paymentId, pagoIdFinal]
        );

        res.json({
          success: true,
          message: 'Pago completado correctamente',
          payment
        });
      } else {
        res.status(400).json({ error: 'Pago no aprobado' });
      }
    });
  } catch (error) {
    console.error('Error al ejecutar pago PayPal:', error);
    res.status(500).json({ error: 'Error al ejecutar pago PayPal' });
  }
});

// Crear pago Transbank
router.post('/transbank/create', authenticateToken, async (req, res) => {
  try {
    const { ticketIds, monto } = req.body;

    if (!ticketIds || ticketIds.length === 0) {
      return res.status(400).json({ error: 'Se requieren tickets' });
    }

    // Guardar pago en BD primero
    const { DB_TYPE } = require('../config/database');
    let insertQuery = 'INSERT INTO pagos (usuario_id, monto, metodo_pago, estado, datos_pago) VALUES (?, ?, ?, ?, ?)';
    
    if (DB_TYPE === 'postgres') {
      insertQuery += ' RETURNING id';
    }
    
    const [pagoResult] = await pool.execute(
      insertQuery,
      [req.user.id, monto, 'transbank', 'pendiente', JSON.stringify({ ticketIds })]
    );

    // Obtener el ID del pago insertado
    let pagoId;
    if (DB_TYPE === 'postgres') {
      pagoId = pagoResult[0]?.id || pagoResult.insertId;
    } else {
      pagoId = pagoResult.insertId;
    }

    // Crear transacción en Transbank (Webpay Plus)
    const transbankConfig = {
      headers: {
        'Tbk-Api-Key-Id': process.env.TRANSBANK_API_KEY || '',
        'Tbk-Api-Key-Secret': process.env.TRANSBANK_SECRET_KEY || '',
        'Content-Type': 'application/json'
      }
    };

    const buyOrder = `TBK-${pagoId}-${Date.now()}`;
    const sessionId = `SESSION-${req.user.id}-${Date.now()}`;

    const transbankData = {
      buy_order: buyOrder,
      session_id: sessionId,
      amount: Math.round(monto),
      return_url: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/pagos/transbank/return`
    };

    const environment = process.env.TRANSBANK_ENVIRONMENT || 'integration';
    const transbankUrl = environment === 'production' 
      ? 'https://webpay3g.transbank.cl/rswebpaytransaction/api/webpay/v1.2/transactions'
      : 'https://webpay3gint.transbank.cl/rswebpaytransaction/api/webpay/v1.2/transactions';

    try {
      const response = await axios.post(transbankUrl, transbankData, transbankConfig);

      // Actualizar pago con token de Transbank
      await pool.execute(
        'UPDATE pagos SET datos_pago = ?, transaccion_id = ? WHERE id = ?',
        [
          JSON.stringify({ ticketIds, buyOrder, sessionId, token: response.data.token }),
          buyOrder,
          pagoId
        ]
      );

      res.json({
        token: response.data.token,
        url: response.data.url,
        pagoId
      });
    } catch (transbankError) {
      // Si Transbank falla, marcar el pago como fallido
      await pool.execute(
        'UPDATE pagos SET estado = "fallido" WHERE id = ?',
        [pagoId]
      );
      throw transbankError;
    }
  } catch (error) {
    console.error('Error al crear pago Transbank:', error);
    res.status(500).json({ error: 'Error al crear pago Transbank' });
  }
});

// Confirmar pago Transbank
router.post('/transbank/confirm', authenticateToken, async (req, res) => {
  try {
    const { token_ws, pagoId } = req.body;

    // Obtener datos del pago
    const [pagos] = await pool.execute('SELECT * FROM pagos WHERE id = ?', [pagoId]);
    if (pagos.length === 0) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    const pago = pagos[0];
    const datosPago = JSON.parse(pago.datos_pago || '{}');

    // Confirmar transacción en Transbank
    const transbankConfig = {
      headers: {
        'Tbk-Api-Key-Id': process.env.TRANSBANK_API_KEY || '',
        'Tbk-Api-Key-Secret': process.env.TRANSBANK_SECRET_KEY || '',
        'Content-Type': 'application/json'
      }
    };

    const environment = process.env.TRANSBANK_ENVIRONMENT || 'integration';
    const transbankUrl = environment === 'production'
      ? `https://webpay3g.transbank.cl/rswebpaytransaction/api/webpay/v1.2/transactions/${token_ws}`
      : `https://webpay3gint.transbank.cl/rswebpaytransaction/api/webpay/v1.2/transactions/${token_ws}`;

    try {
      const response = await axios.put(transbankUrl, {}, transbankConfig);

      if (response.data.status === 'AUTHORIZED') {
        const ticketIds = datosPago.ticketIds || [];

        // Actualizar tickets como vendidos
        for (const ticketId of ticketIds) {
          await pool.execute(
            'UPDATE tickets SET usuario_id = ?, estado = "vendido", fecha_compra = NOW() WHERE id = ? AND estado = "disponible"',
            [req.user.id, ticketId]
          );
        }

        // Actualizar pago como completado
        await pool.execute(
          'UPDATE pagos SET estado = "completado", transaccion_id = ? WHERE id = ?',
          [token_ws, pagoId]
        );

        res.json({
          success: true,
          message: 'Pago completado correctamente',
          transaction: response.data
        });
      } else {
        await pool.execute(
          'UPDATE pagos SET estado = "fallido" WHERE id = ?',
          [pagoId]
        );

        res.status(400).json({ error: 'Pago no autorizado' });
      }
    } catch (transbankError) {
      await pool.execute(
        'UPDATE pagos SET estado = "fallido" WHERE id = ?',
        [pagoId]
      );
      throw transbankError;
    }
  } catch (error) {
    console.error('Error al confirmar pago Transbank:', error);
    res.status(500).json({ error: 'Error al confirmar pago Transbank' });
  }
});

module.exports = router;
