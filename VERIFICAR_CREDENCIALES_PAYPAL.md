# 🔍 Verificar Credenciales de PayPal

## ✅ Configuración Actual en cPanel

Veo que tienes configurado:
- `PAYPAL_MODE` = `live` ✅
- `PAYPAL_CLIENT_ID` = (configurado) ✅
- `PAYPAL_CLIENT_SECRET` = (configurado) ✅

## ❌ Problema: Error 401

El error 401 significa que **PayPal está rechazando las credenciales**. Esto puede deberse a:

### Posible Causa 1: Credenciales de SANDBOX con modo LIVE
Las credenciales que tienes configuradas pueden ser de **SANDBOX** pero estás usando `PAYPAL_MODE=live`.

**Solución**: 
- Opción A: Cambiar a `PAYPAL_MODE=sandbox` y usar credenciales de SANDBOX
- Opción B: Obtener credenciales de **PRODUCCIÓN (LIVE)** y mantener `PAYPAL_MODE=live`

### Posible Causa 2: Credenciales Incorrectas
Las credenciales pueden estar mal copiadas o ser de otra aplicación.

**Solución**: Verificar en PayPal Developer Dashboard que las credenciales sean correctas.

### Posible Causa 3: Credenciales de Otra Cuenta
Las credenciales pueden ser de una cuenta de PayPal diferente.

**Solución**: Asegurarse de usar las credenciales de la cuenta correcta.

---

## 🔍 Cómo Verificar las Credenciales

### Paso 1: Ir a PayPal Developer Dashboard

1. Ve a: https://developer.paypal.com/
2. Inicia sesión con la cuenta de PayPal de tu cliente

### Paso 2: Verificar el Modo

1. Ve a **My Apps & Credentials**
2. **IMPORTANTE**: Verifica en qué pestaña estás:
   - Si `PAYPAL_MODE=live`, debes estar en la pestaña **LIVE**
   - Si `PAYPAL_MODE=sandbox`, debes estar en la pestaña **SANDBOX**

### Paso 3: Comparar Credenciales

1. En la pestaña correcta (LIVE o SANDBOX), según corresponda)
2. Busca la aplicación que estás usando
3. Compara el **Client ID** con el que tienes en cPanel:
   - Deben ser **exactamente iguales**
   - No debe haber espacios antes o después
   - Debe empezar con letras (generalmente "A" para producción o "Ab" para sandbox)

4. Haz clic en **Show** para ver el **Client Secret**:
   - Compara con el que tienes en cPanel
   - Deben ser **exactamente iguales**
   - No debe haber espacios

### Paso 4: Si las Credenciales No Coinciden

**Si estás en modo LIVE pero las credenciales son de SANDBOX:**
1. Ve a la pestaña **SANDBOX** en PayPal Developer Dashboard
2. Copia las credenciales de SANDBOX
3. En cPanel, cambia `PAYPAL_MODE=sandbox`
4. Actualiza `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET` con las de SANDBOX
5. Reinicia la aplicación Node.js

**Si quieres usar modo LIVE:**
1. Ve a la pestaña **LIVE** en PayPal Developer Dashboard
2. Si no hay una app en modo LIVE, crea una nueva:
   - Haz clic en **Create App**
   - Nombre: "PremioClick Production"
   - Environment: **Live**
   - Features: Selecciona las que necesites
3. Copia el **Client ID** y **Client Secret** de la app en modo LIVE
4. En cPanel, actualiza `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET`
5. Asegúrate de que `PAYPAL_MODE=live`
6. Reinicia la aplicación Node.js

---

## 🧪 Prueba Rápida: Usar SANDBOX Primero

Para verificar que todo funciona, prueba primero con SANDBOX:

1. En cPanel, cambia `PAYPAL_MODE=sandbox`
2. Ve a PayPal Developer Dashboard → pestaña **SANDBOX**
3. Copia las credenciales de SANDBOX
4. Actualiza `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET` con las de SANDBOX
5. Reinicia la aplicación Node.js
6. Prueba una compra

**Si funciona en SANDBOX**, entonces el problema es que las credenciales de LIVE no son correctas o no corresponden al modo.

---

## 📋 Checklist de Verificación

- [ ] Las credenciales en cPanel coinciden exactamente con las de PayPal Developer Dashboard
- [ ] Si `PAYPAL_MODE=live`, las credenciales son de la pestaña **LIVE**
- [ ] Si `PAYPAL_MODE=sandbox`, las credenciales son de la pestaña **SANDBOX**
- [ ] No hay espacios antes o después de las credenciales
- [ ] La aplicación Node.js fue reiniciada después de cambiar las credenciales
- [ ] Los logs del backend muestran "✅ PayPal configurado correctamente"

---

## 🔍 Cómo Identificar si las Credenciales son de LIVE o SANDBOX

### Por el Client ID:

**SANDBOX** generalmente empieza con:
- `Ab...` (más común)
- `Ae...`
- `Af...`

**LIVE (Producción)** generalmente empieza con:
- `AY...` (más común)
- `AT...`
- `AR...`

**Nota**: Esto es una guía general, pero no siempre es así. La mejor forma es verificar en PayPal Developer Dashboard en qué pestaña están las credenciales.

---

## 🆘 Si Aún No Funciona

1. **Revisa los logs del backend** en cPanel para ver el error exacto
2. **Prueba primero en SANDBOX** para verificar que las credenciales funcionan
3. **Verifica que no haya espacios** al copiar las credenciales
4. **Asegúrate de reiniciar** la aplicación Node.js después de cambiar las credenciales
