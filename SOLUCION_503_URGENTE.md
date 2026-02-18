# 🚨 Solución Urgente Error 503 - Backend cPanel

## El Problema
El backend en `https://premioclick.cl/api` está dando error 503 (Service Unavailable).

## Solución Paso a Paso

### PASO 1: Verificar Estado de la Aplicación Node.js

1. **Accede a cPanel**
2. Ve a **"Node.js App"** o **"Node.js"** (busca en el menú)
3. Busca tu aplicación (probablemente se llama "api" o algo similar)
4. **Mira el estado:**
   - Si dice **"Stopped"** o **"Detenida"** → Ve al PASO 2
   - Si dice **"Running"** o **"Corriendo"** → Ve al PASO 3

### PASO 2: Si está Detenida

1. Haz clic en **"Start"** o **"Iniciar"**
2. Espera 10-15 segundos
3. Verifica que el estado cambie a **"Running"**
4. Prueba de nuevo: `https://premioclick.cl/api/health`

### PASO 3: Si está Corriendo pero da Error 503

1. Haz clic en **"Restart"** o **"Reiniciar"**
2. Espera 10-15 segundos
3. Ve al PASO 4

### PASO 4: Ver los Logs (MUY IMPORTANTE)

1. En **Node.js App**, haz clic en **"View Logs"** o **"Ver Logs"**
2. **Desplázate hasta el final** (los errores más recientes están abajo)
3. **Copia los últimos 30-50 líneas** de los logs
4. Busca mensajes que digan:
   - `Error:`
   - `Cannot find module`
   - `SyntaxError`
   - `ECONNREFUSED`
   - `Table doesn't exist`

**Los logs te dirán exactamente qué está fallando.**

### PASO 5: Errores Comunes y Soluciones

#### Error: "Cannot find module 'X'"
**Solución:**
1. En **Node.js App** → **Edit**
2. Verifica que **"Application Root"** sea: `public_html/api`
3. Haz clic en **"Restart"**

#### Error: "Table 'mensajes_chat' doesn't exist"
**Solución:**
1. Ve a **phpMyAdmin**
2. Selecciona tu base de datos
3. Ve a la pestaña **"SQL"**
4. Ejecuta este código:

```sql
CREATE TABLE IF NOT EXISTS mensajes_chat (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT,
  usuario_nombre VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  es_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_created_at (created_at)
);
```

5. Haz clic en **"Continuar"**
6. Reinicia la aplicación Node.js

#### Error: "connect ECONNREFUSED" o "Access denied"
**Solución:**
1. En **Node.js App** → **Edit** → **Environment Variables**
2. Verifica estas variables:
   - `DB_HOST` = `localhost`
   - `DB_USER` = `premioclick_premioclick_user` (o tu usuario)
   - `DB_PASSWORD` = (tu contraseña correcta)
   - `DB_NAME` = `premioclick_premioclick_db` (o tu base de datos)
3. Guarda y reinicia

#### Error de Sintaxis (SyntaxError)
**Solución:**
1. Los logs te dirán qué archivo tiene el error
2. Verifica que ese archivo esté subido correctamente
3. Asegúrate de que no tenga caracteres raros o errores de formato

### PASO 6: Verificar Archivos

En **File Manager** de cPanel, verifica que en `public_html/api/` estén estos archivos:

**Archivos obligatorios:**
- ✅ `index.js` (o el archivo principal que configuraste)
- ✅ `package.json`
- ✅ Carpeta `config/` con `database.js`
- ✅ Carpeta `routes/` con todos los archivos
- ✅ Carpeta `middleware/` con `auth.js`

**Si falta alguno, súbelo ahora.**

### PASO 7: Verificar Configuración de la App

En **Node.js App** → **Edit**, verifica:

1. **Application Root:** `public_html/api`
2. **Application URL:** Debe estar configurada (puede ser automática)
3. **Application Startup File:** `index.js` (o el nombre de tu archivo principal)
4. **Node.js Version:** Debe estar seleccionada (14.x, 16.x, 18.x, etc.)

### PASO 8: Reiniciar Todo

1. En **Node.js App**, haz clic en **"Stop"** (si está corriendo)
2. Espera 5 segundos
3. Haz clic en **"Start"**
4. Espera 15-20 segundos
5. Prueba: `https://premioclick.cl/api/health`

## Verificación Rápida

Después de hacer los pasos, prueba esto:

1. **En el navegador:** `https://premioclick.cl/api/health`
   - ✅ Debe mostrar: `{"status":"OK","message":"Servidor funcionando correctamente"}`
   - ❌ Si sigue dando 503, revisa los logs (PASO 4)

2. **En la app móvil:**
   - Cierra completamente la app
   - Ábrela de nuevo
   - Intenta hacer login o cualquier acción
   - ✅ Debe funcionar sin error 503

## Si Nada Funciona

**Comparte conmigo:**

1. **Los últimos 50 líneas de los logs** de Node.js App (PASO 4)
2. **El estado de la aplicación** (Running/Stopped)
3. **Qué error específico aparece** en los logs

Con esa información podré darte una solución más específica.

## Checklist Final

- [ ] Aplicación Node.js está en estado "Running"
- [ ] Logs no muestran errores críticos
- [ ] `https://premioclick.cl/api/health` responde correctamente
- [ ] Variables de entorno están configuradas
- [ ] Todos los archivos están en `public_html/api/`
- [ ] Tabla `mensajes_chat` existe (si los logs la mencionan)
- [ ] Aplicación reiniciada después de cambios
