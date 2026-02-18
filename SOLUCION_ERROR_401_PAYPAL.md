# 🔧 Solución: Error 401 de PayPal

## ❌ Error Actual

```
Response Status : 401
Error al crear pago PayPal
paypalError: 'Error'
```

## 🔍 Causa del Problema

El error **401** significa que **PayPal está rechazando las credenciales**. Esto puede deberse a:

1. **Credenciales incorrectas**: El `PAYPAL_CLIENT_ID` o `PAYPAL_CLIENT_SECRET` son incorrectos
2. **Credenciales del modo incorrecto**: Estás usando credenciales de **SANDBOX** con `PAYPAL_MODE=live` o viceversa
3. **Credenciales no configuradas**: Las variables de entorno no están configuradas en cPanel

---

## ✅ Solución Paso a Paso

### Paso 1: Verificar Variables de Entorno en cPanel

1. Ve a **cPanel → Node.js App → Environment Variables**
2. Verifica que estas variables estén configuradas:

```
PAYPAL_MODE=live
PAYPAL_CLIENT_ID=tu_client_id_de_produccion
PAYPAL_CLIENT_SECRET=tu_client_secret_de_produccion
```

**IMPORTANTE**:
- `PAYPAL_MODE` debe ser exactamente `live` o `sandbox` (sin espacios, minúsculas)
- Si `PAYPAL_MODE=live`, debes usar credenciales de **PRODUCCIÓN**
- Si `PAYPAL_MODE=sandbox`, debes usar credenciales de **SANDBOX**
- **NO puedes mezclar**: Credenciales de SANDBOX con `PAYPAL_MODE=live` ❌

### Paso 2: Obtener Credenciales Correctas

#### Para PRODUCCIÓN (PAYPAL_MODE=live):

1. Ve a [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Inicia sesión con la cuenta de tu cliente
3. Ve a **My Apps & Credentials**
4. **Asegúrate de estar en la pestaña LIVE** (no SANDBOX)
5. Si no hay una app en modo LIVE, crea una nueva:
   - Haz clic en **Create App**
   - Nombre: "PremioClick Production" (o el que prefieras)
   - Environment: **Live**
   - Features: Selecciona las que necesites
6. Copia el **Client ID** y **Client Secret** de la app en modo LIVE

#### Para PRUEBAS (PAYPAL_MODE=sandbox):

1. Ve a [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Ve a **My Apps & Credentials**
3. **Asegúrate de estar en la pestaña SANDBOX**
4. Usa las credenciales de SANDBOX

### Paso 3: Configurar en cPanel

1. En **cPanel → Node.js App → Environment Variables**:
   - `PAYPAL_MODE` = `live` (para producción) o `sandbox` (para pruebas)
   - `PAYPAL_CLIENT_ID` = El Client ID que copiaste
   - `PAYPAL_CLIENT_SECRET` = El Client Secret que copiaste

2. **Guarda los cambios**

3. **Reinicia la aplicación Node.js**:
   - Ve a **cPanel → Node.js App**
   - Haz clic en **Restart** o **Stop** y luego **Start**

### Paso 4: Verificar que Funciona

1. Revisa los logs del backend en cPanel:
   - Debe mostrar: `✅ PayPal configurado correctamente`
   - Debe mostrar: `Modo: live` (o `sandbox`)
   - Debe mostrar: `Client ID: [primeros 20 caracteres]...`

2. Intenta comprar un ticket desde la web
3. Debe redirigir a PayPal sin error 401

---

## 🔍 Cómo Verificar las Credenciales

### Verificar en los Logs del Backend:

1. Ve a **cPanel → Node.js App → Logs**
2. Busca estos mensajes al iniciar:
   ```
   ✅ PayPal configurado correctamente
      Modo: live
      Client ID: [primeros 20 caracteres]...
   ```

3. Si ves:
   ```
   ⚠️ ADVERTENCIA: Las credenciales de PayPal no están configuradas
   ```
   → Las credenciales no están configuradas

### Verificar en PayPal Developer Dashboard:

1. Ve a [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Ve a **My Apps & Credentials**
3. Verifica que:
   - Si `PAYPAL_MODE=live`, estás usando credenciales de la pestaña **LIVE**
   - Si `PAYPAL_MODE=sandbox`, estás usando credenciales de la pestaña **SANDBOX**

---

## ⚠️ Errores Comunes

### Error: "Credenciales de SANDBOX con PAYPAL_MODE=live"
**Solución**: Usa credenciales de PRODUCCIÓN o cambia `PAYPAL_MODE=sandbox`

### Error: "Credenciales de LIVE con PAYPAL_MODE=sandbox"
**Solución**: Usa credenciales de SANDBOX o cambia `PAYPAL_MODE=live`

### Error: "PAYPAL_MODE tiene espacios o mayúsculas"
**Solución**: Debe ser exactamente `live` o `sandbox` (sin espacios, minúsculas)

### Error: "Las credenciales no se actualizaron"
**Solución**: Después de cambiar variables de entorno, **SIEMPRE reinicia** la aplicación Node.js

---

## 🧪 Prueba Primero en SANDBOX

Para verificar que todo funciona:

1. Configura `PAYPAL_MODE=sandbox`
2. Usa credenciales de SANDBOX
3. Reinicia la app
4. Prueba una compra
5. Si funciona en SANDBOX pero no en LIVE, el problema son las credenciales de producción

---

## 📝 Checklist

- [ ] `PAYPAL_MODE` está configurado como `live` o `sandbox` (sin espacios)
- [ ] `PAYPAL_CLIENT_ID` está configurado
- [ ] `PAYPAL_CLIENT_SECRET` está configurado
- [ ] Las credenciales corresponden al modo configurado
- [ ] La aplicación Node.js fue reiniciada después de cambiar variables
- [ ] Los logs muestran "✅ PayPal configurado correctamente"
- [ ] Al intentar comprar, no aparece error 401

---

## 🆘 Si Aún No Funciona

1. **Verifica los logs del backend** en cPanel para ver el error exacto
2. **Prueba primero en SANDBOX** para verificar que las credenciales funcionan
3. **Verifica en PayPal Developer Dashboard** que las credenciales sean correctas
4. **Asegúrate de que las credenciales no tengan espacios** al copiarlas
