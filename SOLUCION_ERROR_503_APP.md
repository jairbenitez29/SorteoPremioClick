# Solución Error 503 en App Móvil (Expo Go)

## El Problema
Error 503 al intentar usar la app móvil con Expo Go. Esto significa que la app no puede conectarse al backend.

## Solución Rápida

### 1. Verificar que el backend esté corriendo localmente

Abre una terminal y ejecuta:

```bash
cd backend
npm start
```

Deberías ver algo como:
```
✅ Base de datos inicializada correctamente
🚀 Servidor corriendo en puerto 3001
```

**Si no está corriendo, inícialo ahora.**

### 2. Verificar tu IP local

Tu IP actual es: **192.168.1.48**

Verifica que esta sea correcta ejecutando en CMD:
```cmd
ipconfig
```

Busca "Dirección IPv4" en tu adaptador de red activo.

### 3. Verificar configuración en `services/api.ts`

El archivo ya está configurado con:
- `FORCE_PRODUCTION = false` ✅ (usa backend local)
- `LOCAL_IP = '192.168.1.48'` ✅ (tu IP actual)

### 4. Verificar que el backend responda

Abre en el navegador de tu teléfono (mientras estás en la misma WiFi):
```
http://192.168.1.48:3001/api/health
```

Deberías ver:
```json
{"status":"OK","message":"Servidor funcionando correctamente"}
```

**Si no ves esto, el backend no está corriendo o hay un problema de red.**

### 5. Verificar firewall de Windows

El firewall puede estar bloqueando el puerto 3001:

1. Ve a **Configuración de Windows** → **Firewall de Windows**
2. Haz clic en **"Permitir una aplicación a través del firewall"**
3. Busca **Node.js** y asegúrate de que esté marcado para **Red privada**
4. Si no está, haz clic en **"Permitir otra aplicación"** y agrega Node.js

O temporalmente desactiva el firewall para probar.

### 6. Reiniciar Expo

Después de hacer cambios:

```bash
# Detén Expo (Ctrl+C)
npm start -- --clear
```

### 7. Verificar que estés en la misma red WiFi

- Tu PC y tu teléfono deben estar en la **misma red WiFi**
- No uses datos móviles en el teléfono
- No uses VPN que pueda cambiar la IP

## Checklist de Verificación

✅ Backend corriendo en `http://localhost:3001`  
✅ IP configurada correctamente en `services/api.ts` (192.168.1.48)  
✅ `FORCE_PRODUCTION = false` en `services/api.ts`  
✅ Teléfono y computadora en la misma red WiFi  
✅ Firewall de Windows permite conexiones en puerto 3001  
✅ Puedes acceder a `http://192.168.1.48:3001/api/health` desde el navegador del teléfono  
✅ Expo reiniciado después de cambios  

## Si sigue sin funcionar

1. **Verifica los logs de Expo:**
   - Deberías ver: `🔗 URL de la API configurada: http://192.168.1.48:3001/api`
   - Si ves otra URL, hay un problema de configuración

2. **Verifica los logs del backend:**
   - Deberías ver las peticiones llegando cuando usas la app
   - Si no ves nada, la app no está llegando al backend

3. **Prueba con otra IP:**
   - A veces la IP cambia, verifica con `ipconfig` de nuevo
   - Actualiza `LOCAL_IP` en `services/api.ts` si cambió

4. **Prueba desactivar temporalmente el firewall**

5. **Verifica que MySQL esté corriendo** (si usas base de datos local)

## Cambiar a Producción (cuando quieras usar el servidor de cPanel)

Si quieres usar el backend de producción (`https://premioclick.cl/api`):

1. Edita `services/api.ts`
2. Cambia `FORCE_PRODUCTION = true`
3. Reinicia Expo
