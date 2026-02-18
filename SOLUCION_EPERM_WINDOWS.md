# 🔧 Solución: Error EPERM en Windows al Generar APK

## ❌ Error
```
EPERM: operation not permitted, rmdir 'C:\Users\KELVIN\AppData\Local\Temp\eas-cli-nodejs\...\backend'
```

Este error ocurre porque EAS Build está intentando crear un "shallow clone" en una carpeta temporal y Windows bloquea la eliminación de carpetas.

---

## ✅ Soluciones (Prueba en orden)

### Solución 1: Ejecutar PowerShell como Administrador ⭐ RECOMENDADO

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
   npx eas build --platform android --profile preview
   ```

---

### Solución 2: Actualizar EAS CLI

El mensaje dice que hay una versión más nueva disponible:

```bash
npm install -g eas-cli@latest
```

Luego intenta de nuevo:
```bash
npx eas build --platform android --profile preview
```

---

### Solución 3: Limpiar Carpeta Temporal y Cerrar Procesos

1. **Cierra todos los procesos relacionados**:
   - Visual Studio Code (si está abierto)
   - Expo Go (si está corriendo)
   - Cualquier proceso Node.js

2. **Abre el Administrador de Tareas** (`Ctrl + Shift + Esc`)
3. **Busca y cierra procesos**:
   - `node.exe`
   - `expo.exe`
   - `eas.exe`

4. **Limpia la carpeta temporal manualmente**:
   - Abre el Explorador de Archivos
   - Navega a: `C:\Users\KELVIN\AppData\Local\Temp\eas-cli-nodejs`
   - Elimina todas las carpetas dentro (si hay alguna)

5. **Vuelve a intentar el build**

---

### Solución 4: Desactivar Antivirus Temporalmente

A veces el antivirus bloquea operaciones en carpetas temporales:

1. **Desactiva temporalmente** tu antivirus
2. **Intenta el build**
3. **Reactiva el antivirus** después

---

### Solución 5: Usar Git para el Build

Si tienes Git instalado, EAS Build puede usar Git en lugar de crear un shallow clone:

1. **Inicializa Git** (si no lo has hecho):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Intenta el build de nuevo**

---

## 📋 Verificación del .easignore

El archivo `.easignore` ya está configurado correctamente y excluye:
- `/backend/`
- `/imagenes/`
- `/web/`
- `/node_modules/`

Estas carpetas NO deberían incluirse en el build, pero EAS Build las está intentando acceder durante el proceso de "shallow clone".

---

## 💡 Recomendación Final

**La solución más efectiva es ejecutar PowerShell como Administrador** (Solución 1). Esto le dará a EAS Build los permisos necesarios para trabajar con las carpetas temporales.
