# 📱 Generar APK - PremioClick

## 🚀 Opción 1: EAS Build (Recomendado - En la Nube)

### Requisitos Previos:
1. **Instalar EAS CLI** (si no lo tienes):
   ```bash
   npm install -g eas-cli
   ```

2. **Iniciar sesión en Expo**:
   ```bash
   eas login
   ```

### Generar APK:

#### Para APK de Preview (Testing):
```bash
eas build --platform android --profile preview
```

#### Para APK de Producción:
```bash
eas build --platform android --profile production
```

### Descargar el APK:
1. El build se ejecutará en la nube (toma 10-20 minutos)
2. Recibirás un enlace cuando termine
3. O puedes ver el progreso en: https://expo.dev/accounts/[tu-usuario]/projects/premioclick/builds

---

## 🔧 Opción 2: Build Local (Requiere más configuración)

### Requisitos:
- Android Studio instalado
- Java JDK instalado
- Variables de entorno configuradas

### Comandos:

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Prebuild (generar carpetas nativas)**:
   ```bash
   npx expo prebuild --platform android
   ```

3. **Generar APK**:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

4. **El APK estará en**:
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

---

## 📋 Comando Exacto Recomendado

**Para generar el APK más rápido y fácil:**

```bash
eas build --platform android --profile preview
```

Este comando:
- ✅ Genera un APK instalable
- ✅ No requiere configuración adicional
- ✅ Se ejecuta en la nube
- ✅ Toma 10-20 minutos

---

## 🔍 Verificar Configuración

Antes de generar, verifica que `app.json` tenga:
- ✅ `package`: "com.premioclick.app"
- ✅ `version`: "1.0.0"
- ✅ Icono configurado

---

## 📝 Notas Importantes

1. **Primera vez**: Necesitarás crear una cuenta en Expo si no tienes una
2. **APK vs AAB**: 
   - APK: Para instalar directamente
   - AAB: Para subir a Google Play Store
3. **Firma**: El APK generado estará firmado automáticamente por Expo

---

## 🆘 Si tienes problemas

1. **Error de autenticación**:
   ```bash
   eas login
   ```

2. **Error de proyecto**:
   ```bash
   eas build:configure
   ```

3. **Ver logs del build**:
   El enlace se mostrará en la terminal o en https://expo.dev
