# 🔍 Diagnóstico Completo: Error 401 de PayPal

## ❌ Error Actual

```
Response Status : 401
Error al crear pago PayPal
paypalError: 'Error'
```

## 🔍 Pasos de Diagnóstico

### Paso 1: Verificar Logs del Backend

1. Ve a **cPanel → Node.js App → Logs**
2. Busca estos mensajes al iniciar la aplicación:

```
🔍 ========== CONFIGURACIÓN DE PAYPAL ==========
🔍 PAYPAL_MODE (raw): [valor]
🔍 PAYPAL_MODE (procesado): [valor]
🔍 PAYPAL_CLIENT_ID (raw): [primeros 30 caracteres]...
🔍 PAYPAL_CLIENT_ID (length): [número]
🔍 PAYPAL_CLIENT_SECRET (raw): CONFIGURADO (length: [número])
✅ PayPal configurado correctamente
   Modo: [live o sandbox]
   Client ID (primeros 30 chars): [primeros 30 caracteres]...
   Client ID (longitud): [número]
   Client Secret (longitud): [número]
   Client ID empieza con: [primeros 2 caracteres]
✅ PayPal SDK configurado exitosamente
```

**Comparte estos logs** para diagnosticar el problema.

### Paso 2: Verificar Longitud de Credenciales

Las credenciales de PayPal tienen longitudes típicas:

**Client ID:**
- SANDBOX: Generalmente 80-90 caracteres
- LIVE: Generalmente 80-90 caracteres

**Client Secret:**
- SANDBOX: Generalmente 80-90 caracteres
- LIVE: Generalmente 80-90 caracteres

Si la longitud es muy corta (menos de 50 caracteres), puede que la credencial esté incompleta.

### Paso 3: Verificar Primeros Caracteres

**Client ID generalmente empieza con:**
- SANDBOX: `Ab`, `Ae`, `Af`
- LIVE: `AY`, `AT`, `AR`

**Si el Client ID empieza con algo diferente**, puede que sea incorrecto.

### Paso 4: Verificar en PayPal Developer Dashboard

1. Ve a https://developer.paypal.com/
2. Inicia sesión
3. Ve a **My Apps & Credentials**
4. **Asegúrate de estar en la pestaña correcta:**
   - Si `PAYPAL_MODE=live` → pestaña **LIVE**
   - Si `PAYPAL_MODE=sandbox` → pestaña **SANDBOX**

5. **Compara EXACTAMENTE:**
   - El Client ID en PayPal debe ser **exactamente igual** al de cPanel
   - El Client Secret en PayPal debe ser **exactamente igual** al de cPanel
   - **No debe haber espacios** antes o después
   - **No debe haber saltos de línea**

### Paso 5: Verificar que las Credenciales Estén Activas

1. En PayPal Developer Dashboard, verifica que la app esté **activa**
2. Si la app está **inactiva** o **suspendida**, reactívala o crea una nueva

### Paso 6: Probar con Credenciales Nuevas

Si las credenciales actuales no funcionan:

1. **En PayPal Developer Dashboard:**
   - Ve a la pestaña correcta (LIVE o SANDBOX según `PAYPAL_MODE`)
   - Si hay una app existente, puedes regenerar el Client Secret:
     - Haz clic en la app
     - Haz clic en **Show** junto a Client Secret
     - Si hay opción, haz clic en **Regenerate** (esto creará uno nuevo)
   - O crea una nueva app:
     - Haz clic en **Create App**
     - Nombre: "PremioClick" (o el que prefieras)
     - Environment: **Live** (si `PAYPAL_MODE=live`) o **Sandbox** (si `PAYPAL_MODE=sandbox`)
     - Features: Selecciona las que necesites

2. **Copia las credenciales NUEVAS:**
   - Copia el **Client ID** completo
   - Copia el **Client Secret** completo
   - **Asegúrate de copiar TODO**, sin espacios

3. **En cPanel:**
   - Actualiza `PAYPAL_CLIENT_ID` con el nuevo Client ID
   - Actualiza `PAYPAL_CLIENT_SECRET` con el nuevo Client Secret
   - **Verifica que no haya espacios** antes o después

4. **Reinicia la aplicación Node.js**

### Paso 7: Verificar Logs al Intentar Crear Pago

Cuando intentas comprar un ticket, busca en los logs del backend:

```
📝 Intentando crear pago PayPal con configuración:
   Mode: [live o sandbox]
   Client ID: [primeros 20 caracteres]...
   Client Secret: ✅ Configurado
   Monto: [monto]
   Cantidad de tickets: [número]
```

Y luego:

```
❌ Error PayPal al crear pago:
   Mensaje: [mensaje]
   Response Status: 401
   Error Name: [nombre del error]
   Error Description: [descripción]
```

**Comparte estos logs** para ver el error exacto.

---

## 🔧 Soluciones Comunes

### Solución 1: Credenciales con Espacios

**Problema**: Al copiar las credenciales, se agregaron espacios antes o después.

**Solución**:
1. En cPanel, edita `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET`
2. Elimina **todos los espacios** antes y después
3. Guarda y reinicia la app

### Solución 2: Credenciales Incompletas

**Problema**: La credencial se cortó al copiar.

**Solución**:
1. Ve a PayPal Developer Dashboard
2. Copia la credencial **completa** (debe tener 80-90 caracteres)
3. Pégala en cPanel
4. Guarda y reinicia la app

### Solución 3: Credenciales de Modo Incorrecto

**Problema**: Credenciales de SANDBOX con `PAYPAL_MODE=live` o viceversa.

**Solución**:
- Opción A: Cambiar a `PAYPAL_MODE=sandbox` y usar credenciales de SANDBOX
- Opción B: Obtener credenciales de LIVE y mantener `PAYPAL_MODE=live`

### Solución 4: Credenciales Revocadas o Inactivas

**Problema**: Las credenciales fueron revocadas o la app está inactiva.

**Solución**:
1. Ve a PayPal Developer Dashboard
2. Verifica que la app esté activa
3. Si está inactiva, reactívala o crea una nueva
4. Regenera el Client Secret si es necesario

---

## 📋 Checklist de Verificación

- [ ] Los logs del backend muestran la configuración de PayPal
- [ ] El Client ID tiene la longitud correcta (80-90 caracteres)
- [ ] El Client Secret tiene la longitud correcta (80-90 caracteres)
- [ ] No hay espacios antes o después de las credenciales
- [ ] Las credenciales en cPanel coinciden EXACTAMENTE con las de PayPal Developer Dashboard
- [ ] Las credenciales corresponden al modo configurado (LIVE con `live`, SANDBOX con `sandbox`)
- [ ] La app en PayPal Developer Dashboard está activa
- [ ] La aplicación Node.js fue reiniciada después de cambiar las credenciales

---

## 🆘 Si Aún No Funciona

1. **Comparte los logs completos** del backend (especialmente los de configuración de PayPal)
2. **Verifica en PayPal Developer Dashboard** que las credenciales sean correctas
3. **Prueba creando una nueva app** en PayPal Developer Dashboard
4. **Prueba primero en SANDBOX** para verificar que todo funciona

---

## 📝 Información Necesaria para Diagnosticar

Por favor, comparte:

1. **Logs del backend al iniciar** (la sección de configuración de PayPal)
2. **Logs del backend al intentar crear el pago** (el error completo)
3. **Screenshot de PayPal Developer Dashboard** mostrando:
   - La pestaña en la que estás (LIVE o SANDBOX)
   - El Client ID (puedes ocultar parte)
   - Que la app esté activa

Con esta información podré identificar exactamente qué está fallando.
