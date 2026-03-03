const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const paypal = require('paypal-rest-sdk');
const axios = require('axios');

const router = express.Router();

// Configurar PayPal
let paypalMode = (process.env.PAYPAL_MODE || 'sandbox').toLowerCase().trim();
if (paypalMode !== 'sandbox' && paypalMode !== 'live') {
  console.error('⚠️ ADVERTENCIA: PAYPAL_MODE debe ser "sandbox" o "live". Valor actual:', process.env.PAYPAL_MODE);
  paypalMode = 'sandbox';
}

const paypalConfig = {
  mode: paypalMode,
  client_id: process.env.PAYPAL_CLIENT_ID || '',
  client_secret: process.env.PAYPAL_CLIENT_SECRET || ''
};

if (!paypalConfig.client_id || !paypalConfig.client_secret) {
  console.error('⚠️ ADVERTENCIA: Las credenciales de PayPal no están configuradas en el archivo .env');
} else {
  try {
    paypal.configure(paypalConfig);
    console.log('✅ PayPal SDK configurado correctamente. Modo:', paypalConfig.mode);
  } catch (error) {
    console.error('❌ Error al configurar PayPal:', error.message);
  }
}

// Conversión CLP → USD (1000 CLP = 1 USD). PayPal cobra en USD.
function convertirCLPaUSD(montoCLP) {
  const TASA_CAMBIO = 1000;
  return montoCLP / TASA_CAMBIO;
}

