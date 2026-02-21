# 🐛 Guía de Debugging - Auto-Login

## Pasos para verificar qué está pasando:

### 1. Abre la consola del navegador (F12)

### 2. Verifica que el script se carga:
Busca estos mensajes en la consola:
- `🔧 Script de auto-login cargado`
- `📝 Registrando listener userAuthenticated...`

### 3. Verifica la URL:
Cuando vengas desde la app, la URL debería tener:
```
https://premioclick.cl?token=XXX&autoLogin=true
```

### 4. Verifica los logs:
Deberías ver en orden:
1. `🚀 Inicializando auto-login...`
2. `🔑 Token encontrado en URL...`
3. `🔐 Intentando auto-login con token...`
4. `✅ Auto-login exitoso...`
5. `📢 Disparando evento userAuthenticated...`
6. `✅ Evento userAuthenticated recibido...`

### 5. Si NO ves los logs:
- El script `web-auto-login.js` no se está cargando
- Verifica en la pestaña Network (F12) que el archivo se carga correctamente
- Verifica que esté en `public_html/web-auto-login.js`

### 6. Si ves errores:
- **Error 401/403**: El token es inválido o expiró
- **Error de red**: Problema de conexión con el servidor
- **No se dispara el evento**: El listener no está registrado a tiempo

### 7. Verifica localStorage:
En la consola, escribe:
```javascript
localStorage.getItem('token')
localStorage.getItem('user')
```
Deberían tener valores después del auto-login.

### 8. Verifica que el listener esté registrado:
En la consola, escribe:
```javascript
window.PremioClickAutoLogin
```
Debería mostrar un objeto con funciones.

### 9. Forzar auto-login manualmente (para testing):
Si tienes un token, puedes probar manualmente:
```javascript
window.PremioClickAutoLogin.autoLoginWithToken('TU_TOKEN_AQUI')
```

## Soluciones comunes:

### Problema: El script no se carga
**Solución**: Verifica que `web-auto-login.js` esté en `public_html/` y que `index.html` tenga:
```html
<script src="/web-auto-login.js"></script>
```

### Problema: El evento no se dispara
**Solución**: El listener se registra al inicio de `script.js`. Verifica que no haya errores antes de esa línea.

### Problema: El token no se pasa en la URL
**Solución**: Verifica en la app móvil que `getWebUrl()` esté obteniendo el token correctamente.

### Problema: La UI no se actualiza
**Solución**: El script espera 1 segundo y luego recarga. Si no funciona, puede haber un error en `updateUIForUser()`.
