# Guía para Preparar el Proyecto para MediaFire

## Pasos para Crear el ZIP

### 1. Eliminar carpetas innecesarias (ya hecho)
- ✅ `node_modules/` - Se regenera con `npm install`
- ✅ `.expo/` - Se regenera automáticamente
- ✅ `.expo-shared/` - Se regenera automáticamente

### 2. Crear el archivo ZIP

**Opción A: Usando Windows (Explorador de archivos)**
1. Selecciona la carpeta `SorteosApp`
2. Click derecho → "Enviar a" → "Carpeta comprimida (en zip)"
3. Espera a que termine la compresión
4. El archivo se llamará `SorteosApp.zip`

**Opción B: Usando PowerShell (más control)**
```powershell
cd C:\Users\KELVIN\OneDrive\Desktop
Compress-Archive -Path SorteosApp -DestinationPath SorteosApp.zip -Force
```

### 3. Verificar el tamaño
- El ZIP debería pesar entre 10-50 MB (sin node_modules)
- Si pesa más de 100 MB, revisa que no incluya:
  - `node_modules/`
  - `.expo/`
  - `.git/` (si existe)
  - Archivos temporales

### 4. Subir a MediaFire
1. Ve a: https://www.mediafire.com/
2. Inicia sesión o crea cuenta (gratis)
3. Click en "Subir" o "Upload"
4. Selecciona el archivo `SorteosApp.zip`
5. Espera a que termine la subida
6. Copia el enlace de descarga
7. Comparte el enlace con tu amigo

## Archivos que DEBEN incluirse

✅ **Código fuente:**
- `app/` - Código de la app React Native
- `components/` - Componentes
- `services/` - Servicios de API
- `context/` - Contextos de React
- `assets/` - Imágenes y recursos

✅ **Configuración:**
- `package.json` - Dependencias
- `package-lock.json` - Versiones exactas
- `app.json` - Configuración de Expo
- `eas.json` - Configuración de EAS Build
- `tsconfig.json` - Configuración TypeScript
- `babel.config.js` - Configuración Babel

✅ **Documentación:**
- `INSTRUCCIONES_GENERAR_APK.md` - Para tu amigo
- `README.md` - Si existe

✅ **Backend y Web (opcional, pero útil):**
- `backend/` - Para referencia
- `web/` - Para referencia

## Archivos que NO deben incluirse

❌ `node_modules/` - Se regenera con `npm install`
❌ `.expo/` - Se regenera automáticamente
❌ `.expo-shared/` - Se regenera automáticamente
❌ `.git/` - Si usas control de versiones
❌ `dist/` - Archivos compilados
❌ `*.log` - Archivos de log
❌ `.env` - Variables de entorno (contiene secretos)
❌ `.DS_Store` - Archivos del sistema Mac

## Verificación Final

Antes de subir, verifica que el ZIP contiene:
- ✅ `package.json`
- ✅ `app.json`
- ✅ `eas.json`
- ✅ Carpeta `app/`
- ✅ Carpeta `assets/`
- ✅ Carpeta `components/`
- ✅ Carpeta `services/`

## Instrucciones para tu amigo

Tu amigo debe:
1. Descargar el ZIP de MediaFire
2. Extraer el archivo
3. Abrir terminal en la carpeta extraída
4. Ejecutar: `npm install`
5. Seguir las instrucciones en `INSTRUCCIONES_GENERAR_APK.md`

## Tamaño esperado

- **Con node_modules:** 200-500 MB ❌ (muy pesado)
- **Sin node_modules:** 10-50 MB ✅ (ideal)

## Notas importantes

⚠️ **No incluyas:**
- Archivos `.env` con credenciales
- Archivos de configuración personal
- Datos sensibles

✅ **Sí incluye:**
- Todo el código fuente
- Archivos de configuración (sin secretos)
- Documentación
