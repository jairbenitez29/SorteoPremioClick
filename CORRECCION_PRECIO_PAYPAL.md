# 🔧 Corrección de Precio y PayPal en la App Móvil

## Problemas Identificados

### 1. ❌ Error al obtener el precio del ticket
**Problema**: La app móvil estaba intentando obtener el precio de `sorteo.tickets[0].precio`, pero el backend envía el precio en `sorteo.precio_ticket`.

**Solución**: ✅ Ya corregido en `app/comprar-ticket/[id].tsx`
- Ahora usa `sorteo.precio_ticket` que viene directamente del backend
- Agregado logging para debugging
- Manejo de casos cuando el precio es 0

### 2. ❌ Error al pagar con PayPal en modo "live"
**Problema**: Aunque `PAYPAL_MODE` está configurado como "live", sigue dando error 401 (autenticación fallida).

**Posibles causas**:
1. Las credenciales de PayPal (Client ID y Client Secret) no corresponden al modo "live"
2. Las credenciales están mal configuradas en cPanel
3. Hay espacios o caracteres extra en las variables de entorno

**Solución**: ✅ Mejorado el logging y mensajes de error en `backend/routes/pagos.js`

---

## 📋 Archivos Modificados

1. **`app/comprar-ticket/[id].tsx`**
   - Corregido para usar `sorteo.precio_ticket` en lugar de `sorteo.tickets[0].precio`
   - Agregado logging para debugging del precio

2. **`backend/routes/pagos.js`**
   - Mejorado el logging de errores de PayPal
   - Mensajes de error más descriptivos
   - Mejor detección de errores de autenticación

---

## 🔍 Cómo Verificar que el Precio Funciona

1. **En la app móvil**, cuando entres a comprar un ticket:
   - Abre la consola de desarrollo (React Native Debugger o Metro)
   - Debes ver un log que dice: `🔍 Sorteo cargado:` con el `precio_ticket`
   - Si el precio es 0, verás una advertencia

2. **En el backend** (logs de cPanel):
   - Cuando se obtiene un sorteo, debe aparecer: `🔍 Precio del ticket obtenido: [precio]`
   - Si no hay tickets, aparecerá: `⚠️ No se encontraron tickets para este sorteo, precio establecido en 0`

---

## 🔧 Cómo Corregir el Error de PayPal

### Paso 1: Verificar Variables de Entorno en cPanel

1. Ve a **cPanel → Node.js App → Environment Variables**
2. Verifica que estas variables estén configuradas **EXACTAMENTE** así:

```
PAYPAL_MODE=live
PAYPAL_CLIENT_ID=tu_client_id_de_produccion
PAYPAL_CLIENT_SECRET=tu_client_secret_de_produccion
```

**IMPORTANTE**:
- `PAYPAL_MODE` debe ser exactamente `live` (sin comillas, sin espacios, en minúsculas)
- `PAYPAL_CLIENT_ID` debe ser el Client ID de **PRODUCCIÓN** (no de sandbox)
- `PAYPAL_CLIENT_SECRET` debe ser el Client Secret de **PRODUCCIÓN** (no de sandbox)

### Paso 2: Obtener Credenciales de Producción de PayPal

1. Ve a [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Inicia sesión con la cuenta de tu cliente
3. Ve a **My Apps & Credentials**
4. Asegúrate de estar en la pestaña **LIVE** (no SANDBOX)
5. Si no hay una app en modo LIVE, crea una nueva
6. Copia el **Client ID** y **Client Secret** de la app en modo LIVE

### Paso 3: Verificar que las Credenciales sean Correctas

Las credenciales de **SANDBOX** y **LIVE** son diferentes:
- **SANDBOX**: Empiezan con algo como `Ae...` o `Ab...` (Client ID)
- **LIVE**: También empiezan con letras, pero son completamente diferentes

**NO puedes usar credenciales de SANDBOX con `PAYPAL_MODE=live`**

### Paso 4: Reiniciar la Aplicación Node.js

Después de cambiar las variables de entorno:
1. Ve a **cPanel → Node.js App**
2. Haz clic en **Restart** o **Stop** y luego **Start**

### Paso 5: Verificar los Logs

1. Ve a **cPanel → Node.js App → Logs**
2. Busca estos mensajes al iniciar:
   ```
   ✅ PayPal configurado correctamente
      Modo: live
      Client ID: [primeros 20 caracteres]...
   ```
3. Si ves errores, revisa los mensajes específicos

---

## 🧪 Cómo Probar

### Probar el Precio:
1. Abre la app móvil
2. Ve a un sorteo que tenga tickets
3. Haz clic en "Comprar Ticket"
4. Debe mostrar el precio correcto (no $0)

### Probar PayPal:
1. Intenta comprar un ticket
2. Debe abrirse PayPal para el pago
3. Si da error, revisa los logs del backend para ver el error específico

---

## ⚠️ Errores Comunes

### Error: "Response Status : 401 - Client Authentication failed"
**Causa**: Las credenciales no corresponden al modo configurado
**Solución**: 
- Si `PAYPAL_MODE=live`, usa credenciales de PRODUCCIÓN
- Si `PAYPAL_MODE=sandbox`, usa credenciales de SANDBOX
- Verifica que no haya espacios o caracteres extra en las variables

### Error: "Mode must be 'sandbox' or 'live'"
**Causa**: `PAYPAL_MODE` tiene un valor inválido
**Solución**: 
- Debe ser exactamente `sandbox` o `live` (sin comillas, sin espacios)
- Verifica en cPanel que no haya espacios antes o después

### Precio muestra $0
**Causa**: El sorteo no tiene tickets o los tickets no tienen precio
**Solución**:
- Verifica que el sorteo tenga tickets generados
- Verifica que los tickets tengan un precio mayor a 0 en la base de datos

---

## 📝 Checklist de Verificación

- [ ] El precio se muestra correctamente en la app (no $0)
- [ ] `PAYPAL_MODE` está configurado como `live` (sin espacios)
- [ ] `PAYPAL_CLIENT_ID` es de PRODUCCIÓN (no sandbox)
- [ ] `PAYPAL_CLIENT_SECRET` es de PRODUCCIÓN (no sandbox)
- [ ] La aplicación Node.js fue reiniciada después de cambiar variables
- [ ] Los logs muestran "✅ PayPal configurado correctamente"
- [ ] Al intentar comprar, se abre PayPal (no da error 401)

---

## 🆘 Si Aún No Funciona

1. **Revisa los logs del backend** en cPanel para ver el error exacto
2. **Verifica en PayPal Developer Dashboard** que las credenciales sean correctas
3. **Prueba primero en modo SANDBOX** para verificar que todo funciona:
   - Cambia `PAYPAL_MODE=sandbox`
   - Usa credenciales de SANDBOX
   - Reinicia la app
   - Prueba una compra
4. **Si funciona en SANDBOX pero no en LIVE**, el problema son las credenciales de producción
