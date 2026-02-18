# 🔧 Solución: Error EPERM al Generar APK

## ❌ Error
```
EPERM: operation not permitted, rmdir 'C:\Users\KELVIN\AppData\Local\Temp\eas-cli-nodejs\...'
```

Este error ocurre porque EAS CLI no tiene permisos para eliminar archivos temporales en Windows.

---

## ✅ Soluciones (Prueba en orden)

### Solución 1: Ejecutar PowerShell como Administrador

1. **Cierra PowerShell actual**
2. **Abre PowerShell como Administrador**:
   - Presiona `Windows + X`
   - Selecciona "Windows PowerShell (Administrador)" o "Terminal (Administrador)"
3. **Navega a tu proyecto**:
   ```powershell
   cd C:\Users\KELVIN\OneDrive\Desktop\SorteosApp
   ```
4. **Ejecuta el comando de nuevo**:
   ```bash
   eas build --platform android --profile preview
   ```

---

### Solución 2: Limpiar Carpeta Temporal Manualmente

1. **Cierra PowerShell**
2. **Abre el Explorador de Archivos**
3. **Navega a**:
   ```
   C:\Users\KELVIN\AppData\Local\Temp\eas-cli-nodejs
   ```
4. **Elimina todas las carpetas** dentro de `eas-cli-nodejs` (si hay alguna)
5. **Vuelve a intentar el build**

---

### Solución 3: Actualizar EAS CLI

El mensaje dice que hay una versión más nueva disponible:

```bash
npm install -g eas-cli@latest
```

Luego intenta de nuevo:
```bash
eas build --platform android --profile preview
```

---

### Solución 4: Cerrar Procesos que Puedan Estar Bloqueando

1. **Cierra**:
   - Visual Studio Code (si está abierto)
   - Cualquier otro editor de código
   - Expo Go (si está corriendo)
   - Cualquier proceso relacionado con Node.js

2. **Abre el Administrador de Tareas** (`Ctrl + Shift + Esc`)
3. **Busca procesos** como:
   - `node.exe`
   - `expo.exe`
   - `eas.exe`
4. **Cierra esos procesos**
5. **Intenta el build de nuevo**

---

### Solución 5: Desactivar Antivirus Temporalmente

A veces el antivirus bloquea operaciones en carpetas temporales:

1. **Desactiva temporalmente** tu antivirus
2. **Intenta el build**
3. **Vuelve a activar** el antivirus después

---

### Solución 6: Usar Git Bash en lugar de PowerShell

Si PowerShell sigue dando problemas:

1. **Abre Git Bash** (si lo tienes instalado)
2. **Navega al proyecto**:
   ```bash
   cd /c/Users/KELVIN/OneDrive/Desktop/SorteosApp
   ```
3. **Ejecuta**:
   ```bash
   eas build --platform android --profile preview
   ```

---

## 🎯 Solución Recomendada (Más Rápida)

**Ejecuta PowerShell como Administrador** (Solución 1) - Es la más común y efectiva.

---

## 📝 Si Nada Funciona

Puedes intentar generar el APK localmente (requiere más configuración):

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Prebuild**:
   ```bash
   npx expo prebuild --platform android
   ```

3. **Generar APK**:
   ```bash
   cd android
   .\gradlew assembleRelease
   ```

4. **El APK estará en**:
   ```
   android\app\build\outputs\apk\release\app-release.apk
   ```

---

## 💡 Nota

El error `EPERM` es común en Windows. La mayoría de las veces se resuelve ejecutando PowerShell como Administrador.
