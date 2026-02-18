# 🔧 Solución de Errores de PayPal en la Web

## Mejoras Realizadas

✅ **Mejorado el manejo de errores** en `web/comprar-ticket.js`:
- Logging detallado de cada paso del proceso de pago
- Mensajes de error más descriptivos según el tipo de error
- Mejor visualización de errores (soporte para saltos de línea)
- Manejo específico para errores 401, 400, 500

---

## 🔍 Cómo Diagnosticar el Error

### Paso 1: Abrir la Consola del Navegador

1. Abre la página de compra de tickets
2. Presiona `F12` o clic derecho → "Inspeccionar"
3. Ve a la pestaña **Console**

### Paso 2: Intentar Comprar un Ticket

1. Selecciona la cantidad de tickets
2. Haz clic en "Comprar Ahora"
3. Observa los logs en la consola

### Paso 3: Identificar el Error

Busca en la consola estos logs:

#### ✅ Si todo va bien, verás:
```
📝 Creando pago PayPal... {ticketIds: [...], monto: ..., cantidadTickets: ...}
📝 Respuesta de PayPal: {status: 200, statusText: "OK", ok: true}
✅ Pago PayPal creado: {paymentId: "...", approvalUrl: "✅ Disponible", pagoId: ...}
🔗 Redirigiendo a PayPal...
```

#### ❌ Si hay error, verás uno de estos:

**Error 401 (Autenticación):**
```
📝 Respuesta de PayPal: {status: 401, ...}
❌ Error de PayPal: {error: "Error de autenticación con PayPal", ...}
```

**Error 400 (Solicitud inválida):**
```
📝 Respuesta de PayPal: {status: 400, ...}
❌ Error de PayPal: {error: "...", details: "..."}
```

**Error 500 (Error del servidor):**
```
📝 Respuesta de PayPal: {status: 500, ...}
❌ Error de PayPal: {error: "Error al crear pago PayPal", ...}
```

---

## 🔧 Soluciones por Tipo de Error

### Error 401: "Error de autenticación con PayPal"

**Causa**: Las credenciales de PayPal no son válidas o no corresponden al modo configurado.

**Solución**:
1. Ve a **cPanel → Node.js App → Environment Variables**
2. Verifica:
   - `PAYPAL_MODE` = `live` (para producción) o `sandbox` (para pruebas)
   - `PAYPAL_CLIENT_ID` = Credenciales de **PRODUCCIÓN** si `PAYPAL_MODE=live`
   - `PAYPAL_CLIENT_SECRET` = Credenciales de **PRODUCCIÓN** si `PAYPAL_MODE=live`
3. **IMPORTANTE**: No puedes usar credenciales de SANDBOX con `PAYPAL_MODE=live`
4. Reinicia la aplicación Node.js en cPanel

**Cómo obtener credenciales de producción**:
1. Ve a [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Inicia sesión
3. Ve a **My Apps & Credentials**
4. Asegúrate de estar en la pestaña **LIVE** (no SANDBOX)
5. Copia el **Client ID** y **Client Secret**

### Error 400: "Error en la solicitud de pago"

**Causa**: Los tickets no están disponibles o hay un problema con los datos enviados.

**Solución**:
1. Verifica que el sorteo tenga tickets disponibles
2. Verifica que los tickets no hayan sido vendidos entre la reserva y el pago
3. Intenta de nuevo

### Error 500: "Error del servidor al procesar el pago"

**Causa**: Error en el servidor al comunicarse con PayPal.

**Posibles causas**:
1. PayPal está temporalmente no disponible
2. Error en la configuración del servidor
3. Problema con las credenciales

**Solución**:
1. Revisa los logs del backend en cPanel
2. Verifica que las credenciales estén correctas
3. Intenta de nuevo en unos momentos

---

## 📋 Checklist de Verificación

### Variables de Entorno en cPanel:
- [ ] `PAYPAL_MODE` está configurado (exactamente `live` o `sandbox`, sin espacios)
- [ ] `PAYPAL_CLIENT_ID` está configurado
- [ ] `PAYPAL_CLIENT_SECRET` está configurado
- [ ] Las credenciales corresponden al modo configurado (LIVE con `live`, SANDBOX con `sandbox`)

### En el Navegador:
- [ ] La consola muestra los logs de creación de pago
- [ ] No hay errores de CORS
- [ ] El token de autenticación es válido

### En el Backend (Logs de cPanel):
- [ ] Muestra "✅ PayPal configurado correctamente" al iniciar
- [ ] Muestra los logs de creación de pago cuando intentas comprar
- [ ] No muestra errores de autenticación

---

## 🧪 Cómo Probar

1. **Abre la página de compra** (`comprar-ticket.html?id=[ID_SORTEO]`)
2. **Abre la consola del navegador** (F12)
3. **Inicia sesión** si no estás logueado
4. **Selecciona cantidad** de tickets
5. **Haz clic en "Comprar Ahora"**
6. **Observa los logs** en la consola:
   - Debe mostrar `📝 Creando pago PayPal...`
   - Debe mostrar `📝 Respuesta de PayPal: {status: 200, ...}`
   - Debe mostrar `✅ Pago PayPal creado`
   - Debe redirigir a PayPal

---

## 🆘 Si Aún No Funciona

1. **Comparte los logs**:
   - Logs de la consola del navegador (F12 → Console)
   - Logs del backend (cPanel → Node.js App → Logs)
   - Captura de pantalla del error que aparece en la página

2. **Verifica las credenciales**:
   - ¿Están correctamente configuradas en cPanel?
   - ¿Corresponden al modo configurado?
   - ¿Son de producción si `PAYPAL_MODE=live`?

3. **Prueba en modo SANDBOX primero**:
   - Cambia `PAYPAL_MODE=sandbox`
   - Usa credenciales de SANDBOX
   - Reinicia la app
   - Prueba una compra
   - Si funciona en SANDBOX pero no en LIVE, el problema son las credenciales de producción

---

## 📝 Notas Importantes

- **NO mezcles credenciales**: Usa credenciales de SANDBOX solo con `PAYPAL_MODE=sandbox`
- **Reinicia siempre** la aplicación Node.js después de cambiar variables de entorno
- **Los errores se muestran** en la página durante 10 segundos
- **Los logs detallados** están en la consola del navegador (F12)
