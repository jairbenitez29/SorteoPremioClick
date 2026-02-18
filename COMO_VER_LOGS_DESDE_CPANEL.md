# 📋 Cómo Ver los Logs desde cPanel Node.js App

## 🔍 Desde la Página Actual

Estás en la página de configuración de Node.js App. Para ver los logs:

### Opción 1: Botón "Logs" en la Página

1. **Busca un botón o enlace que diga "Logs"** o **"View Logs"** en la página
2. Puede estar:
   - En la parte superior de la página (junto a los botones "STOP APP" y "RESTART")
   - En un menú desplegable o pestañas
   - En la sección de "Node.js Application Details"

### Opción 2: Menú Desplegable

1. **Busca un menú desplegable** o **pestañas** en la parte superior
2. Puede haber opciones como:
   - "Settings" / "Configuración"
   - "Logs" / "Registros"
   - "Environment Variables" / "Variables de Entorno"

### Opción 3: Desde el Menú Principal

1. **Ve al menú principal de cPanel** (el sidebar azul a la izquierda)
2. **Busca "Node.js"** o **"Node.js App"**
3. Puede haber una opción **"View Logs"** o **"Logs"** directamente

### Opción 4: Terminal (SSH)

Si no encuentras el botón de logs en la interfaz:

1. **Copia el comando** que aparece en la página:
   ```
   source /home/premioclick/nodevenv/public_html/api/20/bin/activate && cd /home/premioclick/public_html/api
   ```

2. **Accede por SSH** a tu servidor:
   - Usa un cliente SSH (PuTTY, Terminal, etc.)
   - Conéctate a: `premioclick.cl`
   - Usuario: `premioclick`
   - Ejecuta el comando anterior

3. **Ver los logs**:
   ```bash
   # Ver logs en tiempo real
   tail -f ~/logs/nodejs/*.log
   
   # O ver las últimas 100 líneas
   tail -n 100 ~/logs/nodejs/*.log
   
   # O buscar específicamente logs de PayPal
   grep -i paypal ~/logs/nodejs/*.log | tail -n 50
   ```

### Opción 5: File Manager

1. **Ve a "File Manager"** en cPanel
2. **Navega a**: `/home/premioclick/logs/` o `/home/premioclick/nodevenv/public_html/api/20/logs/`
3. **Busca archivos `.log`** o `.txt`
4. **Abre el archivo más reciente**

---

## 🔍 Qué Buscar en los Logs

Una vez que accedas a los logs, busca:

### 1. Mensajes de Configuración (al iniciar la app):

```
🔍 ========== CONFIGURACIÓN DE PAYPAL ==========
🔍 PAYPAL_MODE (raw): live
🔍 PAYPAL_CLIENT_ID (raw): ATJJeol8A8C6AHCJvr-vnCgtrfwG054...
✅ PayPal configurado correctamente
```

### 2. Errores al Crear Pago:

```
📝 Intentando crear pago PayPal...
❌ Error PayPal al crear pago:
   Response Status: 401
```

---

## 📸 Si No Encuentras el Botón

**Haz una captura de pantalla completa** de la página de Node.js App y compártela. Así podré indicarte exactamente dónde está el botón de logs.

---

## 💡 Tip: Reiniciar y Ver Logs

1. **Haz clic en "RESTART"** (el botón gris con ícono de refrescar)
2. **Inmediatamente después**, busca los logs
3. Los mensajes de configuración aparecerán al inicio

---

## 🆘 Si No Puedes Acceder a los Logs

1. **Contacta al soporte de tu hosting** para que te ayuden
2. **O usa SSH** si tienes acceso (Opción 4 arriba)
