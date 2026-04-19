// ============================================
// AUTO-LOGIN: Integración con app móvil
// ============================================
// IMPORTANTE: Este listener debe estar ANTES de cualquier otra cosa
// para asegurar que capture el evento cuando se dispare

// Función para manejar autenticación automática
function handleAutoLogin(user, token) {
    console.log('🔄 handleAutoLogin llamado con:', { user: user?.nombre, token: token ? 'presente' : 'ausente' });
    
    // Actualizar estado de autenticación
    currentUser = user;
    authToken = token;
    
    // Guardar en localStorage (por si acaso)
    if (token) {
        localStorage.setItem('token', token);
    }
    if (user) {
        localStorage.setItem('user', JSON.stringify(user));
    }
    
    // Actualizar UI (esperar a que las funciones estén disponibles)
    if (typeof updateUIForUser === 'function') {
        updateUIForUser(user);
    } else {
        // Si aún no está disponible, esperar un momento
        setTimeout(() => {
            if (typeof updateUIForUser === 'function') {
                updateUIForUser(user);
            }
        }, 100);
    }
    
    // Cerrar modales si están abiertos
    if (typeof closeLoginModal === 'function') {
        closeLoginModal();
    }
    if (typeof closeRegisterModal === 'function') {
        closeRegisterModal();
    }
    
    // Reconectar socket con autenticación
    if (socket) {
        socket.disconnect();
    }
    if (typeof initSocket === 'function') {
        initSocket();
    }
    
    // Recargar sorteos para actualizar la visualización
    if (typeof loadSorteos === 'function') {
        loadSorteos(currentFilter);
    }
}

// Registrar listener ANTES de que se ejecute cualquier otra cosa
console.log('📝 Registrando listener userAuthenticated...');
window.addEventListener('userAuthenticated', function(event) {
    const { user, token } = event.detail;
    console.log('✅ Evento userAuthenticated recibido:', { user: user?.nombre, token: token ? 'presente' : 'ausente' });
    handleAutoLogin(user, token);
});

// Verificar si hay token en la URL antes de verificar localStorage
function checkUrlToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    const autoLogin = urlParams.get('autoLogin') === 'true';
    
    if (urlToken && autoLogin) {
        console.log('🔑 Token encontrado en URL, esperando a que web-auto-login.js lo procese...');
        // El script web-auto-login.js se encargará de procesarlo
        return true;
    }
    return false;
}

// Verificar sesión existente al cargar (mejorado)
function checkExistingSession() {
    // Primero verificar si hay token en URL
    if (checkUrlToken()) {
        console.log('⏳ Token en URL detectado, esperando auto-login...');
        return;
    }
    
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
        try {
            const user = JSON.parse(userStr);
            console.log('👤 Sesión encontrada en localStorage:', user);
            
            // Actualizar estado
            currentUser = user;
            authToken = token;
            
            // Verificar que el token sigue siendo válido
            if (typeof checkAuth === 'function') {
                checkAuth();
            }
        } catch (error) {
            console.error('Error al cargar sesión:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    } else {
        console.log('ℹ️ No hay sesión guardada');
    }
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkExistingSession);
} else {
    // DOM ya está listo
    setTimeout(checkExistingSession, 100);
}
// ============================================
// FIN AUTO-LOGIN
// ============================================

// Configuración
// API en Vercel; la web en premioclick.cl debe apuntar aquí
const PRODUCTION_API_URL = 'https://sorteo-premio-click.vercel.app/api';
// Detectar si estamos en producción o desarrollo local
const isProduction = window.location.hostname.includes('vercel.app') || 
                     window.location.hostname.includes('railway.app') || 
                     window.location.hostname.includes('render.com') ||
                     window.location.hostname.includes('premioclick.cl');
const API_URL = isProduction 
    ? PRODUCTION_API_URL
    : window.location.origin.replace(/:\d+$/, ':3001') + '/api';  // En desarrollo, usar puerto 3001
let currentFilter = 'todos';
let currentUser = null;
let socket = null;
let authToken = null;

// Autenticación
function getAuthToken() {
    return localStorage.getItem('token');
}

function setAuthToken(token) {
    authToken = token;
    if (token) {
        localStorage.setItem('token', token);
    } else {
        localStorage.removeItem('token');
    }
}

