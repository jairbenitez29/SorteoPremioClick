# 🔍 Verificar Configuración Node.js en cPanel

## El Problema
Error 503 significa que la aplicación Node.js no está iniciando correctamente.

## Verificación Rápida en cPanel

### 1. Verificar Archivo de Inicio

En **Node.js App** → **Edit**, verifica:

**Application Startup File:** Debe ser **`server.js`** (NO `index.js` o `api/index.js`)

Si dice `index.js` o `api/index.js`, cámbialo a **`server.js`**

### 2. Verificar Ubicación de Archivos

En **File Manager**, verifica que en `public_html/api/` esté:

- ✅ `server.js` (archivo principal)
- ✅ `package.json`
- ✅ Carpeta `config/` con `database.js`
- ✅ Carpeta `routes/` con todos los archivos
- ✅ Carpeta `middleware/` con `auth.js`

**IMPORTANTE:** El archivo `server.js` debe estar directamente en `public_html/api/server.js`

### 3. Verificar Application Root

En **Node.js App** → **Edit**:

**Application Root:** Debe ser **`public_html/api`**

### 4. Ver los Logs

1. En **Node.js App**, haz clic en **"View Logs"**
2. Desplázate hasta el final
3. Busca estos mensajes:

**✅ Si ves:**
```
✅ Base de datos inicializada correctamente
🚀 Servidor corriendo en puerto 3001
```
→ La app está funcionando, el problema puede ser otro

**❌ Si ves:**
```
Error: Cannot find module 'server.js'
```
→ El archivo `server.js` no está en el lugar correcto

**❌ Si ves:**
```
Error: Cannot find module 'X'
```
→ Faltan dependencias, necesitas reinstalar `node_modules`

**❌ Si ves:**
```
SyntaxError: ...
```
→ Hay un error en el código

### 5. Solución Rápida

**Si el Application Startup File NO es `server.js`:**

1. En **Node.js App** → **Edit**
2. Cambia **"Application Startup File"** a: **`server.js`**
3. Haz clic en **"Save"** o **"Guardar"**
4. Haz clic en **"Restart"** o **"Reiniciar"**
5. Espera 15 segundos
6. Prueba: `https://premioclick.cl/api/health`

### 6. Si `server.js` no existe en `public_html/api/`

Necesitas subirlo:

1. En **File Manager**, ve a `public_html/api/`
2. Verifica si existe `server.js`
3. Si NO existe, súbelo desde tu computadora:
   - Archivo: `backend/server.js`
   - Destino: `public_html/api/server.js`

### 7. Verificar que `server.js` tenga el código correcto

El archivo `server.js` debe:
- ✅ Tener `server.listen()` al final
- ✅ NO tener `module.exports = app` (eso es para Vercel)
- ✅ Iniciar el servidor con `server.listen(PORT, HOST)`

## Checklist de Verificación

- [ ] Application Startup File = `server.js`
- [ ] Application Root = `public_html/api`
- [ ] Archivo `server.js` existe en `public_html/api/`
- [ ] Archivo `package.json` existe en `public_html/api/`
- [ ] Carpeta `config/` existe con `database.js`
- [ ] Carpeta `routes/` existe con todos los archivos
- [ ] Variables de entorno configuradas
- [ ] Aplicación reiniciada después de cambios

## Después de Verificar

1. **Reinicia la aplicación** (Stop → Start)
2. **Espera 15 segundos**
3. **Prueba:** `https://premioclick.cl/api/health`
4. **Revisa los logs** para ver si hay errores

## Si Sigue el Error 503

Comparte conmigo:
1. **Qué dice "Application Startup File"** en Node.js App → Edit
2. **Los últimos 30 líneas de los logs**
3. **Si existe el archivo `server.js`** en `public_html/api/`
