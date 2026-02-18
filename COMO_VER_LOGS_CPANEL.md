# 📋 Cómo Ver los Logs del Backend en cPanel

## 🔍 Paso a Paso para Ver los Logs

### Paso 1: Acceder a cPanel

1. Ve a: `https://premioclick.cl:2083` (o el puerto que uses para cPanel)
2. Inicia sesión con tus credenciales de cPanel

### Paso 2: Ir a Node.js App

1. En el panel principal de cPanel, busca la sección **"Software"** o **"Software/Apps"**
2. Haz clic en **"Node.js"** o **"Node.js App"**

### Paso 3: Seleccionar la Aplicación

1. Deberías ver una lista de aplicaciones Node.js
2. Busca la aplicación de tu proyecto (probablemente se llama algo como "api" o "sorteosapp")
3. Haz clic en la aplicación

### Paso 4: Ver los Logs

1. En la página de la aplicación Node.js, busca la sección **"Logs"** o **"View Logs"**
2. Haz clic en **"View Logs"** o **"Logs"**
3. Se abrirá una ventana o página con los logs

**Alternativa**: También puedes ver los logs desde:
- **Terminal** (si tienes acceso SSH)
- **File Manager** → navega a `/home/premioclick/logs/` o similar

---

## 📝 Qué Buscar en los Logs

### Al Iniciar la Aplicación:

Busca estos mensajes (deben aparecer cuando reinicias la app):

```
🔍 ========== CONFIGURACIÓN DE PAYPAL ==========
🔍 PAYPAL_MODE (raw): live
🔍 PAYPAL_MODE (procesado): live
🔍 PAYPAL_CLIENT_ID (raw): AYQ9CQyPPn8l_kjF3B6uqm-XscR1RWYlym-3LdqFjdDFz-DiB5C1sWYrLdZgXzby2ZSeKv-AV54X8Kkd508nZpJzUj3G8AvSemx-dsGPGKqTw06bQzlkwl7nM6eJaaYP6DoUoKVo-7U...
🔍 PAYPAL_CLIENT_ID (length): [número]
🔍 PAYPAL_CLIENT_SECRET (raw): CONFIGURADO (length: [número])
✅ PayPal configurado correctamente
   Modo: live
   Client ID (primeros 30 chars): AYQ9CQyPPn8l_kjF3B6uqm-XscR1...
   Client ID (longitud): [número]
   Client Secret (longitud): [número]
   Client ID empieza con: AY
✅ PayPal SDK configurado exitosamente
🔍 ========== FIN CONFIGURACIÓN PAYPAL ==========
```

### Al Intentar Crear un Pago:

Busca estos mensajes cuando intentas comprar un ticket:

```
📝 Intentando crear pago PayPal con configuración:
   Mode: live
   Client ID: AYQ9CQyPPn8l_kjF3B6uqm...
   Client Secret: ✅ Configurado
   Monto: 2000
   Cantidad de tickets: 2
```

Y luego el error:

```
❌ Error PayPal al crear pago:
   Mensaje: [mensaje del error]
   Response Status: 401
   Response: [objeto con detalles]
   Error Name: [nombre del error]
   Error Description: [descripción del error]
   Detalles completos: [JSON completo del error]
```

---

## 🔗 Enlaces Directos (si están disponibles)

Si cPanel tiene enlaces directos, podrías acceder directamente a:

- **Node.js Apps**: `https://premioclick.cl:2083/cpsess[SESSION_ID]/frontend/paper_lantern/nodejs/index.html`
- **Logs**: `https://premioclick.cl:2083/cpsess[SESSION_ID]/frontend/paper_lantern/nodejs/view_logs.html?app_id=[APP_ID]`

**Nota**: Estos enlaces requieren estar autenticado en cPanel primero.

---

## 📸 Qué Compartir

Cuando veas los logs, comparte:

1. **La sección de configuración de PayPal** (al iniciar la app)
2. **El error completo** cuando intentas crear el pago
3. **Cualquier mensaje de error** relacionado con PayPal

Puedes:
- Copiar y pegar el texto de los logs
- Hacer una captura de pantalla
- Exportar los logs si hay esa opción

---

## 🆘 Si No Puedes Ver los Logs

### Opción 1: Ver desde Terminal (SSH)

Si tienes acceso SSH:

```bash
# Conectarte por SSH
ssh premioclick@premioclick.cl

# Ver los logs en tiempo real
tail -f ~/logs/nodejs/[APP_NAME].log

# O ver los últimos 100 líneas
tail -n 100 ~/logs/nodejs/[APP_NAME].log
```

### Opción 2: Ver desde File Manager

1. En cPanel, ve a **File Manager**
2. Navega a `/home/premioclick/logs/` o `/home/premioclick/nodevenv/public_html/api/20/logs/`
3. Busca archivos `.log` o `.txt`
4. Abre el archivo de logs más reciente

### Opción 3: Contactar al Hosting

Si no puedes acceder a los logs, contacta al soporte de tu hosting para que te ayuden a acceder.

---

## 💡 Tip: Filtrar Logs

Si los logs son muy largos, busca específicamente:
- `PAYPAL` (para ver todo lo relacionado con PayPal)
- `Error` (para ver solo errores)
- `401` (para ver errores de autenticación)

---

## 📋 Checklist

- [ ] Accedí a cPanel
- [ ] Encontré la sección Node.js App
- [ ] Abrí los logs de la aplicación
- [ ] Busqué los mensajes de configuración de PayPal
- [ ] Intenté comprar un ticket y revisé los logs del error
- [ ] Copié o capturé los logs relevantes