async function checkAuth() {
    // Verificar si hay un proceso de auto-login en curso
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
        console.log('⏳ Auto-login en proceso, esperando...');
        // Esperar un momento para que el auto-login termine
        setTimeout(() => {
            // Verificar de nuevo después del auto-login
            const token = getAuthToken();
            if (token && currentUser) {
                console.log('✅ Auto-login completado, usuario ya autenticado');
                return;
            }
            // Si no se completó, hacer verificación normal
            performCheckAuth();
        }, 1500);
        return;
    }
    
    performCheckAuth();
}

async function performCheckAuth() {
    const token = getAuthToken();
    if (!token) {
        updateUIForGuest();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            authToken = token;
            
            // Guardar usuario en localStorage para consistencia
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
            }
            
            updateUIForUser(currentUser);
            if (socket) {
                socket.emit('authenticate', { token, userId: currentUser.id, rol: currentUser.rol });
            }
        } else {
            setAuthToken(null);
            currentUser = null;
            localStorage.removeItem('user');
            updateUIForGuest();
        }
    } catch (error) {
        console.error('Error al verificar autenticación:', error);
        setAuthToken(null);
        currentUser = null;
        localStorage.removeItem('user');
        updateUIForGuest();
    }
}

async function login(email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            setAuthToken(data.token);
            currentUser = data.user;
            
            // Guardar usuario en localStorage
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
            }
            
            updateUIForUser(currentUser);
            closeLoginModal();

            // Reconectar socket con autenticación
            if (socket && typeof socket.disconnect === 'function') {
                socket.disconnect();
            }
            initSocket();
            
            return true;
        } else {
            showLoginError(data.error || 'Error al iniciar sesión');
            return false;
        }
    } catch (error) {
        console.error('Error en login:', error);
        showLoginError('Error de conexión. Por favor, intenta de nuevo.');
        return false;
    }
}

function logout() {
    setAuthToken(null);
    currentUser = null;
    localStorage.removeItem('user');
    updateUIForGuest();
    if (socket) {
        socket.disconnect();
    }
    initSocket();
}

function updateUIForUser(user) {
    const userInfo = document.getElementById('userInfo');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const loginBtn = document.getElementById('loginBtn');
    const ganadoresBtn = document.getElementById('ganadoresBtn');
    const comprarTicketMainBtn = document.getElementById('comprarTicketMainBtn');
    const comprarSectionMain = comprarTicketMainBtn?.parentElement;
    
    if (userInfo && userNameDisplay) {
        userNameDisplay.textContent = user.nombre;
        if (user.rol === 'admin') {
            userNameDisplay.innerHTML = `<i class="fas fa-crown"></i> ${user.nombre} (Admin)`;
            userNameDisplay.classList.add('admin-badge');
            if (ganadoresBtn) {
                ganadoresBtn.style.display = 'flex';
            }
            // Ocultar botón de comprar tickets para admin
            if (comprarSectionMain) {
                comprarSectionMain.style.display = 'none';
            }
        } else {
            if (ganadoresBtn) {
                ganadoresBtn.style.display = 'none';
            }
            // Mostrar botón de comprar tickets para usuarios normales
            if (comprarSectionMain) {
                comprarSectionMain.style.display = 'block';
            }
        }
        userInfo.style.display = 'flex';
    }
    
    if (loginBtn) {
        loginBtn.style.display = 'none';
    }
    
    // Recargar sorteos para actualizar la visualización (mostrar/ocultar tickets vendidos)
    if (typeof loadSorteos === 'function') {
        loadSorteos(currentFilter);
    }
}

function updateUIForGuest() {
    const userInfo = document.getElementById('userInfo');
    const loginBtn = document.getElementById('loginBtn');
    const ganadoresBtn = document.getElementById('ganadoresBtn');
    const comprarTicketMainBtn = document.getElementById('comprarTicketMainBtn');
    const comprarSectionMain = comprarTicketMainBtn?.parentElement;
    
    if (userInfo) {
        userInfo.style.display = 'none';
    }
    
    if (loginBtn) {
        loginBtn.style.display = 'flex';
    }
    
    if (ganadoresBtn) {
        ganadoresBtn.style.display = 'none';
    }
    
    // Mostrar botón de comprar tickets para invitados
    if (comprarSectionMain) {
        comprarSectionMain.style.display = 'block';
    }
    
    // Recargar sorteos para actualizar la visualización (ocultar tickets vendidos)
    if (typeof loadSorteos === 'function') {
        loadSorteos(currentFilter);
    }
}

// Modal de login
function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.remove('active');
        const form = document.getElementById('loginForm');
        if (form) {
            form.reset();
        }
        const errorDiv = document.getElementById('loginError');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }
}

function showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

