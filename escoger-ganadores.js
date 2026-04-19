// Configuración v2
const isProduction = window.location.hostname.includes('vercel.app') ||
                     window.location.hostname.includes('railway.app') ||
                     window.location.hostname.includes('render.com') ||
                     window.location.hostname.includes('premioclick.cl');
const API_URL = isProduction
    ? 'https://sorteo-premio-click.vercel.app/api'
    : window.location.origin.replace(/:\d+$/, ':3001') + '/api';
let currentUser = null;
let authToken = null;
let sorteos = [];
let sorteoSeleccionado = null;
let cantidadTickets = 1;

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
    const token = getAuthToken();
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
        alert('Debes iniciar sesión como administrador para acceder a esta página');
        window.location.href = 'index.html';
        return;
    }

    // Usar sesión guardada localmente primero
    try {
        currentUser = JSON.parse(userStr);
        authToken = token;

        if (currentUser.rol !== 'admin') {
            alert('Solo los administradores pueden acceder a esta página');
            window.location.href = 'index.html';
            return;
        }

        updateUIForUser(currentUser);
        loadSorteos();

        // Verificar token en background (sin redirigir si falla)
        fetch(`${API_URL}/auth/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(response => {
            if (response.status === 401) {
                setAuthToken(null);
                localStorage.removeItem('user');
                alert('Sesión expirada, por favor inicia sesión de nuevo');
                window.location.href = 'index.html';
            }
        }).catch(() => {
            // Error de red — mantener sesión
        });

    } catch (error) {
        console.error('Error al parsear usuario:', error);
        window.location.href = 'index.html';
    }
}

function updateUIForUser(user) {
    const userInfo = document.getElementById('userInfo');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const loginBtn = document.getElementById('loginBtn');
    
    if (userInfo && userNameDisplay) {
        userNameDisplay.innerHTML = `<i class="fas fa-crown"></i> ${user.nombre} (Admin)`;
        userNameDisplay.classList.add('admin-badge');
        userInfo.style.display = 'flex';
    }
    
    if (loginBtn) {
        loginBtn.style.display = 'none';
    }
}

function logout() {
    setAuthToken(null);
    currentUser = null;
    window.location.href = 'index.html';
}

// Cargar sorteos
async function loadSorteos() {
    try {
        const response = await fetch(`${API_URL}/sorteos`);
        sorteos = await response.json();
        
        if (sorteos.length === 0) {
            document.getElementById('sorteosContainer').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;"></i>
                    <p>No hay sorteos disponibles</p>
                </div>
            `;
        } else {
            mostrarListaSorteos();
        }
    } catch (error) {
        console.error('Error al cargar sorteos:', error);
        alert('Error al cargar sorteos');
    }
}

function mostrarListaSorteos() {
    const container = document.getElementById('sorteosContainer');
    container.innerHTML = sorteos.map(sorteo => `
        <div class="sorteo-list-item" onclick="seleccionarSorteo(${sorteo.id})">
            <div class="sorteo-list-header">
                <div class="sorteo-list-title">${sorteo.titulo}</div>
                <span class="estado-badge ${sorteo.estado === 'activo' ? 'estado-activo' : 'estado-finalizado'}">
                    ${sorteo.estado}
                </span>
            </div>
            ${sorteo.descripcion ? `<p style="color: var(--text-light); margin-top: 0.5rem;">${sorteo.descripcion}</p>` : ''}
            <div style="margin-top: 0.5rem; color: var(--text-light); font-size: 0.9rem;">
                <i class="fas fa-calendar"></i> ${new Date(sorteo.fecha_sorteo).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}
            </div>
        </div>
    `).join('');
    
    document.getElementById('sorteosList').style.display = 'block';
}

