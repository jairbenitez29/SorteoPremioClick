# Diagnóstico Backend cPanel - Error 503

## El Problema
La app móvil intenta conectarse a `https://premioclick.cl/api` pero recibe error 503 (Service Unavailable).

## Pasos de Diagnóstico

### 1. Verificar que la aplicación Node.js esté corriendo

1. **Accede a cPanel**
2. Ve a **"Node.js App"** o **"Node.js"**
3. Busca tu aplicación (probablemente "api" o "PremioClick API")
4. **Verifica el estado:**
   - Si dice **"Stopped"** o **"Detenida"** → Haz clic en **"Start"** o **"Iniciar"**
   - Si dice **"Running"** o **"Corriendo"** → Haz clic en **"Restart"** o **"Reiniciar"**

### 2. Ver los logs de error

1. En **Node.js App**, haz clic en **"View Logs"** o **"Ver Logs"**
2. Revisa los **últimos mensajes** (scroll hacia abajo)
3. Busca errores en rojo o mensajes que indiquen problemas

**Errores comunes que verás:**
- `Error: Cannot find module` → Faltan dependencias
- `Error: connect ECONNREFUSED` → Problema con la base de datos
- `Error: Table doesn't exist` → Falta crear una tabla
- `SyntaxError` → Error en el código

### 3. Probar el endpoint de health

Abre en tu navegador:
```
https://premioclick.cl/api/health
```

**Deberías ver:**
```json
{"status":"OK","message":"Servidor funcionando correctamente"}
```

**Si ves error 503 o 500:**
- La aplicación no está corriendo
- Hay un error en el código que impide que inicie

**Si ves error 404:**
- La ruta no está configurada correctamente
- El archivo `api/index.js` no está en el lugar correcto

### 4. Verificar estructura de archivos

En cPanel **File Manager**, verifica que en `public_html/api/` estén:

```
public_html/api/
├── index.js (o el archivo principal)
├── package.json
├── node_modules/ (carpeta)
├── config/
│   └── database.js
├── routes/
│   ├── auth.js
│   ├── sorteos.js
│   ├── tickets.js
│   ├── pagos.js
│   ├── tombola.js
│   ├── admin.js
│   └── promociones.js
└── middleware/
    ├── auth.js
    └── upload.js
```

### 5. Verificar variables de entorno

En **Node.js App** → **Edit** → **Environment Variables**, verifica:

**Obligatorias:**
- `DB_HOST` = `localhost` (o la IP del servidor MySQL)
- `DB_USER` = `premioclick_premioclick_user` (o tu usuario de BD)
- `DB_PASSWORD` = (tu contraseña de BD)
- `DB_NAME` = `premioclick_premioclick_db` (o tu nombre de BD)
- `JWT_SECRET` = (cualquier string largo y seguro)

**Opcionales pero importantes:**
- `PAYPAL_CLIENT_ID` = (para pagos)
- `PAYPAL_CLIENT_SECRET` = (para pagos)
- `PAYPAL_MODE` = `production` (para pagos reales)
- `BACKEND_URL` = `https://premioclick.cl` (opcional)

### 6. Verificar que la tabla de chat exista (si aplica)

Si los logs mencionan `mensajes_chat`:

1. Ve a **phpMyAdmin**
2. Selecciona tu base de datos
3. Ejecuta:

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

### 7. Reiniciar la aplicación

Después de hacer cambios:

1. Ve a **Node.js App**
2. Haz clic en **"Restart"** o **"Reiniciar"**
3. Espera 10-15 segundos
4. Verifica que el estado cambie a **"Running"**

### 8. Probar desde la app móvil

Después de reiniciar:

1. Cierra completamente la app en tu teléfono
2. Ábrela de nuevo
3. Intenta hacer login o cualquier acción

## Soluciones Rápidas

### Si la app dice "Stopped":
1. Haz clic en **"Start"**
2. Espera 10 segundos
3. Verifica que cambie a **"Running"**

### Si hay error en los logs sobre módulos faltantes:
1. En **Node.js App** → **Edit**
2. Verifica que **"Application Root"** sea `public_html/api`
3. Haz clic en **"Restart"**

### Si hay error de base de datos:
1. Verifica las credenciales en **Environment Variables**
2. Verifica que el usuario de BD tenga permisos en phpMyAdmin
3. Prueba la conexión desde phpMyAdmin

### Si hay error de sintaxis:
1. Revisa los logs para ver qué archivo tiene el error
2. Verifica que todos los archivos estén subidos correctamente
3. Asegúrate de que no haya caracteres raros o errores de formato

## Verificación Final

Después de hacer los cambios, verifica:

1. ✅ **Backend corriendo** en cPanel Node.js App
2. ✅ **Health endpoint funciona**: `https://premioclick.cl/api/health`
3. ✅ **App móvil puede conectarse** (sin error 503)
4. ✅ **Logs no muestran errores** críticos

## Si Nada Funciona

Comparte conmigo:
1. **Los últimos 30-50 líneas de los logs** de Node.js App
2. **El mensaje de error exacto** que ves en la app móvil
3. **El resultado** de acceder a `https://premioclick.cl/api/health` en el navegador