// Modal de registro
function openRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.classList.remove('active');
        const form = document.getElementById('registerForm');
        if (form) {
            form.reset();
        }
        const errorDiv = document.getElementById('registerError');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }
}

function showRegisterError(message) {
    const errorDiv = document.getElementById('registerError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

async function register(nombre, email, password, telefono) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, email, password, telefono: telefono || null })
        });

        const data = await response.json();

        if (response.ok) {
            setAuthToken(data.token);
            currentUser = data.user;
            
            // Guardar usuario en localStorage
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
            }
            
            updateUIForUser(currentUser);
            closeRegisterModal();
            
            // Reconectar socket con autenticación
            if (socket) {
                socket.disconnect();
            }
            initSocket();
            
            // Mostrar mensaje de éxito
            alert('¡Registro exitoso! Bienvenido a PremioClick');
            
            return true;
        } else {
            // Manejar errores de validación
            if (data.errors && Array.isArray(data.errors)) {
                const errorMessages = data.errors.map(err => err.msg).join(', ');
                showRegisterError(errorMessages);
            } else {
                showRegisterError(data.error || 'Error al registrarse');
            }
            return false;
        }
    } catch (error) {
        console.error('Error en registro:', error);
        showRegisterError('Error de conexión. Por favor, intenta de nuevo.');
        return false;
    }
}

// Inicializar Socket.io
function initSocket() {
    // Pusher: conexión en tiempo real sin WebSockets nativos (funciona en Vercel)
    const pusherClient = new Pusher('8230f2b79f984b7fad59', {
        cluster: 'us2',
    });

    const channel = pusherClient.subscribe('chat');

    channel.bind('new-message', (data) => {
        const chatModal = document.getElementById('chatModal');
        const isChatOpen = chatModal && chatModal.classList.contains('active');

        addMessage(data.user, data.message, data.isAdmin, data.timestamp);

        if (!isChatOpen) {
            incrementarMensajesNoLeidos();
        }
    });

    pusherClient.connection.bind('connected', async () => {
        console.log('✅ Conectado a Pusher');
        if (currentUser) {
            await cargarMensajesHistoricos();
        }
    });

    pusherClient.connection.bind('error', (err) => {
        console.error('❌ Error Pusher:', err);
    });

    // Guardar referencia para que sendMessage() sepa que está listo
    socket = { connected: true, pusher: pusherClient };
}