// Crear pago PayPal
router.post('/paypal/create', authenticateToken, async (req, res) => {
  try {
    // La app envía monto en CLP (pesos chilenos). Aceptar monto o montoClp.
    const montoCLP = parseFloat(req.body.monto) || parseFloat(req.body.montoClp) || 0;

    if (!Number.isFinite(montoCLP) || montoCLP <= 0) {
      console.error('❌ Error: Monto inválido (debe ser número > 0 en CLP):', req.body.monto, req.body.montoClp);
      return res.status(400).json({ error: 'El monto debe ser mayor a 0 (en CLP)' });
    }

    // Convertir a USD para PayPal
    let montoUSD = convertirCLPaUSD(montoCLP);
    montoUSD = Math.round(montoUSD * 100) / 100;
    // Mínimo que suele aceptar PayPal (evita "Invalid request" por montos muy bajos)
    if (montoUSD < 0.01) montoUSD = 0.01;

    const { ticketIds } = req.body;

    console.log('📝 Pago PayPal - monto CLP:', montoCLP, '| monto USD:', montoUSD.toFixed(2), '| tickets:', ticketIds?.length);

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({ error: 'Se requieren tickets válidos' });
    }

    // Verificar que los tickets existan y estén disponibles
    const placeholders = ticketIds.map(() => '?').join(',');
    const [tickets] = await pool.execute(
      `SELECT * FROM tickets WHERE id IN (${placeholders}) AND estado = 'disponible'`,
      ticketIds
    );

    if (tickets.length !== ticketIds.length) {
      console.error('❌ Algunos tickets no disponibles. Solicitados:', ticketIds.length, 'Encontrados:', tickets.length);
      return res.status(400).json({
        error: 'Algunos tickets no están disponibles o no existen',
        detalles: `Se solicitaron ${ticketIds.length} tickets pero solo ${tickets.length} están disponibles. Intenta de nuevo.`
      });
    }

    const sorteoIds = [...new Set(tickets.map(t => t.sorteo_id))];
    if (sorteoIds.length > 1) {
      return res.status(400).json({ error: 'Los tickets deben pertenecer al mismo sorteo' });
    }

    if (!paypalConfig.client_id || !paypalConfig.client_secret) {
      return res.status(500).json({
        error: 'Error de configuración: Credenciales de PayPal no configuradas',
        details: 'Configura PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET en las variables de entorno'
      });
    }

    const create_payment_json = {
      intent: 'sale',
      payer: { payment_method: 'paypal' },
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
        description: `Compra de ${ticketIds.length} ticket(s) - ${montoCLP.toFixed(0)} CLP = ${montoUSD.toFixed(2)} USD`
      }]
    };

    paypal.payment.create(create_payment_json, async (error, payment) => {
      if (error) {
        console.error('❌ Error PayPal create:', error.message, error.response || '');
        const msg = error.response?.error_description || error.response?.message || error.message || 'Invalid request - see details';
        if (error.response?.status === 401 || error.response?.name === 'AUTHENTICATION_FAILURE') {
          return res.status(401).json({
            error: 'Error de autenticación con PayPal',
            details: msg,
            hint: 'Revisa PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET (y PAYPAL_MODE) en cPanel.'
          });
        }
        return res.status(500).json({
          error: 'Error al crear pago PayPal',
          details: msg
        });
      }

      const { DB_TYPE } = require('../config/database');
      let insertQuery = 'INSERT INTO pagos (usuario_id, monto, metodo_pago, estado, datos_pago) VALUES (?, ?, ?, ?, ?)';
      if (DB_TYPE === 'postgres') insertQuery += ' RETURNING id';

      const [pagoResult] = await pool.execute(
        insertQuery,
        [req.user.id, montoCLP, 'paypal', 'pendiente', JSON.stringify({
          paymentId: payment.id,
          ticketIds,
          montoCLP,
          montoUSD,
          tasaCambio: '1000 CLP = 1 USD'
        })]
      );

      let pagoId = DB_TYPE === 'postgres' ? (pagoResult[0]?.id || pagoResult.insertId) : pagoResult.insertId;

      const approvalUrl = payment.links.find(link => link.rel === 'approval_url');
      if (!approvalUrl || !approvalUrl.href) {
        return res.status(500).json({ error: 'No se pudo obtener la URL de aprobación de PayPal' });
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

// Retorno de PayPal (web o app)
router.get('/paypal/return', async (req, res) => {
  try {
    const { paymentId, PayerID, success, source } = req.query;

    if (source === 'web') {
      if (success === 'false' || !paymentId || !PayerID) {
        return res.redirect(`${process.env.FRONTEND_URL || 'https://premioclick.cl'}/pago-cancelado.html?paymentId=${paymentId || ''}`);
      }
      return res.redirect(`${process.env.FRONTEND_URL || 'https://premioclick.cl'}/pago-exitoso.html?paymentId=${paymentId}&PayerID=${PayerID}`);
    }

    if (success === 'false' || !paymentId || !PayerID) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:19006'}/pago/cancelado`);
    }

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

// Ejecutar pago PayPal (después de que el usuario paga en PayPal)
router.post('/paypal/execute', authenticateToken, async (req, res) => {
  try {
    const { paymentId, payerId, pagoId } = req.body;

    if (!paymentId || !payerId) {
      return res.status(400).json({ error: 'Faltan paymentId y payerId' });
    }

    let pagoIdFinal = pagoId;
    if (!pagoIdFinal) {
      const { DB_TYPE } = require('../config/database');
      const searchQuery = DB_TYPE === 'postgres'
        ? `SELECT id FROM pagos WHERE datos_pago::json->>'paymentId' = $1 AND estado = 'pendiente' ORDER BY created_at DESC LIMIT 1`
        : `SELECT id FROM pagos WHERE JSON_EXTRACT(datos_pago, '$.paymentId') = ? AND estado = 'pendiente' ORDER BY created_at DESC LIMIT 1`;
      const [pagos] = await pool.execute(searchQuery, [paymentId]);
      if (pagos.length === 0) {
        return res.status(404).json({ error: 'No se encontró un pago pendiente con ese paymentId' });
      }
      pagoIdFinal = pagos[0].id;
    }

    const execute_payment_json = { payer_id: payerId };

    paypal.payment.execute(paymentId, execute_payment_json, async (error, payment) => {
      if (error) {
        console.error('Error al ejecutar pago PayPal:', error);
        await pool.execute('UPDATE pagos SET estado = ? WHERE id = ?', ['fallido', pagoIdFinal]);
        return res.status(500).json({ error: 'Error al ejecutar pago PayPal' });
      }

      if (payment.state === 'approved') {
        const [pagos] = await pool.execute('SELECT * FROM pagos WHERE id = ?', [pagoIdFinal]);
        const pago = pagos[0];
        const datosPago = typeof pago.datos_pago === 'string' ? JSON.parse(pago.datos_pago || '{}') : (pago.datos_pago || {});
        const ticketIds = datosPago.ticketIds || [];

        for (const ticketId of ticketIds) {
          await pool.execute(
            'UPDATE tickets SET usuario_id = ?, estado = ?, fecha_compra = NOW() WHERE id = ? AND estado = ?',
            [req.user.id, 'vendido', ticketId, 'disponible']
          );
        }

        await pool.execute(
          'UPDATE pagos SET estado = ?, transaccion_id = ? WHERE id = ?',
          ['completado', paymentId, pagoIdFinal]
        );

        res.json({ success: true, message: 'Pago completado correctamente', payment });
      } else {
        res.status(400).json({ error: 'Pago no aprobado' });
      }
    });
  } catch (error) {
    console.error('Error al ejecutar pago PayPal:', error);
    res.status(500).json({ error: 'Error al ejecutar pago PayPal' });
  }
});

// Transbank (sin cambios de lógica, solo estructura)
router.post('/transbank/create', authenticateToken, async (req, res) => {
  try {
    const { ticketIds, monto } = req.body;
    if (!ticketIds || ticketIds.length === 0) {
      return res.status(400).json({ error: 'Se requieren tickets' });
    }

    const { DB_TYPE } = require('../config/database');
    let insertQuery = 'INSERT INTO pagos (usuario_id, monto, metodo_pago, estado, datos_pago) VALUES (?, ?, ?, ?, ?)';
    if (DB_TYPE === 'postgres') insertQuery += ' RETURNING id';

    const [pagoResult] = await pool.execute(
      insertQuery,
      [req.user.id, monto, 'transbank', 'pendiente', JSON.stringify({ ticketIds })]
    );

    let pagoId = DB_TYPE === 'postgres' ? (pagoResult[0]?.id || pagoResult.insertId) : pagoResult.insertId;

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

    const response = await axios.post(transbankUrl, transbankData, transbankConfig);
    await pool.execute(
      'UPDATE pagos SET datos_pago = ?, transaccion_id = ? WHERE id = ?',
      [JSON.stringify({ ticketIds, buyOrder, sessionId, token: response.data.token }), buyOrder, pagoId]
    );

    res.json({ token: response.data.token, url: response.data.url, pagoId });
  } catch (transbankError) {
    if (pagoId) await pool.execute('UPDATE pagos SET estado = ? WHERE id = ?', ['fallido', pagoId]);
    throw transbankError;
  }
});

router.post('/transbank/confirm', authenticateToken, async (req, res) => {
  try {
    const { token_ws, pagoId } = req.body;
    const [pagos] = await pool.execute('SELECT * FROM pagos WHERE id = ?', [pagoId]);
    if (pagos.length === 0) return res.status(404).json({ error: 'Pago no encontrado' });

    const pago = pagos[0];
    const datosPago = typeof pago.datos_pago === 'string' ? JSON.parse(pago.datos_pago || '{}') : (pago.datos_pago || {});
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

    const response = await axios.put(transbankUrl, {}, transbankConfig);

    if (response.data.status === 'AUTHORIZED') {
      const ticketIds = datosPago.ticketIds || [];
      for (const ticketId of ticketIds) {
        await pool.execute(
          'UPDATE tickets SET usuario_id = ?, estado = ?, fecha_compra = NOW() WHERE id = ? AND estado = ?',
          [req.user.id, 'vendido', ticketId, 'disponible']
        );
      }
      await pool.execute('UPDATE pagos SET estado = ?, transaccion_id = ? WHERE id = ?', ['completado', token_ws, pagoId]);
      res.json({ success: true, message: 'Pago completado correctamente', transaction: response.data });
    } else {
      await pool.execute('UPDATE pagos SET estado = ? WHERE id = ?', ['fallido', pagoId]);
      res.status(400).json({ error: 'Pago no autorizado' });
    }
  } catch (error) {
    console.error('Error al confirmar pago Transbank:', error);
    res.status(500).json({ error: 'Error al confirmar pago Transbank' });
  }
});

module.exports = router;
