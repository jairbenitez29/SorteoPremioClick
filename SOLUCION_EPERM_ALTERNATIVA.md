# Solucion Alternativa: Error EPERM en Windows

## El Problema
EAS Build crea un "shallow-clone" en una carpeta temporal y Windows bloquea la eliminacion de carpetas, incluso ejecutando como Administrador.

## Solucion: Build Local (Recomendado)

En lugar de usar EAS Build en la nube, puedes generar el APK localmente:

### Paso 1: Instalar dependencias
```powershell
npm install
```

### Paso 2: Prebuild (generar carpetas nativas)
```powershell
npx expo prebuild --platform android
```

### Paso 3: Generar APK localmente
```powershell
cd android
.\gradlew assembleRelease
```

### Paso 4: El APK estara en
```
android\app\build\outputs\apk\release\app-release.apk
```

## Alternativa: Usar EAS Build Local

Si prefieres usar EAS pero localmente:

```powershell
npx eas build --platform android --profile preview --local
```

Esto evita el problema del shallow-clone porque todo se hace localmente.

## Nota Importante

El build local requiere:
- Android Studio instalado
- Java JDK instalado
- Variables de entorno ANDROID_HOME configuradas

Pero evita completamente el problema de permisos de Windows con EAS Build en la nube.