// Cargar sorteos
async function loadSorteos(filter = 'todos') {
    const grid = document.getElementById('sorteosGrid');
    grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Cargando sorteos...</p></div>';

    try {
        const response = await fetch(`${API_URL}/sorteos`);
        const data = await response.json();

        // Si la API devuelve error (500, 404, etc.) data puede ser { error, message }, no un array
        const sorteos = Array.isArray(data) ? data : [];
        if (!response.ok || !Array.isArray(data)) {
            console.warn('API sorteos:', response.status, data?.error || data?.message || data);
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error al cargar sorteos</h3>
                    <p>${data?.error || data?.message || 'Por favor, intenta de nuevo más tarde'}</p>
                </div>
            `;
            return;
        }

        console.log('🔍 ========== SORTEOS RECIBIDOS DEL BACKEND ==========');
        console.log('🔍 Cantidad de sorteos:', sorteos.length);
        if (sorteos.length > 0) {
            console.log('🔍 Primer sorteo - titulo:', sorteos[0].titulo);
        }
        console.log('🔍 ========== FIN SORTEOS RECIBIDOS ==========');

        let filteredSorteos = sorteos;
        if (filter === 'activo') {
            filteredSorteos = sorteos.filter(s => s.estado === 'activo');
        } else if (filter === 'finalizado') {
            filteredSorteos = sorteos.filter(s => s.estado === 'finalizado');
        }

        if (filteredSorteos.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>No hay sorteos disponibles</h3>
                    <p>Vuelve pronto para ver nuevos sorteos</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = filteredSorteos.map(sorteo => createSorteoCard(sorteo)).join('');
    } catch (error) {
        console.error('Error al cargar sorteos:', error);
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error al cargar sorteos</h3>
                <p>Por favor, intenta de nuevo más tarde</p>
            </div>
        `;
    }
}

// Crear tarjeta de sorteo
function createSorteoCard(sorteo) {
    console.log('🔍 Creando tarjeta para sorteo:', sorteo.titulo);
    console.log('🔍 imagen_portada:', sorteo.imagen_portada);
    
    const fecha = new Date(sorteo.fecha_sorteo);
    const fechaFormateada = fecha.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const badgeClass = sorteo.estado === 'activo' ? 'badge-activo' : 'badge-finalizado';
    const badgeText = sorteo.estado === 'activo' ? 'Activo' : 'Finalizado';

    // Formatear fecha más corta
    const fechaCorta = fecha.toLocaleDateString('es-ES', { 
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });

    return `
        <div class="sorteo-card" onclick="verDetalleSorteo(${sorteo.id})">
            <div class="sorteo-image-wrapper">
                <div class="sorteo-image">
                    ${sorteo.imagen_portada ? 
                        `<img src="${sorteo.imagen_portada}" alt="${sorteo.titulo}" onerror="console.error('Error al cargar imagen_portada:', this.src); this.src='logo.png'; this.className='sorteo-logo';">` : 
                        `<img src="logo.png" alt="PremioClick" class="sorteo-logo">`
                    }
                </div>
                <div class="sorteo-badge-overlay ${badgeClass}">${badgeText}</div>
            </div>
            <div class="sorteo-content">
                <h3 class="sorteo-title">${sorteo.titulo}</h3>
                <div class="sorteo-meta">
                    <div class="meta-item">
                        <i class="fas fa-calendar-alt"></i>
                        <span>${fechaCorta}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-gift"></i>
                        <span>${sorteo.productos?.length || 0} premios</span>
                    </div>
                </div>
                <div class="sorteo-stats-compact">
                    <div class="stat-item">
                        <i class="fas fa-trophy"></i>
                        <span class="stat-value">${sorteo.productos?.length || 0}</span>
                        <span class="stat-text">premios</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Chat functions
function toggleChat() {
    const modal = document.getElementById('chatModal');
    const isOpening = !modal.classList.contains('active');
    modal.classList.toggle('active');
    
    // Si se abre el chat, resetear mensajes no leídos
    if (isOpening) {
        resetearMensajesNoLeidos();
    }
}

function closeChat() {
    const modal = document.getElementById('chatModal');
    modal.classList.remove('active');
}

async function cargarMensajesHistoricos() {
    try {
        const response = await fetch(`${API_URL}/chat/mensajes`);
        if (response.ok) {
            const mensajes = await response.json();
            const messagesContainer = document.getElementById('chatMessages');
            const welcomeMessage = messagesContainer.querySelector('.welcome-message');
            if (welcomeMessage) {
                welcomeMessage.remove();
            }
            
            // Limpiar mensajes existentes (excepto welcome)
            messagesContainer.innerHTML = '';
            
            // Agregar todos los mensajes históricos
            mensajes.forEach(msg => {
                addMessage(msg.user, msg.message, msg.isAdmin, msg.timestamp, false);
            });
        }
    } catch (error) {
        console.error('Error al cargar mensajes históricos:', error);
    }
}

function addMessage(user, message, isAdmin, timestamp, scroll = true) {
    const messagesContainer = document.getElementById('chatMessages');
    const welcomeMessage = messagesContainer.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isAdmin ? 'admin' : 'user'}`;
    
    const time = timestamp ? new Date(timestamp).toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    }) : new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    messageDiv.innerHTML = `
        <div class="message-header">${isAdmin ? '👑 Admin' : user}</div>
        <div>${message}</div>
        <div class="message-time">${time}</div>
    `;

    messagesContainer.appendChild(messageDiv);
    if (scroll) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!currentUser) {
        openLoginModal();
        return;
    }

    if (!message) return;

    const token = getAuthToken();
    input.value = '';

    try {
        const res = await fetch(`${API_URL}/chat/mensajes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ message }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error('❌ Error al enviar mensaje:', err);
            alert('Error ' + res.status + ': ' + (err.error || err.message || 'Sin detalle'));
        }
    } catch (error) {
        console.error('❌ Error de red al enviar mensaje:', error);
        alert('Error de red: ' + error.message);
    }
}

let mensajesNoLeidos = 0;

function updateChatBadge(count) {
    const badge = document.getElementById('chatBadge');
    // No mostrar badge basado en user-count, solo en mensajes no leídos
    // El badge se actualizará cuando haya mensajes nuevos
}

function incrementarMensajesNoLeidos() {
    mensajesNoLeidos++;
    const badge = document.getElementById('chatBadge');
    if (mensajesNoLeidos > 0) {
        badge.textContent = mensajesNoLeidos;
        badge.style.display = 'flex';
    }
}

function resetearMensajesNoLeidos() {
    mensajesNoLeidos = 0;
    const badge = document.getElementById('chatBadge');
    badge.style.display = 'none';
}

// Ver detalle del sorteo
function verDetalleSorteo(sorteoId) {
    window.location.href = `detalle-sorteo.html?id=${sorteoId}`;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Logo click para ir al inicio (solo scroll, sin recargar)
    const logoLink = document.getElementById('logoLink');
    if (logoLink) {
        logoLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Solo hacer scroll al inicio, sin recargar
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Verificar autenticación al cargar
    checkAuth();

    // Cargar sorteos
    loadSorteos();

    // Filtros
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            loadSorteos(currentFilter);
        });
    });

    // Login
    document.getElementById('loginBtn')?.addEventListener('click', openLoginModal);
    document.getElementById('closeLoginModal')?.addEventListener('click', closeLoginModal);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    
    // Escoger Ganadores
    document.getElementById('ganadoresBtn')?.addEventListener('click', () => {
        window.location.href = 'escoger-ganadores.html';
    });
    
    // Cerrar modal al hacer clic fuera
    document.getElementById('loginModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'loginModal') {
            closeLoginModal();
        }
    });

    // Formulario de login
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('loginSubmitBtn');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Iniciando sesión...</span>';
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        await login(email, password);
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    });

    // Cambiar de login a registro
    document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeLoginModal();
        setTimeout(() => openRegisterModal(), 200);
    });

    // Cambiar de registro a login
    document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeRegisterModal();
        setTimeout(() => openLoginModal(), 200);
    });

    // Cerrar modal de registro
    document.getElementById('closeRegisterModal')?.addEventListener('click', closeRegisterModal);
    
    // Cerrar modal de registro al hacer clic fuera
    document.getElementById('registerModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'registerModal') {
            closeRegisterModal();
        }
    });

    // Formulario de registro
    document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('registerSubmitBtn');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Registrando...</span>';
        
        const nombre = document.getElementById('registerNombre').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const telefono = document.getElementById('registerTelefono').value;
        
        await register(nombre, email, password, telefono);
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    });

    // Chat toggle
    document.getElementById('chatToggle')?.addEventListener('click', toggleChat);
    document.getElementById('closeChat')?.addEventListener('click', closeChat);

    // Send message
    document.getElementById('sendBtn')?.addEventListener('click', sendMessage);
    document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Inicializar socket
    initSocket();
    
    // Botón comprar ticket principal
    document.getElementById('comprarTicketMainBtn')?.addEventListener('click', () => {
        if (!currentUser || !authToken) {
            openLoginModal();
            return;
        }
        abrirModalSeleccionarSorteo();
    });
    
    // Modal seleccionar sorteo
    document.getElementById('closeSeleccionarSorteoModal')?.addEventListener('click', cerrarModalSeleccionarSorteo);
    document.getElementById('seleccionarSorteoModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'seleccionarSorteoModal') {
            cerrarModalSeleccionarSorteo();
        }
    });
});

function abrirModalSeleccionarSorteo() {
    const modal = document.getElementById('seleccionarSorteoModal');
    const lista = document.getElementById('sorteosLista');
    
    modal.classList.add('active');
    
    // Cargar sorteos activos
    lista.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Cargando sorteos...</p></div>';
    
    fetch(`${API_URL}/sorteos`)
        .then(res => res.json())
        .then(data => {
            const sorteos = Array.isArray(data) ? data : [];
            const sorteosActivos = sorteos.filter(s => s.estado === 'activo');
            
            if (sorteosActivos.length === 0) {
                lista.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 2rem;">No hay sorteos activos disponibles</p>';
                return;
            }
            
            lista.innerHTML = sorteosActivos.map(sorteo => `
                <div class="sorteo-option-item" onclick="seleccionarSorteoParaComprar(${sorteo.id})">
                    <h3>${sorteo.titulo}</h3>
                    <p>${sorteo.descripcion || 'Sin descripción'}</p>
                </div>
            `).join('');
        })
        .catch(error => {
            console.error('Error al cargar sorteos:', error);
            lista.innerHTML = '<p style="text-align: center; color: var(--danger); padding: 2rem;">Error al cargar sorteos</p>';
        });
}

function cerrarModalSeleccionarSorteo() {
    document.getElementById('seleccionarSorteoModal').classList.remove('active');
}

function seleccionarSorteoParaComprar(sorteoId) {
    cerrarModalSeleccionarSorteo();
    window.location.href = `comprar-ticket.html?id=${sorteoId}`;
}

window.seleccionarSorteoParaComprar = seleccionarSorteoParaComprar;
