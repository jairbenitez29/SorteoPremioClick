# Solución Error 503 - Service Unavailable

## ¿Qué significa el error 503?

El error 503 significa que el servidor Node.js no está respondiendo. Esto puede ser porque:
1. La aplicación Node.js no está corriendo
2. Hay un error en el código que impide que la app inicie
3. La aplicación se cayó por un error

## Pasos para solucionar:

### 1. Verificar que la aplicación esté corriendo

1. **Accede a cPanel**
2. Ve a **"Node.js App"** o **"Node.js"**
3. Busca tu aplicación (probablemente "api" o "PremioClick API")
4. Verifica el estado:
   - Si dice **"Stopped"** o **"Detenida"**, haz clic en **"Start"** o **"Iniciar"**
   - Si dice **"Running"** o **"Corriendo"**, haz clic en **"Restart"** o **"Reiniciar"**

### 2. Ver los logs de error

1. En la misma sección de **Node.js App**
2. Haz clic en **"View Logs"** o **"Ver Logs"**
3. Revisa los últimos mensajes para ver qué error está causando el problema

### 3. Verificar variables de entorno

1. En **Node.js App**, haz clic en **"Edit"** o **"Editar"**
2. Ve a la sección **"Environment Variables"** o **"Variables de Entorno"**
3. Verifica que estas variables estén configuradas:
   - `DB_HOST`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
   - `JWT_SECRET`
   - `PAYPAL_CLIENT_ID` (opcional, pero necesario para pagos)
   - `PAYPAL_CLIENT_SECRET` (opcional, pero necesario para pagos)
   - `PAYPAL_MODE` (opcional, default: sandbox)

### 4. Crear la tabla de mensajes del chat (si falta)

Si los logs mencionan que falta la tabla `mensajes_chat`:

1. Ve a **phpMyAdmin** en cPanel
2. Selecciona tu base de datos
3. Ve a la pestaña **"SQL"**
4. Ejecuta este script:

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

### 5. Verificar archivos subidos

Asegúrate de que todos los archivos estén en su lugar:

**En `public_html/api/`:**
- `index.js` (o el archivo principal)
- `package.json`
- Carpeta `config/` con `database.js`
- Carpeta `routes/` con todos los archivos
- Carpeta `middleware/` con `auth.js` y `upload.js`
- Carpeta `node_modules/` (se genera automáticamente)

### 6. Reiniciar la aplicación

Después de hacer cambios:

1. Ve a **Node.js App**
2. Haz clic en **"Restart"** o **"Reiniciar"**
3. Espera unos segundos
4. Verifica que el estado cambie a **"Running"**

### 7. Verificar el puerto

En cPanel Node.js App, verifica que:
- El **Application Root** apunte a `public_html/api`
- El **Application URL** esté configurado correctamente
- El **Application Startup File** sea `index.js` (o el archivo principal)

## Errores comunes y soluciones:

### Error: "Cannot find module"
- **Solución**: Ejecuta `npm install` en la carpeta `public_html/api/` o reinstala los módulos desde cPanel

### Error: "Table doesn't exist"
- **Solución**: Ejecuta el script SQL para crear la tabla faltante (ver paso 4)

### Error: "Connection refused" o "Access denied"
- **Solución**: Verifica las credenciales de la base de datos en las variables de entorno

### Error: "Port already in use"
- **Solución**: Detén otras aplicaciones Node.js o cambia el puerto

## Si nada funciona:

1. **Detén la aplicación** completamente
2. **Elimina los logs** antiguos
3. **Verifica que todos los archivos estén subidos** correctamente
4. **Inicia la aplicación** nuevamente
5. **Revisa los logs** inmediatamente para ver el primer error

## Contacto:

Si el problema persiste, comparte:
- Los últimos 20-30 líneas de los logs de Node.js
- El mensaje de error exacto
- Qué cambios hiciste antes de que apareciera el error
