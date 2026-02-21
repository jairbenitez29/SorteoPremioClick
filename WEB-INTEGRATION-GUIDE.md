# Guía de Integración - Auto-Login Web

Esta guía explica cómo integrar el sistema de auto-login en tu página web (`premioclick.cl`) para que los usuarios que vengan desde la app móvil se autentiquen automáticamente.

## 📋 Requisitos

- Página web funcionando en `https://premioclick.cl`
- Backend API funcionando en `https://premioclick.cl/api`
- Endpoint `/auth/verify` disponible en el backend

## 🔧 Instalación

### Paso 1: Subir el archivo JavaScript

1. Copia el archivo `web-auto-login.js` a tu servidor web
2. Colócalo en una carpeta accesible públicamente (ej: `/public/js/` o `/assets/js/`)

### Paso 2: Incluir el script en tu HTML

Agrega el script en tu archivo HTML principal (generalmente `index.html` o el layout principal):

```html
<!-- Antes del cierre de </body> o en el <head> -->
<script src="/js/web-auto-login.js"></script>
```

O si usas un framework moderno (React, Vue, etc.), inclúyelo en tu componente principal o layout.

### Paso 3: Escuchar el evento de autenticación

El script dispara un evento `userAuthenticated` cuando el usuario se autentica. Escucha este evento en tu aplicación:

```javascript
// Ejemplo con JavaScript vanilla
window.addEventListener('userAuthenticated', function(event) {
  const { user, token } = event.detail;
  console.log('Usuario autenticado:', user);
  
  // Actualizar tu estado de autenticación
  // Redirigir o actualizar la UI según tu necesidad
  updateAuthState(user);
});

// Ejemplo con React
useEffect(() => {
  const handleAuth = (event) => {
    const { user, token } = event.detail;
    setUser(user);
    setIsAuthenticated(true);
  };
  
  window.addEventListener('userAuthenticated', handleAuth);
  
  return () => {
    window.removeEventListener('userAuthenticated', handleAuth);
  };
}, []);
```

## 🔄 Flujo de Funcionamiento

1. **Usuario en la app móvil**: Toca "Premiaciones en Línea"
2. **App abre navegador**: Con URL `https://premioclick.cl?token=XXX&autoLogin=true`
3. **Script detecta token**: Lee el parámetro `token` de la URL
4. **Verifica con backend**: Hace petición a `/auth/verify` con el token
5. **Guarda sesión**: Almacena token y usuario en `localStorage`
6. **Notifica a la app**: Dispara evento `userAuthenticated`
7. **Limpia URL**: Remueve los parámetros de la URL por seguridad

## 📝 Ejemplo de Integración Completa

### HTML (index.html)

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Premioclick - Premiaciones en Línea</title>
</head>
<body>
    <div id="app">
        <!-- Tu contenido aquí -->
    </div>
    
    <!-- Incluir el script de auto-login -->
    <script src="/js/web-auto-login.js"></script>
    
    <!-- Tu código de aplicación -->
    <script>
        // Escuchar el evento de autenticación
        window.addEventListener('userAuthenticated', function(event) {
            const { user, token } = event.detail;
            
            // Mostrar información del usuario
            console.log('Bienvenido:', user.nombre);
            
            // Actualizar la UI
            updateUIForAuthenticatedUser(user);
        });
        
        function updateUIForAuthenticatedUser(user) {
            // Ocultar formulario de login
            const loginForm = document.getElementById('login-form');
            if (loginForm) loginForm.style.display = 'none';
            
            // Mostrar información del usuario
            const userInfo = document.getElementById('user-info');
            if (userInfo) {
                userInfo.innerHTML = `
                    <p>Bienvenido, ${user.nombre}</p>
                    <p>Email: ${user.email}</p>
                `;
                userInfo.style.display = 'block';
            }
        }
    </script>
</body>
</html>
```

### React (App.js o componente principal)

```jsx
import { useEffect, useState } from 'react';

function App() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Escuchar evento de autenticación desde el script
    const handleAuth = (event) => {
      const { user, token } = event.detail;
      setUser(user);
      setIsAuthenticated(true);
    };

    window.addEventListener('userAuthenticated', handleAuth);

    // Verificar si ya hay sesión al cargar
    const existingToken = localStorage.getItem('token');
    const existingUser = localStorage.getItem('user');
    
    if (existingToken && existingUser) {
      try {
        setUser(JSON.parse(existingUser));
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error al cargar sesión:', error);
      }
    }

    return () => {
      window.removeEventListener('userAuthenticated', handleAuth);
    };
  }, []);

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <h1>Bienvenido, {user?.nombre}</h1>
          <p>Email: {user?.email}</p>
          {/* Tu contenido para usuarios autenticados */}
        </div>
      ) : (
        <div>
          {/* Tu formulario de login normal */}
        </div>
      )}
    </div>
  );
}

export default App;
```

## 🔒 Seguridad

- El token se limpia de la URL después de usarlo
- El token se almacena en `localStorage` (considera usar cookies httpOnly en producción)
- El token se verifica con el backend antes de aceptarlo
- Los tokens inválidos se eliminan automáticamente

## 🐛 Debugging

El script incluye logs en la consola. Abre las herramientas de desarrollador (F12) para ver:

- `🚀 Inicializando auto-login...`
- `🔑 Token encontrado en URL...`
- `✅ Auto-login exitoso...`
- `❌ Error en auto-login...`

## 📞 Soporte

Si tienes problemas:

1. Verifica que el archivo `web-auto-login.js` esté accesible
2. Verifica que la API esté funcionando en `https://premioclick.cl/api`
3. Revisa la consola del navegador para errores
4. Verifica que el endpoint `/auth/verify` acepte tokens Bearer
