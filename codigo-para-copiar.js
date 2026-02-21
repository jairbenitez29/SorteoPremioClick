// ============================================
// CÓDIGO PARA COPIAR EN TU index.js o script.js
// ============================================

// 1. ESCUCHAR EVENTO DE AUTO-LOGIN
// Copia esto al INICIO de tu archivo index.js o script.js

window.addEventListener('userAuthenticated', function(event) {
    const { user, token } = event.detail;
    console.log('✅ Usuario autenticado automáticamente:', user);
    
    // ACTUALIZA ESTA PARTE según cómo manejes la autenticación en tu web:
    
    // Opción 1: Si tienes una variable global para el usuario
    if (typeof window.currentUser !== 'undefined') {
        window.currentUser = user;
    }
    
    // Opción 2: Si tienes una función para actualizar el estado
    if (typeof updateAuthState === 'function') {
        updateAuthState(user);
    }
    
    // Opción 3: Si quieres recargar la página
    // window.location.reload();
    
    // Opción 4: Si tienes funciones específicas de tu app
    // Ejemplo: mostrar contenido autenticado, ocultar login, etc.
    // showUserInfo(user);
    // hideLoginForm();
});

// 2. VERIFICAR SESIÓN AL CARGAR LA PÁGINA
// Copia esto también en tu index.js o script.js (puede ir junto al código anterior)

document.addEventListener('DOMContentLoaded', function() {
    // Verificar si ya hay una sesión guardada
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
        try {
            const user = JSON.parse(userStr);
            console.log('👤 Sesión encontrada al cargar:', user);
            
            // ACTUALIZA ESTA PARTE igual que arriba:
            if (typeof window.currentUser !== 'undefined') {
                window.currentUser = user;
            }
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

// 3. FUNCIÓN HELPER PARA PETICIONES API (OPCIONAL)
// Si haces peticiones al API, usa esta función para incluir el token automáticamente

async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(`https://premioclick.cl/api${endpoint}`, {
            ...options,
            headers: headers
        });
        
        if (response.status === 401) {
            // Token inválido, limpiar sesión
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Redirigir a login si es necesario
            // window.location.href = '/login.html';
        }
        
        return response;
    } catch (error) {
        console.error('Error en petición API:', error);
        throw error;
    }
}

// Ejemplo de uso de apiRequest:
// const response = await apiRequest('/sorteos', { method: 'GET' });
// const data = await response.json();
