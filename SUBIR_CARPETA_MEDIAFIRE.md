# Cómo Subir la Carpeta Completa a MediaFire (Sin ZIP)

## Opción 1: Subir Carpeta Directamente (Recomendado)

### Pasos:

1. **Abre MediaFire**
   - Ve a: https://www.mediafire.com/
   - Inicia sesión o crea una cuenta (gratis)

2. **Selecciona "Subir" o "Upload"**
   - Busca el botón de subir archivos

3. **Arrastra y Suelta la Carpeta**
   - Abre el Explorador de Windows
   - Navega a: `C:\Users\KELVIN\OneDrive\Desktop\`
   - **Arrastra la carpeta `SorteosApp` completa** a la ventana de MediaFire
   - O haz clic en "Seleccionar archivos" y elige la carpeta

4. **Espera a que termine**
   - MediaFire subirá todos los archivos de la carpeta
   - Puede tardar varios minutos dependiendo del tamaño

5. **Comparte el enlace**
   - Una vez terminado, MediaFire te dará un enlace
   - Comparte ese enlace con tu amigo

## Opción 2: Usando MediaFire Desktop App

1. **Descarga MediaFire Desktop**
   - Ve a: https://www.mediafire.com/software/
   - Descarga la aplicación de escritorio

2. **Instala y configura**
   - Instala la aplicación
   - Inicia sesión con tu cuenta

3. **Arrastra la carpeta**
   - Arrastra la carpeta `SorteosApp` a la ventana de MediaFire Desktop
   - Se subirá automáticamente

## Opción 3: Subir Archivos Individuales (Si la carpeta no funciona)

Si MediaFire no permite subir carpetas directamente:

1. **Crea una carpeta en MediaFire**
   - Dentro de MediaFire, crea una nueva carpeta llamada "SorteosApp"

2. **Sube las carpetas principales una por una**
   - Sube `app/`
   - Sube `components/`
   - Sube `services/`
   - Sube `assets/`
   - Sube `backend/` (opcional)
   - Sube `web/` (opcional)

3. **Sube los archivos de configuración**
   - `package.json`
   - `package-lock.json`
   - `app.json`
   - `eas.json`
   - `tsconfig.json`
   - `babel.config.js`
   - Todos los archivos `.md` (documentación)

## Recomendación: Usar Google Drive o Dropbox

Si MediaFire da problemas con carpetas, estas alternativas son mejores:

### Google Drive:
1. Ve a: https://drive.google.com/
2. Arrastra la carpeta `SorteosApp` completa
3. Click derecho → "Compartir" → "Obtener enlace"
4. Comparte el enlace con tu amigo

### Dropbox:
1. Ve a: https://www.dropbox.com/
2. Arrastra la carpeta `SorteosApp` completa
3. Click derecho → "Compartir" → "Crear enlace"
4. Comparte el enlace con tu amigo

## ⚠️ IMPORTANTE: Antes de Subir

### Excluir estas carpetas (para que no suba archivos innecesarios):

**Si puedes seleccionar qué subir, NO incluyas:**
- ❌ `node_modules/` - Muy pesada, se regenera con `npm install`
- ❌ `.expo/` - Se regenera automáticamente
- ❌ `.expo-shared/` - Se regenera automáticamente
- ❌ `.git/` - Si usas control de versiones
- ❌ `dist/` - Archivos compilados
- ❌ `*.log` - Archivos de log

**SÍ incluye:**
- ✅ `app/` - Código de la app
- ✅ `components/` - Componentes
- ✅ `services/` - Servicios
- ✅ `assets/` - Recursos
- ✅ `backend/` - Backend (opcional)
- ✅ `web/` - Web (opcional)
- ✅ Todos los archivos `.json`, `.js`, `.ts`, `.tsx`
- ✅ Todos los archivos `.md` (documentación)

## Tamaño Esperado

- **Con node_modules:** 200-500 MB (muy pesado, no recomendado)
- **Sin node_modules:** 10-50 MB (ideal)

## Instrucciones para tu Amigo

Una vez que tu amigo descargue la carpeta:

1. **Extraer/Descargar la carpeta completa**
   - Si MediaFire la comprime automáticamente, extraer el ZIP
   - Si no, descargar todos los archivos manteniendo la estructura

2. **Abrir terminal en la carpeta**
   - Navegar a la carpeta `SorteosApp`

3. **Instalar dependencias**
   ```bash
   npm install
   ```

4. **Seguir las instrucciones en `INSTRUCCIONES_GENERAR_APK.md`**

## Ventajas de Subir Sin ZIP

✅ **Más rápido:** No necesitas comprimir primero
✅ **Tu amigo puede ver la estructura:** Más fácil de entender
✅ **Menos pasos:** Directo de carpeta a MediaFire

## Desventajas

⚠️ **Puede ser más lento:** MediaFire sube archivo por archivo
⚠️ **Más archivos:** Si hay muchos archivos pequeños, puede tardar más

## Recomendación Final

**Mejor opción:** Usar **Google Drive** o **Dropbox** para subir carpetas completas. Son más rápidos y confiables para este tipo de archivos.
