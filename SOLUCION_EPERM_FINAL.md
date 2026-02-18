# 🔧 Solución Final: Error EPERM al Generar APK

## ❌ Error
```
EPERM: operation not permitted, rmdir 'C:\Users\KELVIN\AppData\Local\Temp\eas-cli-nodejs\...\backend'
```

Este error ocurre porque EAS Build crea un "shallow clone" del repositorio y Windows bloquea la eliminación de carpetas.

---

## ✅ Solución Definitiva: Ejecutar como Administrador

**Esta es la solución más confiable:**

### Paso 1: Cerrar todos los procesos
1. Cierra **Visual Studio Code** o **Cursor** (si está abierto)
2. Cierra **Expo Go** (si está corriendo)
3. Cierra cualquier **PowerShell** o **Terminal** abierta

### Paso 2: Abrir PowerShell como Administrador
1. Presiona `Windows + X`
2. Selecciona **"Windows PowerShell (Administrador)"** o **"Terminal (Administrador)"**
3. Si te pide confirmación, haz clic en **"Sí"**

### Paso 3: Navegar al proyecto
```powershell
cd C:\Users\KELVIN\OneDrive\Desktop\SorteosApp
```

### Paso 4: Limpiar carpeta temporal
```powershell
$tempPath = "$env:LOCALAPPDATA\Temp\eas-cli-nodejs"
if (Test-Path $tempPath) {
    Remove-Item -Path $tempPath -Recurse -Force
    Write-Host "✅ Carpeta temporal limpiada" -ForegroundColor Green
}
```

### Paso 5: Ejecutar el build
```bash
npx eas build --platform android --profile preview
```

---

## 🔄 Solución Alternativa: Cambiar Directorio Temporal

Si ejecutar como administrador no es posible, puedes cambiar el directorio temporal:

### Opción A: Usar variable de entorno
```powershell
$env:TMPDIR = "C:\Temp\eas-build"
New-Item -ItemType Directory -Force -Path $env:TMPDIR
npx eas build --platform android --profile preview
```

### Opción B: Usar script automatizado
Ejecuta el script `generar-apk.ps1` como administrador:
```powershell
.\generar-apk.ps1
```

---

## 🛠️ Verificar que .easignore esté funcionando

Asegúrate de que `.easignore` contenga:
```
/imagenes/
/backend/
/web/
```

Y que `.gitignore` también los tenga:
```
imagenes/
backend/
web/
```

---

## 📝 Notas Importantes

1. **Ejecutar como administrador** es la solución más confiable en Windows
2. El error ocurre durante la **compresión y subida** del proyecto
3. Una vez que el build se suba exitosamente, el proceso continuará en la nube
4. El build en la nube toma **10-20 minutos**

---

## ✅ Verificación

Si el build inicia correctamente, verás:
```
✔ Compressing project files and uploading to EAS Build
Uploading [████████████████████████] 100%
```

Si ves ese mensaje, el problema está resuelto y el build continuará en la nube.