async function seleccionarSorteo(sorteoId) {
    sorteoSeleccionado = sorteos.find(s => s.id === sorteoId);
    
    if (!sorteoSeleccionado) return;
    
    // Cargar productos del sorteo
    try {
        const response = await fetch(`${API_URL}/sorteos/${sorteoId}`);
        const sorteoCompleto = await response.json();
        sorteoSeleccionado.productos = sorteoCompleto.productos || [];
        
        document.getElementById('sorteoTitulo').textContent = sorteoSeleccionado.titulo;
        document.getElementById('sorteoDescripcion').textContent = sorteoSeleccionado.descripcion || '';
        
        // Actualizar badge de estado
        const estadoBadge = document.getElementById('sorteoEstadoBadge');
        if (estadoBadge) {
            estadoBadge.textContent = sorteoSeleccionado.estado;
            estadoBadge.className = `estado-badge ${sorteoSeleccionado.estado === 'activo' ? 'estado-activo' : 'estado-finalizado'}`;
        }
        
        // Llenar select de productos
        const productoSelect = document.getElementById('productoSelect');
        productoSelect.innerHTML = '<option value="">Selecciona un premio</option>';
        sorteoSeleccionado.productos.forEach(producto => {
            const option = document.createElement('option');
            option.value = producto.id;
            option.textContent = `${producto.posicion_premio}° - ${producto.nombre}`;
            productoSelect.appendChild(option);
        });
        
        // Mostrar configuración
        document.getElementById('sorteosList').style.display = 'none';
        document.getElementById('sorteoConfig').style.display = 'block';
        
        // Resetear valores
        cantidadTickets = 1;
        document.getElementById('cantidadDisplay').textContent = '1';
        document.getElementById('productoSelect').value = '';
        document.getElementById('girarBtn').disabled = true;
        document.getElementById('resultadosCard').style.display = 'none';
        
        // Actualizar UI según el estado del sorteo
        actualizarUIEstadoSorteo();
    } catch (error) {
        console.error('Error al cargar sorteo:', error);
        alert('Error al cargar el sorteo');
    }
}

function cambiarCantidad(delta) {
    cantidadTickets = Math.max(1, cantidadTickets + delta);
    document.getElementById('cantidadDisplay').textContent = cantidadTickets;
    verificarBotonGirar();
}

function verificarBotonGirar() {
    const productoSelect = document.getElementById('productoSelect');
    const girarBtn = document.getElementById('girarBtn');
    const sorteoFinalizado = sorteoSeleccionado && sorteoSeleccionado.estado === 'finalizado';
    girarBtn.disabled = !productoSelect.value || cantidadTickets < 1 || sorteoFinalizado;
}

function actualizarUIEstadoSorteo() {
    const sorteoFinalizado = sorteoSeleccionado && sorteoSeleccionado.estado === 'finalizado';
    const girarBtn = document.getElementById('girarBtn');
    const finalizarBtn = document.getElementById('finalizarBtn');
    const finalizarText = document.getElementById('finalizarText');
    const finalizarIcon = document.getElementById('finalizarIcon');
    
    if (sorteoFinalizado) {
        // Deshabilitar botón de girar
        girarBtn.disabled = true;
        girarBtn.style.opacity = '0.5';
        girarBtn.style.cursor = 'not-allowed';
        
        // Cambiar botón de finalizar
        finalizarBtn.disabled = true;
        finalizarBtn.style.opacity = '0.5';
        finalizarBtn.style.cursor = 'not-allowed';
        finalizarText.textContent = 'Sorteo Finalizado';
        finalizarIcon.className = 'fas fa-check-circle';
        
        // Mostrar mensaje
        const configSection = document.querySelector('.config-section');
        if (configSection && !configSection.querySelector('.finalizado-mensaje')) {
            const mensaje = document.createElement('div');
            mensaje.className = 'finalizado-mensaje';
            mensaje.style.cssText = 'background: #ffebee; border-left: 4px solid #f44336; padding: 12px; border-radius: 8px; margin-top: 1rem; color: #c62828;';
            mensaje.innerHTML = '<i class="fas fa-info-circle"></i> <strong>Este sorteo ya está finalizado.</strong> No se pueden escoger más ganadores.';
            configSection.appendChild(mensaje);
        }
    } else {
        // Habilitar botones
        girarBtn.style.opacity = '1';
        girarBtn.style.cursor = 'pointer';
        finalizarBtn.disabled = false;
        finalizarBtn.style.opacity = '1';
        finalizarBtn.style.cursor = 'pointer';
        finalizarText.textContent = 'Marcar Sorteo como Finalizado';
        finalizarIcon.className = 'fas fa-check-circle';
        
        // Remover mensaje si existe
        const mensaje = document.querySelector('.finalizado-mensaje');
        if (mensaje) {
            mensaje.remove();
        }
    }
    
    verificarBotonGirar();
}

