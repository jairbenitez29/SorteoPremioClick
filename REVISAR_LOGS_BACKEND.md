# 🔍 Revisar Logs del Backend - Paso Crítico

## ⚠️ El Error 401 Viene del Backend

El error que ves en la consola del navegador (`Response Status : 401`) viene del **backend**, no del frontend. Necesitamos revisar los logs del backend para ver qué está pasando.

---

## 📋 Pasos para Revisar los Logs

### Paso 1: Acceder a los Logs

1. Ve a **cPanel → Node.js App**
2. Selecciona tu aplicación
3. Haz clic en **"Logs"** o **"View Logs"**

### Paso 2: Buscar los Mensajes de Configuración

Busca estos mensajes (deben aparecer cuando la aplicación inicia):

```
🔍 ========== CONFIGURACIÓN DE PAYPAL ==========
🔍 PAYPAL_MODE (raw): ...
🔍 PAYPAL_MODE (procesado): ...
🔍 PAYPAL_CLIENT_ID (raw): ...
🔍 PAYPAL_CLIENT_ID (length): ...
🔍 PAYPAL_CLIENT_SECRET (raw): ...
✅ PayPal configurado correctamente
   Modo: ...
   Client ID (primeros 30 chars): ...
   Client ID empieza con: ...
```

**Comparte exactamente qué aparece en estos logs.**

### Paso 3: Buscar el Error al Intentar Crear el Pago

Cuando intentas comprar un ticket, busca en los logs:

```
📝 Intentando crear pago PayPal con configuración:
   Mode: ...
   Client ID: ...
   Client Secret: ✅ Configurado
   Monto: ...
   Cantidad de tickets: ...
```

Y luego:

```
❌ Error PayPal al crear pago:
   Mensaje: ...
   Response Status: 401
   Error Name: ...
   Error Description: ...
   Detalles completos: ...
```

**Comparte estos logs completos.**

---

## 🔍 Qué Buscar Específicamente

### 1. ¿Se Cargaron las Nuevas Credenciales?

En los logs de configuración, verifica:

- **Client ID debe empezar con**: `ATJJeol8A8C6AHCJvr-vnCgtrfwG054...`
- **Client ID length debe ser**: `80`
- **Client Secret length debe ser**: `80`

Si ves las credenciales antiguas o `NO CONFIGURADO`, el `.env` no se está cargando.

### 2. ¿Qué Error Exacto Devuelve PayPal?

En los logs del error, busca:

- **Error Name**: ¿Qué dice?
- **Error Description**: ¿Qué dice?
- **Detalles completos**: ¿Qué JSON aparece?

Esto nos dirá exactamente por qué PayPal está rechazando las credenciales.

---

## 📸 Qué Compartir

Por favor, comparte:

1. **Los logs de configuración de PayPal** (al iniciar la app)
2. **Los logs del error** cuando intentas crear el pago
3. **Una captura de pantalla** de los logs si es posible

O copia y pega el texto de los logs.

---

## 🔧 Si No Puedes Ver los Logs

### Opción 1: Ver desde Terminal (SSH)

Si tienes acceso SSH:

```bash
# Conectarte
ssh premioclick@premioclick.cl

# Ver logs en tiempo real
tail -f ~/logs/nodejs/[nombre_app].log

# O ver últimas 50 líneas
tail -n 50 ~/logs/nodejs/[nombre_app].log
```

### Opción 2: Ver desde File Manager

1. Ve a **File Manager**
2. Navega a `/home/premioclick/logs/` o `/home/premioclick/nodevenv/public_html/api/20/logs/`
3. Busca archivos `.log`
4. Abre el más reciente

---

## 💡 Importante

**El error 401 significa que PayPal está rechazando las credenciales**. Esto puede deberse a:

1. Las credenciales no se están cargando del `.env`
2. Las credenciales son incorrectas
3. Las credenciales no corresponden al modo configurado
4. Las credenciales fueron revocadas en PayPal

**Los logs del backend nos dirán exactamente cuál es el problema.**

---

## 🆘 Si No Puedes Acceder a los Logs

1. **Contacta al soporte de tu hosting** para que te ayuden a acceder
2. **O intenta crear un endpoint de prueba** que muestre las credenciales (solo para debugging, luego lo quitas)

Pero lo más importante es **ver los logs del backend** para diagnosticar el problema.
