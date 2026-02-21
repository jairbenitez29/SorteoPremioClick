# 🔧 Integración Completa - Auto-Login en tu Web

## 📋 Archivos Modificados

### 1. `index.html`
**Cambio realizado:** Agregada la línea del script de auto-login ANTES de `script.js`

```html
<!-- ANTES -->
<script src="/socket.io/socket.io.js"></script>
<script src="script.js"></script>

<!-- DESPUÉS -->
<script src="/web-auto-login.js"></script>  <!-- ← AGREGAR ESTA LÍNEA -->
<script src="/socket.io/socket.io.js"></script>
<script src="script.js"></script>
```

---

### 2. `script.js`
**Cambios necesarios:**

#### A) Agregar al INICIO del archivo (antes de todo):

```javascript
// ============================================
// AUTO-LOGIN: Integración con app móvil
// ============================================

// Escuchar evento de autenticación automática
window.addEventListener('userAuthenticated', function(event) {
    const { user, token } = event.detail;
    console.log('✅ Usuario autenticado automáticamente:', user);
    
    // Guardar en variables globales si las usas
    if (typeof window.currentUser !== 'undefined') {
        window.currentUser = user;
    }
    
    // Actualizar UI
    updateUserUI(user);
    
    // Autenticar socket si existe
    if (window.socket && token) {
        window.socket.emit('authenticate', { token: token });
    }
    
    // Cerrar modales si están abiertos
    closeAllModals();
});

// Verificar sesión al cargar
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
        try {
            const user = JSON.parse(userStr);
            console.log('👤 Sesión encontrada:', user);
            
            // Actualizar UI
            updateUserUI(user);
            
            // Autenticar socket
            if (window.socket && token) {
                window.socket.emit('authenticate', { token: token });
            }
        } catch (error) {
            console.error('Error al cargar sesión:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }
});

// Función helper para actualizar UI
function updateUserUI(user) {
    if (!user) return;
    
    const userInfo = document.getElementById('userInfo');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const loginBtn = document.getElementById('loginBtn');
    const ganadoresBtn = document.getElementById('ganadoresBtn');
    
    if (userInfo && userNameDisplay) {
        userNameDisplay.textContent = user.nombre || user.email || 'Usuario';
        userInfo.style.display = 'flex';
    }
    
    if (loginBtn) {
        loginBtn.style.display = 'none';
    }
    
    if (ganadoresBtn && user.rol === 'admin') {
        ganadoresBtn.style.display = 'inline-block';
    }
}

// Función helper para cerrar modales
function closeAllModals() {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    if (loginModal) loginModal.style.display = 'none';
    if (registerModal) registerModal.style.display = 'none';
}
```

#### B) Modificar tu función de LOGIN existente:

**ANTES:**
```javascript
async function login(email, password) {
    const response = await fetch('https://premioclick.cl/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (data.token && data.user) {
        // Actualizar UI
        updateUserUI(data.user);
    }
}
```

**DESPUÉS:**
```javascript
async function login(email, password) {
    const response = await fetch('https://premioclick.cl/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (data.token && data.user) {
        // ✅ AGREGAR: Guardar en localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Actualizar UI
        updateUserUI(data.user);
        
        // ✅ AGREGAR: Autenticar socket
        if (window.socket && data.token) {
            window.socket.emit('authenticate', { token: data.token });
        }
    }
}
```

#### C) Modificar tu función de LOGOUT existente:

**ANTES:**
```javascript
function logout() {
    // Ocultar UI de usuario
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('loginBtn').style.display = 'block';
}
```

**DESPUÉS:**
```javascript
function logout() {
    // ✅ AGREGAR: Limpiar localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Limpiar variables globales
    if (typeof window.currentUser !== 'undefined') {
        window.currentUser = null;
    }
    
    // Ocultar UI de usuario
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('loginBtn').style.display = 'block';
    document.getElementById('ganadoresBtn').style.display = 'none';
    
    // Desconectar socket si es necesario
    if (window.socket) {
        window.socket.disconnect();
    }
}
```

#### D) Modificar tus peticiones al API para incluir el token:

**ANTES:**
```javascript
fetch('https://premioclick.cl/api/sorteos')
```

**DESPUÉS:**
```javascript
const token = localStorage.getItem('token');
const headers = {
    'Content-Type': 'application/json'
};

if (token) {
    headers['Authorization'] = `Bearer ${token}`;
}

fetch('https://premioclick.cl/api/sorteos', {
    headers: headers
})
```

O crear una función helper:

```javascript
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
    
    if (response.status === 401) {
        // Token inválido, limpiar y redirigir
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        logout();
    }
    
    return response;
}

// Uso:
// const response = await apiRequest('/sorteos');
// const data = await response.json();
```

---

## ✅ Checklist de Integración

- [ ] Subir `web-auto-login.js` a `public_html/`
- [ ] Modificar `index.html` para incluir el script
- [ ] Agregar código de auto-login al inicio de `script.js`
- [ ] Modificar función `login()` para guardar en localStorage
- [ ] Modificar función `logout()` para limpiar localStorage
- [ ] Actualizar peticiones API para incluir token
- [ ] Probar desde la app móvil

---

## 🧪 Prueba

1. Inicia sesión en la app móvil
2. Ve a Perfil → Premiaciones en Línea
3. La web debería abrirse y autenticarte automáticamente
4. Verifica en la consola (F12) que aparezcan los logs:
   - `🚀 Inicializando auto-login...`
   - `✅ Auto-login exitoso...`

---

## 🐛 Solución de Problemas

### El usuario no se autentica
- Verifica que `web-auto-login.js` esté cargado (pestaña Network en F12)
- Verifica que la URL tenga `?token=XXX&autoLogin=true`
- Revisa la consola para errores

### El token no se guarda
- Verifica que tu función `login()` guarde en localStorage
- Algunos navegadores bloquean localStorage en modo incógnito

### El socket no se autentica
- Asegúrate de llamar `socket.emit('authenticate', { token })` después del login
- Verifica que el token sea válido
