# Guía Completa: Instalar Android Studio y Generar APK

## Paso 1: Descargar Android Studio

1. **Ve a la página oficial de Android Studio:**
   - Abre tu navegador
   - Ve a: https://developer.android.com/studio
   - O directamente: https://developer.android.com/studio/index.html

2. **Descarga Android Studio:**
   - Haz clic en el botón **"Download Android Studio"**
   - Acepta los términos y condiciones
   - El archivo se llamará algo como: `android-studio-2023.x.x-windows.exe`
   - El tamaño es aproximadamente 1 GB

## Paso 2: Instalar Android Studio

1. **Ejecuta el instalador:**
   - Busca el archivo descargado (normalmente en `Descargas`)
   - Haz doble clic para ejecutarlo
   - Si Windows pregunta permisos, haz clic en **"Sí"**

2. **Sigue el asistente de instalación:**
   - **Bienvenida**: Haz clic en **"Next"**
   - **Configuración**: Selecciona **"Standard"** (recomendado) y haz clic en **"Next"**
   - **Ubicación**: Deja la ubicación por defecto o elige otra, haz clic en **"Next"**
   - **Menú Inicio**: Deja marcado y haz clic en **"Install"**
   - Espera a que termine la instalación (puede tardar 10-20 minutos)

3. **Al finalizar:**
   - Marca **"Start Android Studio"** si está disponible
   - Haz clic en **"Finish"**

## Paso 3: Configurar Android Studio (Primera Vez)

1. **Primera ejecución:**
   - Android Studio se abrirá y mostrará un asistente de configuración
   - Si pregunta si quieres importar configuraciones, selecciona **"Do not import settings"** y haz clic en **"OK"**

2. **Setup Wizard:**
   - **Bienvenida**: Haz clic en **"Next"**
   - **Tipo de instalación**: Selecciona **"Standard"** y haz clic en **"Next"**
   - **Tema**: Elige el tema que prefieras (Light o Dark) y haz clic en **"Next"**
   - **Verificación**: Android Studio descargará e instalará:
     - Android SDK
     - Android SDK Platform
     - Android Virtual Device (AVD)
   - Esto puede tardar **20-30 minutos** dependiendo de tu internet
   - Haz clic en **"Next"** y luego en **"Finish"**
   - Espera a que termine la descarga e instalación

3. **Cuando termine:**
   - Haz clic en **"Finish"**
   - Android Studio se abrirá completamente

## Paso 4: Verificar Instalación

1. **Abre PowerShell como Administrador:**
   - Presiona `Windows + X`
   - Selecciona **"Windows PowerShell (Administrador)"**

2. **Verifica que Java esté instalado:**
   ```powershell
   java -version
   ```
   Deberías ver algo como: `java version "17.0.x"` o similar

3. **Verifica variables de entorno (opcional pero recomendado):**
   - Abre **"Variables de entorno"** en Windows
   - Busca `ANDROID_HOME` o `JAVA_HOME`
   - Si no existen, Android Studio las configurará automáticamente

## Paso 5: Generar el APK

Una vez que Android Studio esté instalado, vuelve a este proyecto y ejecuta:

```powershell
# 1. Asegúrate de estar en el proyecto
cd C:\Users\KELVIN\OneDrive\Desktop\SorteosApp

# 2. Genera las carpetas nativas de Android
npx expo prebuild --platform android

# 3. Genera el APK
cd android
.\gradlew assembleRelease
```

El APK estará en:
```
android\app\build\outputs\apk\release\app-release.apk
```

## Notas Importantes

- **Tiempo total**: La instalación completa puede tardar 30-60 minutos
- **Espacio en disco**: Necesitas al menos 5-10 GB libres
- **Internet**: Necesitas buena conexión para descargar los componentes
- **Primera vez**: La primera compilación puede tardar 10-15 minutos

## Si Tienes Problemas

1. **Error de permisos**: Ejecuta PowerShell como Administrador
2. **Error de Java**: Android Studio incluye Java, pero si hay problemas, instala JDK 17
3. **Error de Gradle**: Espera a que termine la descarga automática

## Alternativa Rápida: EAS Build Local

Si prefieres no instalar Android Studio completo, puedes usar EAS Build local (requiere menos configuración):

```powershell
npx eas build --platform android --profile preview --local
```

Pero esto también requiere algunas herramientas de Android, así que es mejor instalar Android Studio completo.
