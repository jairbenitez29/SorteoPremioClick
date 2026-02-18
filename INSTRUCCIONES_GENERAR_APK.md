# Instrucciones para Generar el APK

## Requisitos Previos

1. **Node.js instalado** (versión 18 o superior)
   - Descargar desde: https://nodejs.org/
   - Verificar instalación: `node --version`

2. **Expo CLI instalado globalmente**
   ```bash
   npm install -g expo-cli eas-cli
   ```

3. **Cuenta de Expo** (gratuita)
   - Crear cuenta en: https://expo.dev/
   - Iniciar sesión: `npx expo login`

4. **EAS CLI instalado y configurado**
   ```bash
   npm install -g eas-cli
   eas login
   ```

## Pasos para Generar el APK

### 1. Descomprimir el proyecto
- Extraer el archivo ZIP en una carpeta
- Abrir terminal/PowerShell en esa carpeta

### 2. Instalar dependencias
```bash
npm install
```

### 3. Verificar configuración
- El archivo `eas.json` ya está configurado
- El archivo `app.json` tiene la configuración de la app

### 4. Iniciar sesión en Expo (si no lo has hecho)
```bash
npx expo login
```

### 5. Generar el APK

**Opción A: APK de prueba (preview) - Más rápido**
```bash
eas build --platform android --profile preview
```

**Opción B: APK de producción (production) - Para publicar**
```bash
eas build --platform android --profile production
```

### 6. Seguir las instrucciones
- EAS te pedirá confirmar algunos datos
- El proceso puede tardar 10-20 minutos
- Se generará en la nube de Expo

### 7. Descargar el APK
- Una vez terminado, EAS te dará un enlace para descargar
- O puedes verlo en: https://expo.dev/accounts/[tu-usuario]/builds

## Solución de Problemas

### Error: "No se encuentra el comando eas"
```bash
npm install -g eas-cli
```

### Error: "No estás autenticado"
```bash
npx expo login
eas login
```

### Error: "EPERM: operation not permitted"
- Ejecutar PowerShell/CMD como Administrador
- O limpiar la carpeta temporal: `C:\Users\[usuario]\AppData\Local\Temp\eas-cli-nodejs\`

### Error: "Module not found"
```bash
npm install
```

### Si el build falla
- Revisar los logs que EAS muestra
- Verificar que todas las dependencias estén instaladas
- Asegurarse de tener conexión a internet estable

## Notas Importantes

- ⚠️ **Primera vez:** El primer build puede tardar más (20-30 min)
- ⚠️ **Conexión:** Necesitas internet estable durante todo el proceso
- ⚠️ **Cuenta Expo:** Debes tener una cuenta de Expo (gratuita)
- ⚠️ **Espacio:** Asegúrate de tener al menos 500 MB libres

## Estructura del Proyecto

```
SorteosApp/
├── app/              # Código de la app React Native
├── backend/           # Backend Node.js (no necesario para APK)
├── web/              # Frontend web (no necesario para APK)
├── assets/           # Imágenes y recursos
├── components/       # Componentes React Native
├── services/         # Servicios de API
├── package.json      # Dependencias
├── app.json          # Configuración de Expo
├── eas.json          # Configuración de EAS Build
└── tsconfig.json     # Configuración TypeScript
```

## Comandos Útiles

```bash
# Verificar que todo está bien
npm run lint

# Probar la app localmente (opcional)
npx expo start

# Ver builds anteriores
eas build:list

# Ver detalles de un build
eas build:view [BUILD_ID]
```

## Contacto

Si tienes problemas, revisa:
- Los logs de EAS en la consola
- La documentación: https://docs.expo.dev/build/introduction/
- El archivo `GENERAR_APK.md` (si existe)
