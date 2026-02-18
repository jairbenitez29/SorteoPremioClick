# Cómo Aplicar Cambios de Conversión CLP a USD en cPanel

## Archivos que necesitas actualizar en cPanel

### 1. Backend (Node.js)
- **Archivo:** `backend/routes/pagos.js`
- **Ubicación en cPanel:** `public_html/api/backend/routes/pagos.js` (o la ruta donde tengas el backend)

### 2. Frontend Web
- **Archivo:** `web/comprar-ticket.html`
- **Ubicación en cPanel:** `public_html/comprar-ticket.html`

- **Archivo:** `web/comprar-ticket.js`
- **Ubicación en cPanel:** `public_html/comprar-ticket.js`

## Pasos para aplicar los cambios

### Opción 1: Usando File Manager de cPanel (Recomendado)

1. **Inicia sesión en cPanel**
   - Ve a tu panel de control de cPanel
   - Ingresa con tus credenciales

2. **Abre File Manager**
   - Busca la sección "Archivos" → "File Manager"
   - Navega a la carpeta donde está tu aplicación (generalmente `public_html`)

3. **Sube los archivos modificados**
   
   **Para el backend:**
   - Navega a `public_html/api/backend/routes/` (o donde tengas el backend)
   - Haz clic en "Upload" (Subir)
   - Selecciona el archivo `pagos.js` desde tu computadora
   - Espera a que termine la subida
   - **IMPORTANTE:** Reemplaza el archivo existente si te pregunta

   **Para el frontend:**
   - Navega a `public_html/`
   - Sube `comprar-ticket.html` y `comprar-ticket.js`
   - Reemplaza los archivos existentes

4. **Reinicia la aplicación Node.js**
   - Ve a "Node.js App" en cPanel
   - Encuentra tu aplicación
   - Haz clic en el botón "Restart" (Reiniciar) o "Reload"
   - Espera unos segundos a que se reinicie

5. **Verifica los cambios**
   - Abre tu sitio web: `https://premioclick.cl`
   - Ve a la página de comprar tickets
   - Verifica que los precios muestren "CLP"
   - Verifica que aparezca la nota sobre la conversión a USD

### Opción 2: Usando FTP/SFTP

1. **Conecta con un cliente FTP** (FileZilla, WinSCP, etc.)
   - Host: `ftp.premioclick.cl` o `premioclick.cl`
   - Usuario: Tu usuario de cPanel
   - Contraseña: Tu contraseña de cPanel
   - Puerto: 21 (FTP) o 22 (SFTP)

2. **Navega a las carpetas correspondientes**
   - Backend: `public_html/api/backend/routes/`
   - Frontend: `public_html/`

3. **Sube los archivos**
   - Arrastra y suelta los archivos modificados
   - Confirma el reemplazo si te pregunta

4. **Reinicia la aplicación Node.js desde cPanel**
   - Ve a "Node.js App"
   - Haz clic en "Restart"

## Verificación de cambios

### 1. Verificar Backend
- Los logs del backend deberían mostrar:
  ```
  Monto CLP (original): 1000 CLP
  Monto USD (para PayPal): 1.00 USD
  Tasa de cambio: 1000 CLP = 1 USD
  ```

### 2. Verificar Frontend
- En la página de comprar tickets deberías ver:
  - Precios con "CLP" al final (ej: "$1000 CLP")
  - Una nota informativa sobre la conversión a USD
  - El total también debe mostrar "CLP"

### 3. Probar un pago (en modo sandbox)
- Intenta crear un pago de prueba
- Verifica que PayPal reciba el monto correcto en USD
- Ejemplo: Si el ticket cuesta 1000 CLP, PayPal debería recibir $1.00 USD

## Solución de problemas

### Si los cambios no se aplican:

1. **Limpia la caché del navegador**
   - Presiona `Ctrl + Shift + R` (Windows) o `Cmd + Shift + R` (Mac)
   - O abre en modo incógnito

2. **Verifica que los archivos se subieron correctamente**
   - Revisa las fechas de modificación en File Manager
   - Asegúrate de que los archivos tienen el contenido correcto

3. **Revisa los logs de Node.js**
   - En cPanel → Node.js App → Logs
   - Busca errores relacionados con `pagos.js`

4. **Verifica permisos de archivos**
   - Los archivos deben tener permisos 644 (lectura/escritura para propietario, lectura para otros)

## Notas importantes

- ⚠️ **Haz backup antes de subir:** Descarga los archivos originales por si necesitas revertir
- ⚠️ **Reinicia Node.js:** Es importante reiniciar la app Node.js después de cambiar archivos del backend
- ⚠️ **Verifica la ruta:** Asegúrate de subir los archivos a la ruta correcta según tu estructura en cPanel

## Estructura esperada en cPanel

```
public_html/
├── api/
│   └── backend/
│       └── routes/
│           └── pagos.js  ← Actualizar este
├── comprar-ticket.html   ← Actualizar este
└── comprar-ticket.js     ← Actualizar este
```

Si tu estructura es diferente, ajusta las rutas según corresponda.
