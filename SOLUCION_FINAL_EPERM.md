# Solucion FINAL: Error EPERM en Windows con EAS Build

## El Problema Real

EAS Build crea un "shallow-clone" del proyecto en una carpeta temporal y Windows bloquea la eliminacion de CUALQUIER carpeta en ese clon, sin importar que carpetas movamos del proyecto original.

Este es un **bug conocido de EAS Build en Windows** que afecta a muchos usuarios.

## Soluciones Reales (en orden de recomendacion)

### Opcion 1: Usar Build Local (RECOMENDADO)

```powershell
npx eas build --platform android --profile preview --local
```

**Ventajas:**
- Evita completamente el problema del shallow-clone
- Genera el APK localmente
- No sube archivos a la nube

**Requisitos:**
- Android Studio instalado
- Java JDK instalado
- Variables de entorno configuradas (opcional)

### Opcion 2: Generar APK de Forma Nativa

```powershell
# 1. Prebuild
npx expo prebuild --platform android

# 2. Generar APK
cd android
.\gradlew assembleRelease
```

El APK estara en: `android\app\build\outputs\apk\release\app-release.apk`

### Opcion 3: Usar WSL (Windows Subsystem for Linux)

Si tienes WSL instalado, puedes ejecutar EAS Build desde Linux:

```bash
# En WSL
cd /mnt/c/Users/KELVIN/OneDrive/Desktop/SorteosApp
npx eas build --platform android --profile preview
```

Esto evita los problemas de permisos de Windows.

### Opcion 4: Reportar el Bug a Expo

Este es un bug conocido. Puedes reportarlo en:
- GitHub: https://github.com/expo/eas-cli/issues
- Expo Forums: https://forums.expo.dev/

## Por Que No Funciona Mover Carpetas

Aunque movamos carpetas del proyecto original, EAS Build crea un shallow-clone completo en una carpeta temporal y Windows bloquea la eliminacion de CUALQUIER carpeta en ese clon, incluso si la carpeta esta vacia o no existe en el proyecto original.

## Recomendacion Final

**Usa la Opcion 1 (--local)**. Es la solucion mas simple y evita completamente el problema.

Si no tienes Android Studio, puedes instalarlo desde:
https://developer.android.com/studio
