# ✅ Actualizar Credenciales de PayPal en cPanel

## 🔑 Nuevas Credenciales

**Client ID:**
```
ATJJeol8A8C6AHCJvr-vnCgtrfwG054CQiX0Ai_K9xqKKdEauL29xAzEpGGWVaVQL6MDH6qOnYHNeOLT
```

**Client Secret:**
```
EGi10pUVAUHoamn3quBQTXqNdX3MGmoMZnm1Z8BE_SMZmYqHHBR47yMhBbvjNAhx0Gk1QFQDv5E5xF1x
```

**Nota**: El Client ID empieza con "AT", lo cual es típico de credenciales de **LIVE (producción)**. ✅

---

## 📋 Pasos para Actualizar en cPanel

### Paso 1: Acceder a Variables de Entorno

1. Ve a **cPanel → Node.js App**
2. Selecciona tu aplicación
3. Busca la sección **"Environment Variables"** o **"Variables de Entorno"**
4. Haz clic para ver/editar las variables

### Paso 2: Actualizar PAYPAL_CLIENT_ID

1. Busca la variable `PAYPAL_CLIENT_ID`
2. Haz clic en el ícono de **lápiz (editar)**
3. **Elimina todo el contenido actual**
4. **Pega exactamente esto** (sin espacios antes o después):
   ```
   ATJJeol8A8C6AHCJvr-vnCgtrfwG054CQiX0Ai_K9xqKKdEauL29xAzEpGGWVaVQL6MDH6qOnYHNeOLT
   ```
5. **Guarda** los cambios

### Paso 3: Actualizar PAYPAL_CLIENT_SECRET

1. Busca la variable `PAYPAL_CLIENT_SECRET`
2. Haz clic en el ícono de **lápiz (editar)**
3. **Elimina todo el contenido actual**
4. **Pega exactamente esto** (sin espacios antes o después):
   ```
   EGi10pUVAUHoamn3quBQTXqNdX3MGmoMZnm1Z8BE_SMZmYqHHBR47yMhBbvjNAhx0Gk1QFQDv5E5xF1x
   ```
5. **Guarda** los cambios

### Paso 4: Verificar PAYPAL_MODE

1. Busca la variable `PAYPAL_MODE`
2. Debe estar configurada como: `live` (sin comillas, sin espacios)
3. Si no está configurada o tiene otro valor, cámbiala a `live`

### Paso 5: Reiniciar la Aplicación

**MUY IMPORTANTE**: Después de cambiar las variables de entorno:

1. Ve a **cPanel → Node.js App**
2. Selecciona tu aplicación
3. Haz clic en **"Restart"** o **"Stop"** y luego **"Start"**
4. Espera unos segundos a que la aplicación se reinicie

---

## ✅ Verificación

### Verificar en los Logs

1. Ve a **cPanel → Node.js App → Logs**
2. Busca estos mensajes al iniciar:

```
🔍 ========== CONFIGURACIÓN DE PAYPAL ==========
🔍 PAYPAL_MODE (raw): live
🔍 PAYPAL_MODE (procesado): live
🔍 PAYPAL_CLIENT_ID (raw): ATJJeol8A8C6AHCJvr-vnCgtrfwG054CQiX0Ai_K9xqKKdEauL29xAzEpGGWVaVQL6MDH6qOnYHNeOLT...
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

**Verifica que:**
- El Client ID empiece con `ATJJeol8A8C6AHCJvr-vnCgtrfwG054...`
- La longitud del Client ID sea 80 caracteres
- El modo sea `live`
- No haya errores

### Probar la Compra

1. Ve a la página web: `https://premioclick.cl/comprar-ticket.html?id=[ID_SORTEO]`
2. Inicia sesión
3. Selecciona cantidad de tickets
4. Haz clic en "Comprar Ahora"
5. **Debería redirigir a PayPal** sin error 401

---

## ⚠️ Importante

1. **No agregues espacios** antes o después de las credenciales
2. **Copia exactamente** como está (sin saltos de línea)
3. **Reinicia SIEMPRE** la aplicación después de cambiar variables
4. **Verifica los logs** para confirmar que se cargaron correctamente

---

## 🆘 Si Aún No Funciona

1. **Verifica los logs** para ver si hay algún error
2. **Confirma que las credenciales** se guardaron correctamente (sin espacios)
3. **Asegúrate de haber reiniciado** la aplicación
4. **Prueba desde la web** y comparte el error si persiste

---

## 📝 Checklist

- [ ] Actualicé `PAYPAL_CLIENT_ID` con el nuevo valor
- [ ] Actualicé `PAYPAL_CLIENT_SECRET` con el nuevo valor
- [ ] Verifiqué que `PAYPAL_MODE=live`
- [ ] No agregué espacios antes o después de las credenciales
- [ ] Reinicié la aplicación Node.js
- [ ] Verifiqué los logs y veo "✅ PayPal configurado correctamente"
- [ ] Probé comprar un ticket y funciona sin error 401