async function finalizarSorteo() {
    if (!sorteoSeleccionado) {
        alert('No hay sorteo seleccionado');
        return;
    }
    
    if (sorteoSeleccionado.estado === 'finalizado') {
        alert('Este sorteo ya está finalizado');
        return;
    }
    
    if (!confirm('¿Estás seguro de que deseas marcar este sorteo como finalizado?\n\nUna vez finalizado, no se podrán escoger más ganadores.')) {
        return;
    }
    
    const finalizarBtn = document.getElementById('finalizarBtn');
    const finalizarText = document.getElementById('finalizarText');
    const finalizarIcon = document.getElementById('finalizarIcon');
    
    // Deshabilitar botón y mostrar loading
    finalizarBtn.disabled = true;
    finalizarText.textContent = 'Finalizando...';
    finalizarIcon.className = 'fas fa-spinner fa-spin';
    
    try {
        const response = await fetch(`${API_URL}/sorteos/${sorteoSeleccionado.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                titulo: sorteoSeleccionado.titulo,
                descripcion: sorteoSeleccionado.descripcion,
                fecha_sorteo: sorteoSeleccionado.fecha_sorteo,
                estado: 'finalizado',
                imagenes: sorteoSeleccionado.imagenes,
                link: sorteoSeleccionado.link
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Actualizar estado del sorteo
            sorteoSeleccionado.estado = 'finalizado';
            
            // Actualizar en la lista de sorteos
            const sorteoIndex = sorteos.findIndex(s => s.id === sorteoSeleccionado.id);
            if (sorteoIndex !== -1) {
                sorteos[sorteoIndex].estado = 'finalizado';
            }
            
            // Actualizar UI
            actualizarUIEstadoSorteo();
            
            alert('Sorteo marcado como finalizado correctamente');
        } else {
            alert(data.error || 'Error al finalizar el sorteo');
            finalizarBtn.disabled = false;
            finalizarText.textContent = 'Marcar Sorteo como Finalizado';
            finalizarIcon.className = 'fas fa-check-circle';
        }
    } catch (error) {
        console.error('Error al finalizar sorteo:', error);
        alert('Error al finalizar el sorteo');
        finalizarBtn.disabled = false;
        finalizarText.textContent = 'Marcar Sorteo como Finalizado';
        finalizarIcon.className = 'fas fa-check-circle';
    }
}

async function girar() {
    const productoSelect = document.getElementById('productoSelect');
    const productoId = productoSelect.value;
    
    if (!productoId || !sorteoSeleccionado) {
        alert('Por favor selecciona un premio');
        return;
    }
    
    // Verificar que el sorteo no esté finalizado
    if (sorteoSeleccionado.estado === 'finalizado') {
        alert('Este sorteo ya está finalizado. No se pueden escoger más ganadores.');
        return;
    }
    
    const girarBtn = document.getElementById('girarBtn');
    const trophyIcon = document.getElementById('trophyIcon');
    const girarText = document.getElementById('girarText');
    
    // Deshabilitar botón y mostrar animación
    girarBtn.disabled = true;
    trophyIcon.classList.add('spinner');
    girarText.textContent = 'Girando...';
    document.getElementById('resultadosCard').style.display = 'none';
    
    try {
        // Esperar 5 segundos antes de hacer la petición
        setTimeout(async () => {
            try {
                const response = await fetch(`${API_URL}/tombola/seleccionar-ganadores`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        sorteo_id: sorteoSeleccionado.id,
                        producto_id: parseInt(productoId),
                        cantidad: cantidadTickets
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    mostrarResultados(data.ganadores);
                } else {
                    alert(data.error || 'Error al seleccionar ganadores');
                }
            } catch (error) {
                console.error('Error al seleccionar ganadores:', error);
                alert('Error al seleccionar ganadores');
            } finally {
                // Restaurar botón
                trophyIcon.classList.remove('spinner');
                girarText.textContent = 'Girar';
                verificarBotonGirar();
            }
        }, 5000);
    } catch (error) {
        trophyIcon.classList.remove('spinner');
        girarText.textContent = 'Girar';
        verificarBotonGirar();
    }
}

function mostrarResultados(ganadores) {
    const container = document.getElementById('resultadosContainer');
    
    if (ganadores.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light);">No se encontraron ganadores</p>';
    } else {
        container.innerHTML = ganadores.map((ganador, index) => `
            <div class="ticket-ganador">
                <div class="ticket-header">
                    <span class="badge-premio">${index + 1}° Lugar</span>
                </div>
                <div class="ticket-numero">Ticket: ${ganador.numero_ticket}</div>
                ${ganador.usuario_nombre ? `<div class="ticket-usuario">Ganador: ${ganador.usuario_nombre}</div>` : ''}
                ${ganador.usuario_email ? `<div class="ticket-email">${ganador.usuario_email}</div>` : ''}
            </div>
        `).join('');
    }
    
    document.getElementById('resultadosCard').style.display = 'block';
    document.getElementById('resultadosCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    document.getElementById('productoSelect').addEventListener('change', verificarBotonGirar);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
});


