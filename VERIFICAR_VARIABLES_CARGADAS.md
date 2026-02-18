# 🔍 Verificar que las Variables se Cargaron Correctamente

## 📋 Pasos para Verificar

### Paso 1: Revisar los Logs del Backend

1. Ve a **cPanel → Node.js App → Logs**
2. Busca estos mensajes (deben aparecer al iniciar la aplicación):

```
🔍 ========== CONFIGURACIÓN DE PAYPAL ==========
🔍 PAYPAL_MODE (raw): live
🔍 PAYPAL_MODE (procesado): live
🔍 PAYPAL_CLIENT_ID (raw): ATJJeol8A8C6AHCJvr-vnCgtrfwG054...
🔍 PAYPAL_CLIENT_ID (length): 80
🔍 PAYPAL_CLIENT_SECRET (raw): CONFIGURADO (length: 80)
✅ PayPal configurado correctamente
   Modo: live
   Client ID (primeros 30 chars): ATJJeol8A8C6AHCJvr-vnCgtrfwG054...
   Client ID (longitud): 80
   Client Secret (longitud): 80
   Client ID empieza con: AT
✅ PayPal SDK configurado exitosamente
🔍 ========== FIN CONFIGURACIÓN PAYPAL ==========
```

### Paso 2: Verificar el Contenido del Archivo .env

1. Ve a **File Manager** en cPanel
2. Navega a `/home/premioclick/public_html/api/`
3. Activa **"Mostrar archivos ocultos"**
4. Abre el archivo `.env`
5. Verifica que tenga exactamente esto (sin espacios extra):

```
PAYPAL_MODE=live
PAYPAL_CLIENT_ID=ATJJeol8A8C6AHCJvr-vnCgtrfwG054CQiX0Ai_K9xqKKdEauL29xAzEpGGWVaVQL6MDH6qOnYHNeOLT
PAYPAL_CLIENT_SECRET=EGi10pUVAUHoamn3quBQTXqNdX3MGmoMZnm1Z8BE_SMZmYqHHBR47yMhBbvjNAhx0Gk1QFQDv5E5xF1x
```

**IMPORTANTE**:
- Sin espacios antes o después del `=`
- Sin comillas
- Una variable por línea
- El archivo debe llamarse `.env` (con punto al inicio)

### Paso 3: Verificar que el Código Cargue el .env

1. Verifica que tu archivo principal (`server.js` o `api/index.js`) tenga esta línea al inicio:

```javascript
require('dotenv').config();
```

2. Si está en `backend/api/index.js`, debe tenerla en la línea 8 aproximadamente.

### Paso 4: Reiniciar la Aplicación

**MUY IMPORTANTE**: Después de crear/editar el `.env`:

1. Ve a **cPanel → Node.js App**
2. Selecciona tu aplicación
3. Haz clic en **"Restart"** (o **"Stop"** y luego **"Start"**)
4. Espera unos segundos

---

## 🔍 Qué Buscar en los Logs

### ✅ Si Funciona Correctamente:

Deberías ver:
```
✅ PayPal configurado correctamente
   Modo: live
   Client ID (primeros 30 chars): ATJJeol8A8C6AHCJvr-vnCgtrfwG054...
   Client ID empieza con: AT
✅ PayPal SDK configurado exitosamente
```

### ❌ Si NO Funciona:

Puedes ver:
```
⚠️ ADVERTENCIA: Las credenciales de PayPal no están configuradas
   PAYPAL_CLIENT_ID: ❌ Faltante
   PAYPAL_CLIENT_SECRET: ❌ Faltante
```

O:
```
🔍 PAYPAL_CLIENT_ID (raw): NO CONFIGURADO
🔍 PAYPAL_CLIENT_SECRET (raw): NO CONFIGURADO
```

---

## 🔧 Si las Variables NO se Cargaron

### Solución 1: Verificar la Ruta del .env

El archivo `.env` debe estar en la **misma carpeta** que el archivo que ejecuta la aplicación.

Si tu aplicación está en:
- `/home/premioclick/public_html/api/`
- Y el archivo principal es `server.js` o `index.js`

Entonces el `.env` debe estar en:
- `/home/premioclick/public_html/api/.env`

### Solución 2: Verificar que dotenv esté Instalado

1. Ve a **cPanel → Node.js App**
2. Busca tu aplicación
3. Haz clic en **"Run NPM Install"** junto a `package.json`
4. Esto instalará `dotenv` si no está instalado

### Solución 3: Especificar la Ruta del .env Manualmente

Si el `.env` no se carga automáticamente, puedes especificar la ruta:

En `backend/api/index.js` o `backend/server.js`, cambia:

```javascript
require('dotenv').config();
```

Por:

```javascript
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
```

---

## 📝 Compartir Información

Por favor, comparte:

1. **Los logs del backend** (especialmente la sección de configuración de PayPal)
2. **Una captura del archivo .env** (puedes ocultar partes del Client Secret)
3. **Confirmación de que reiniciaste** la aplicación después de crear el `.env`

Con esta información podré identificar exactamente qué está fallando.
