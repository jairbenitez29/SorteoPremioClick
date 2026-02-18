# 🔧 Alternativa: Agregar Variables de Entorno sin cPanel

## ❌ Error del Sistema

El error que estás viendo:
```
BlockingIOError: [Errno 11] Resource temporarily unavailable
```

Es un **error del sistema de cPanel/CloudLinux**, no de tus credenciales. El servidor está temporalmente sobrecargado o hay un problema con el sistema de licencias.

---

## ✅ Solución: Usar File Manager

Como la interfaz de cPanel está fallando, podemos agregar las variables directamente en un archivo `.env`:

### Paso 1: Acceder a File Manager

1. En cPanel, busca **"File Manager"** o **"Administrador de Archivos"**
2. Haz clic para abrirlo

### Paso 2: Navegar a la Carpeta de la API

1. En File Manager, navega a: `/home/premioclick/public_html/api/`
2. O busca la carpeta donde está tu aplicación Node.js

### Paso 3: Crear/Editar el archivo .env

1. **Activa "Mostrar archivos ocultos"**:
   - En File Manager, busca la opción **"Settings"** o **"Configuración"**
   - Activa **"Show Hidden Files"** o **"Mostrar archivos ocultos"**

2. **Busca el archivo `.env`**:
   - Si existe, haz clic derecho → **"Edit"** o **"Editar"**
   - Si NO existe, haz clic en **"New File"** o **"Nuevo Archivo"**
   - Nómbralo: `.env` (con el punto al inicio)

3. **Agrega estas líneas** (una por línea, sin espacios extra):

```
PAYPAL_MODE=live
PAYPAL_CLIENT_ID=ATJJeol8A8C6AHCJvr-vnCgtrfwG054CQiX0Ai_K9xqKKdEauL29xAzEpGGWVaVQL6MDH6qOnYHNeOLT
PAYPAL_CLIENT_SECRET=EGi10pUVAUHoamn3quBQTXqNdX3MGmoMZnm1Z8BE_SMZmYqHHBR47yMhBbvjNAhx0Gk1QFQDv5E5xF1x
DB_HOST=localhost
DB_NAME=premioclick_premioclick_db
DB_USER=premioclick_premioclick_user
DB_PASSWORD=MAMATEAMO123.
DB_PORT=3306
DB_TYPE=mysql
JWT_SECRET=tu_secret_key_super_segura_aqui
```

4. **Guarda el archivo**

### Paso 4: Verificar que el Backend Use el Archivo .env

Asegúrate de que tu `server.js` o `index.js` tenga esta línea al inicio:

```javascript
require('dotenv').config();
```

Si está en `backend/api/index.js`, debería tenerlo. Si está en `backend/server.js`, también.

### Paso 5: Reiniciar la Aplicación

1. Ve a **cPanel → Node.js App**
2. Selecciona tu aplicación
3. Haz clic en **"Restart"**

---

## 🔍 Verificar que Funcionó

### Opción 1: Ver los Logs

1. Ve a **cPanel → Node.js App → Logs**
2. Busca estos mensajes:

```
🔍 ========== CONFIGURACIÓN DE PAYPAL ==========
🔍 PAYPAL_MODE (raw): live
✅ PayPal configurado correctamente
   Modo: live
   Client ID (primeros 30 chars): ATJJeol8A8C6AHCJvr-vnCgtrfwG054...
✅ PayPal SDK configurado exitosamente
```

### Opción 2: Probar la Compra

1. Ve a la web: `https://premioclick.cl/comprar-ticket.html?id=[ID_SORTEO]`
2. Intenta comprar un ticket
3. Debería redirigir a PayPal sin error 401

---

## 📝 Formato del Archivo .env

El archivo `.env` debe tener este formato exacto:

```
VARIABLE_NAME=valor_sin_espacios
OTRA_VARIABLE=otro_valor
```

**IMPORTANTE**:
- Sin espacios antes o después del `=`
- Sin comillas alrededor de los valores
- Una variable por línea
- Sin líneas vacías al final (o mínimo necesario)

---

## 🆘 Si el Archivo .env No Funciona

### Verificar que dotenv esté Instalado

1. En cPanel → Node.js App
2. Haz clic en **"Run NPM Install"** junto a `package.json`
3. Esto instalará todas las dependencias, incluyendo `dotenv`

### Verificar la Ruta del Archivo .env

El archivo `.env` debe estar en la **misma carpeta** que el archivo que ejecuta la aplicación (`server.js` o `index.js`).

Si tu aplicación está en `/home/premioclick/public_html/api/`, el `.env` debe estar ahí también.

---

## 🔄 Alternativa: Esperar y Reintentar

Si prefieres usar la interfaz de cPanel:

1. **Espera unos minutos** (el error puede ser temporal)
2. **Refresca la página** de cPanel
3. **Intenta agregar las variables de nuevo**

El error "Resource temporarily unavailable" suele ser temporal y puede resolverse solo.

---

## 📋 Checklist

- [ ] Accedí a File Manager
- [ ] Activé "Mostrar archivos ocultos"
- [ ] Creé o edité el archivo `.env` en `/home/premioclick/public_html/api/`
- [ ] Agregué las variables de PayPal (sin espacios, sin comillas)
- [ ] Guardé el archivo
- [ ] Verifiqué que `require('dotenv').config()` esté en el código
- [ ] Reinicié la aplicación Node.js
- [ ] Verifiqué los logs para confirmar que se cargaron las variables
