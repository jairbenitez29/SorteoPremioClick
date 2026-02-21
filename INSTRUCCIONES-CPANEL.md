# 📋 Instrucciones para Integrar Auto-Login en premioclick.cl

## 🎯 Objetivo
Hacer que cuando un usuario venga desde la app móvil, se autentique automáticamente en la web sin tener que volver a loguearse.

---

## 📝 PASO 1: Subir el archivo JavaScript

1. **En el cPanel**, ve a **Administrador de archivos**
2. Navega a la carpeta `public_html`
3. Haz clic en **"Cargar"** (Upload)
4. Sube el archivo `web-auto-login.js` que creamos
5. Asegúrate de que el archivo quede en `public_html/web-auto-login.js`

---

## 📝 PASO 2: Modificar `index.html`

1. **Abre** el archivo `index.html` en el editor del cPanel
2. **Busca** la sección donde están los scripts (generalmente antes del cierre de `</body>` o en el `<head>`)
3. **Agrega** esta línea ANTES de tus otros scripts:

```html
<!-- Script de auto-login (debe ir ANTES de tus otros scripts) -->
<script src="/web-auto-login.js"></script>
```

**Ejemplo de cómo debería verse:**

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <!-- tus meta tags aquí -->
</head>
<body>
    <!-- tu contenido HTML aquí -->
    
    <!-- Script de auto-login (AGREGAR ESTA LÍNEA) -->
    <script src="/web-auto-login.js"></script>
    
    <!-- Tus otros scripts existentes (index.js, script.js, etc.) -->
    <script src="/index.js"></script>
    <script src="/script.js"></script>
</body>
</html>
```

---

## 📝 PASO 3: Modificar tu `index.js` o `script.js`

Necesitas agregar código para **escuchar el evento de autenticación** y actualizar tu aplicación cuando el usuario se autentique automáticamente.

### Opción A: Si usas `index.js`

Abre `index.js` y agrega este código al **inicio del archivo** (o donde manejes la autenticación):

```javascript
// ============================================
// AUTO-LOGIN: Escuchar evento de autenticación automática
// ============================================
window.addEventListener('userAuthenticated', function(event) {
    const { user, token } = event.detail;
    console.log('✅ Usuario autenticado automáticamente:', user);
    
    // Aquí actualiza tu estado de autenticación
    // Por ejemplo, si tienes una variable global:
    if (typeof currentUser !== 'undefined') {
        currentUser = user;
    }
    
    // Si tienes una función para actualizar la UI:
    if (typeof updateAuthState === 'function') {
        updateAuthState(user);
    }
    
    // Si necesitas recargar la página:
    // window.location.reload();
    
    // O si tienes una función específica para mostrar contenido autenticado:
    if (typeof showAuthenticatedContent === 'function') {
        showAuthenticatedContent(user);
    }
});
```

### Opción B: Si usas `script.js`

Haz lo mismo que en la Opción A, pero en `script.js`.

---

## 📝 PASO 4: Verificar que tu código maneje localStorage

Asegúrate de que tu código actual **verifique si hay un token guardado** al cargar la página. Si no lo hace, agrega esto:

```javascript
// Al inicio de tu código (cuando la página carga)
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si ya hay una sesión guardada
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
        try {
            const user = JSON.parse(userStr);
            console.log('👤 Sesión encontrada:', user);
            
            // Actualizar tu estado de autenticación
            // (usa las mismas funciones que en el paso 3)
            if (typeof updateAuthState === 'function') {
                updateAuthState(user);
            }
        } catch (error) {
            console.error('Error al cargar sesión:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }
});
```

---

## 📝 PASO 5: Asegurar que las peticiones API usen el token

Si tu código hace peticiones al API (`https://premioclick.cl/api`), asegúrate de incluir el token en los headers:

```javascript
// Función helper para hacer peticiones autenticadas
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`https://premioclick.cl/api${endpoint}`, {
        ...options,
        headers: headers
    });
    
    return response;
}

// Ejemplo de uso:
// const response = await apiRequest('/sorteos', { method: 'GET' });
```

---

## ✅ Verificación

1. **Guarda todos los cambios** en el cPanel
2. **Abre la app móvil** y loguéate
3. **Ve a tu perfil** y toca "Premiaciones en Línea"
4. **La web debería abrirse** y autenticarte automáticamente
5. **Abre la consola del navegador** (F12) y deberías ver:
   - `🚀 Inicializando auto-login...`
   - `🔑 Token encontrado en URL...`
   - `✅ Auto-login exitoso...`

---

## 🐛 Solución de Problemas

### El usuario no se autentica automáticamente

1. **Verifica** que `web-auto-login.js` esté en `public_html/`
2. **Verifica** que el script esté incluido en `index.html`
3. **Abre la consola** (F12) y busca errores
4. **Verifica** que la URL tenga los parámetros `?token=XXX&autoLogin=true`

### Error 401 o 403

- El token puede haber expirado. El script limpiará el token inválido automáticamente.

### El token no se guarda

- Verifica que `localStorage` esté disponible en tu navegador
- Algunos navegadores bloquean `localStorage` en modo incógnito

---

## 📞 ¿Necesitas ayuda?

Si tienes problemas, comparte:
1. Los errores de la consola (F12)
2. El código de tu `index.js` o `script.js` actual
3. Cómo manejas actualmente la autenticación en tu web
