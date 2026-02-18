# 🔍 Buscar Logs de Configuración de PayPal

## 📋 Qué Buscar en los Logs

En los logs del backend, busca específicamente estos mensajes que aparecen **cuando la aplicación inicia** (no cuando intentas comprar):

### Mensajes de Configuración (al iniciar):

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

---

## 🔍 Qué Verificar

### 1. ¿El Client ID es el Correcto?

En los logs, busca la línea:
```
🔍 PAYPAL_CLIENT_ID (raw): ...
```

**Debe mostrar:**
```
🔍 PAYPAL_CLIENT_ID (raw): ATJJeol8A8C6AHCJvr-vnCgtrfwG054CQiX0Ai_K9xqKKdEauL29xAzEpGGWVaVQL6MDH6qOnYHNeOLT...
```

**Si muestra:**
- `NO CONFIGURADO` → El `.env` no se está cargando
- Las credenciales antiguas → El `.env` no se actualizó
- Un Client ID diferente → Está usando credenciales incorrectas

### 2. ¿La Longitud es Correcta?

Busca:
```
🔍 PAYPAL_CLIENT_ID (length): ...
```

**Debe ser:** `80` (o cerca de 80)

Si es mucho menor (como 20-30), la credencial está incompleta.

### 3. ¿El Client Secret se Cargó?

Busca:
```
🔍 PAYPAL_CLIENT_SECRET (raw): CONFIGURADO (length: ...)
```

**Debe mostrar:** `CONFIGURADO (length: 80)` (o cerca de 80)

---

## 📸 Compartir los Logs de Configuración

Por favor, comparte **exactamente** lo que aparece en estas líneas de los logs:

1. `🔍 PAYPAL_MODE (raw): ...`
2. `🔍 PAYPAL_CLIENT_ID (raw): ...`
3. `🔍 PAYPAL_CLIENT_ID (length): ...`
4. `🔍 PAYPAL_CLIENT_SECRET (raw): ...`
5. `✅ PayPal configurado correctamente` (y las líneas siguientes)

---

## 🔧 Si No Aparecen Estos Mensajes

Si no ves los mensajes de configuración con los emojis 🔍 y ✅, significa que:

1. **El archivo `backend/routes/pagos.js` no se actualizó** en el servidor
2. **O la aplicación no se reinició** después de subir los cambios

**Solución:**
1. Sube el archivo `backend/routes/pagos.js` actualizado a cPanel
2. Reinicia la aplicación
3. Revisa los logs de nuevo

---

## 💡 Cómo Filtrar los Logs

Si los logs son muy largos, busca específicamente:

- `PAYPAL` (para ver todo lo relacionado con PayPal)
- `CONFIGURACIÓN DE PAYPAL` (para ver solo la configuración)
- `Client ID` (para ver el Client ID que se está usando)

---

## 🆘 Si No Encuentras los Logs de Configuración

1. **Reinicia la aplicación** (botón "RESTART")
2. **Inmediatamente después**, revisa los logs
3. Los mensajes de configuración aparecen **solo al iniciar** la aplicación

---

## 📝 Información Crítica

El error `invalid_client` significa que PayPal está rechazando las credenciales. Esto puede deberse a:

1. **Las credenciales no se están cargando** del `.env`
2. **Las credenciales son incorrectas** (mal copiadas)
3. **Las credenciales no corresponden al modo** (SANDBOX con `live` o viceversa)
4. **Las credenciales fueron revocadas** en PayPal Developer Dashboard

**Los logs de configuración nos dirán exactamente cuál es el problema.**
