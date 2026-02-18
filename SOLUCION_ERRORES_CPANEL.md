# 🔧 Solución de Errores en cPanel

## Errores Identificados y Soluciones

### 1. ❌ Error: `Cannot find module './config/database'`

**Problema**: El archivo `server.js` no encuentra el módulo `./config/database`.

**Solución**:
1. Verifica que la estructura de carpetas en cPanel sea correcta:
   ```
   /home/premioclick/public_html/api/
   ├── server.js (o index.js)
   ├── config/
   │   └── database.js
   ├── routes/
   ├── middleware/
   └── ...
   ```

2. Si estás usando `server.js` como punto de entrada, asegúrate de que:
   - El archivo `config/database.js` existe en `/home/premioclick/public_html/api/config/`
   - Los `require()` en `server.js` usan rutas relativas correctas

3. **Recomendación**: Usa `api/index.js` como punto de entrada en lugar de `server.js` para cPanel, ya que está mejor configurado para el entorno de producción.

### 2. ❌ Error: `Access denied for user 'premioclick_user'@'localhost'`

**Problema**: Las credenciales de la base de datos son incorrectas o el usuario no tiene permisos.

**Solución**:
1. Ve a **cPanel → MySQL Databases**
2. Verifica que el usuario `premioclick_premioclick_user` existe
3. Verifica que tiene permisos **ALL PRIVILEGES** en la base de datos `premioclick_premioclick_db`
4. En **Node.js App → Environment Variables**, verifica:
   - `DB_HOST`: `localhost`
   - `DB_USER`: `premioclick_premioclick_user` (el nombre COMPLETO con el prefijo)
   - `DB_PASSWORD`: La contraseña correcta
   - `DB_NAME`: `premioclick_premioclick_db` (el nombre COMPLETO con el prefijo)
   - `DB_TYPE`: `mysql`

### 3. ❌ Error: `Mode must be "sandbox" or "live"`

**Problema**: La variable `PAYPAL_MODE` no está configurada o tiene un valor inválido.

**Solución**:
1. Ve a **cPanel → Node.js App → Environment Variables**
2. Agrega o corrige:
   - `PAYPAL_MODE`: Debe ser exactamente `sandbox` o `live` (en minúsculas, sin espacios)
   - `PAYPAL_CLIENT_ID`: Tu Client ID de PayPal
   - `PAYPAL_CLIENT_SECRET`: Tu Client Secret de PayPal

3. **IMPORTANTE**: 
   - Para pruebas: `PAYPAL_MODE=sandbox`
   - Para producción: `PAYPAL_MODE=live`

### 4. ❌ Error: `Maximum call stack size exceeded`

**Problema**: Recursión infinita en `database.js` (ya corregido en el código).

**Solución**: 
- Los archivos ya han sido corregidos. Solo necesitas subir los archivos actualizados:
  - `backend/config/database.js`
  - `backend/routes/pagos.js`

### 5. ❌ Error: `Data too long for column 'imagen_portada'`

**Problema**: Las columnas de imágenes son demasiado pequeñas para almacenar imágenes base64.

**Solución**: Ejecuta este SQL en phpMyAdmin:
```sql
ALTER TABLE sorteos 
MODIFY COLUMN imagen_portada LONGTEXT;

ALTER TABLE sorteos 
MODIFY COLUMN imagenes LONGTEXT;

ALTER TABLE productos 
MODIFY COLUMN imagenes LONGTEXT;
```

### 6. ❌ Error: `You have an error in your SQL syntax... VALUES ?`

**Problema**: Error en la sintaxis de inserción batch de tickets (ya corregido).

**Solución**: 
- El archivo `backend/routes/tickets.js` ya está corregido. Solo necesitas subirlo.

---

## 📋 Checklist de Verificación

### Archivos que DEBEN estar en `/home/premioclick/public_html/api/`:

- [ ] `server.js` o `index.js` (punto de entrada)
- [ ] `package.json`
- [ ] `config/database.js`
- [ ] `routes/` (todos los archivos)
- [ ] `middleware/` (todos los archivos)
- [ ] `node_modules/` (instalado con `npm install`)

### Variables de Entorno en Node.js App:

- [ ] `DB_HOST` = `localhost`
- [ ] `DB_USER` = `premioclick_premioclick_user` (nombre completo)
- [ ] `DB_PASSWORD` = (tu contraseña)
- [ ] `DB_NAME` = `premioclick_premioclick_db` (nombre completo)
- [ ] `DB_TYPE` = `mysql`
- [ ] `JWT_SECRET` = (tu secret key)
- [ ] `PAYPAL_MODE` = `sandbox` o `live` (exactamente, sin espacios)
- [ ] `PAYPAL_CLIENT_ID` = (tu client ID)
- [ ] `PAYPAL_CLIENT_SECRET` = (tu client secret)
- [ ] `PORT` = (el puerto asignado por cPanel, o déjalo vacío)
- [ ] `NODE_ENV` = `production`

---

## 🚀 Pasos para Corregir Todo

1. **Sube los archivos corregidos**:
   - `backend/config/database.js`
   - `backend/routes/pagos.js`
   - `backend/routes/tickets.js` (si tiene el fix de batch insert)

2. **Verifica las variables de entorno** en cPanel Node.js App

3. **Ejecuta el SQL** para corregir las columnas de imágenes (punto 5)

4. **Reinicia la aplicación Node.js** en cPanel

5. **Verifica los logs** en cPanel para ver si hay más errores

---

## 🔍 Cómo Verificar que Todo Funciona

1. Accede a: `https://premioclick.cl/api/health`
   - Debe responder: `{"status":"OK","message":"Servidor funcionando correctamente"}`

2. Revisa los logs de la aplicación Node.js en cPanel
   - Debe mostrar: `✅ Conectado a MySQL (local)`
   - Debe mostrar: `✅ PayPal configurado correctamente` (si las credenciales están bien)

3. Prueba crear un sorteo desde la app móvil
   - No debe dar error de "Data too long"

4. Prueba comprar un ticket desde la web
   - No debe dar error 500 de PayPal

---

## ⚠️ Notas Importantes

- **PAYPAL_MODE** debe ser exactamente `sandbox` o `live`, nada más
- Los nombres de usuario y base de datos en cPanel incluyen el prefijo `premioclick_`
- Después de cambiar variables de entorno, **SIEMPRE reinicia** la aplicación Node.js
- Si cambias archivos, reinicia la aplicación para que cargue los cambios
