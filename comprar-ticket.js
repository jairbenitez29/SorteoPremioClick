// Configuración - API en Vercel
const PRODUCTION_API_URL = 'https://sorteo-5lh6.vercel.app/api';
const isProduction = window.location.hostname.includes('vercel.app') ||
                     window.location.hostname.includes('railway.app') ||
                     window.location.hostname.includes('render.com') ||
                     window.location.hostname.includes('premioclick.cl');
const API_URL = isProduction
    ? PRODUCTION_API_URL
    : (window.location.origin.replace(/:\d+$/, '') + ':3001/api');

let sorteo = null;
let currentUser = null;
let authToken = null;
let cantidadSeleccionada = 0;
let precioUnitario = 0;
let processing = false;
let promocionSeleccionada = null;

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
            updateUIForUser(currentUser);
        } else {
            setAuthToken(null);
            currentUser = null;
            updateUIForGuest();
        }
    } catch (error) {
        console.error('Error al verificar autenticación:', error);
        setAuthToken(null);
        currentUser = null;
        updateUIForGuest();
    }
}

function updateUIForUser(user) {
    const userInfo = document.getElementById('userInfo');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const loginBtn = document.getElementById('loginBtn');

    if (userInfo && userNameDisplay) {
        userNameDisplay.textContent = user.nombre;
        userInfo.style.display = 'flex';
    }

    if (loginBtn) {
        loginBtn.style.display = 'none';
    }
}

function updateUIForGuest() {
    const userInfo = document.getElementById('userInfo');
    const loginBtn = document.getElementById('loginBtn');

    if (userInfo) {
        userInfo.style.display = 'none';
    }

    if (loginBtn) {
        loginBtn.style.display = 'flex';
    }
}

// Obtener ID del sorteo de la URL
function getSorteoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Cargar sorteo
async function loadSorteo() {
    const sorteoId = getSorteoId();
    const loadingContainer = document.getElementById('loadingContainer');
    if (!loadingContainer) return;

    if (!sorteoId) {
        loadingContainer.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p>ID de sorteo no válido</p>
        `;
        return;
    }

    try {
        const response = await fetch(`${API_URL}/sorteos/${sorteoId}`);

        if (!response.ok) {
            throw new Error('Sorteo no encontrado');
        }

        sorteo = await response.json();

        // Obtener precio del ticket (ahora viene en sorteo.precio_ticket)
        precioUnitario = parseFloat(sorteo.precio_ticket) || 0;

        console.log('Precio unitario obtenido:', precioUnitario);
        console.log('Sorteo completo:', sorteo);

        if (precioUnitario === 0) {
            console.warn('⚠️ Precio es 0. Verificando si hay tickets en el sorteo...');
            try {
                const ticketsResponse = await fetch(`${API_URL}/tickets/sorteo/${sorteoId}`);
                if (ticketsResponse.ok) {
                    const tickets = await ticketsResponse.json();
                    console.log('Tickets encontrados:', tickets.length);
                    if (tickets.length > 0 && tickets[0].precio) {
                        precioUnitario = parseFloat(tickets[0].precio) || 0;
                        console.log('Precio obtenido de tickets directos:', precioUnitario);
                    }
                }
            } catch (e) {
                console.error('Error al obtener tickets:', e);
            }

            if (precioUnitario === 0) {
                mostrarError('No se pudo obtener el precio del ticket. Este sorteo puede no tener tickets disponibles. Por favor, contacta al administrador.');
            }
        }

        mostrarCompra();
    } catch (error) {
        console.error('Error al cargar sorteo:', error);
        loadingContainer.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error al cargar el sorteo</p>
        `;
    }
}

function mostrarCompra() {
    const loadingContainer = document.getElementById('loadingContainer');
    const compraContainer = document.getElementById('compraContainer');
    if (!loadingContainer || !compraContainer) return;

    loadingContainer.style.display = 'none';
    compraContainer.style.display = 'block';

    document.getElementById('sorteoTitulo').textContent = sorteo.titulo;
    document.getElementById('sorteoDescripcion').textContent = sorteo.descripcion || '';

    const cantidadOptions = document.getElementById('cantidadOptions');
    const opciones = [1, 2, 3, 5];

    let htmlOpciones = opciones.map(cant => `
        <div class="cantidad-option" data-cantidad="${cant}" data-tipo="normal" onclick="seleccionarCantidad(${cant})">
            <div class="cantidad-option-title">${cant} Ticket${cant > 1 ? 's' : ''}</div>
            <div class="cantidad-option-price">$${(precioUnitario * cant).toFixed(0)}</div>
        </div>
    `).join('');

    const promociones = (sorteo.promociones || []).filter(p =>
        p &&
        (p.precio != null || p.precio_total != null) &&
        p.cantidad_tickets != null &&
        p.activa !== false
    );

    console.log('🔍 Promociones encontradas:', promociones);

    if (promociones.length > 0) {
        promociones.forEach((promo, index) => {
            const cantidadPromo = promo.cantidad_tickets || 1;
            const precioPromo = parseFloat(promo.precio || promo.precio_total) || 0;
            const precioUnitarioPromo = precioUnitario * cantidadPromo;
            const tieneDescuento = precioPromo < precioUnitarioPromo;
            const porcentajeDescuento = tieneDescuento
                ? Math.round(((precioUnitarioPromo - precioPromo) / precioUnitarioPromo) * 100)
                : 0;

            htmlOpciones += `
                <div class="cantidad-option cantidad-option-promo" data-promo-id="${promo.id}" data-cantidad="${cantidadPromo}" data-tipo="promo" onclick="seleccionarPromocion(${promo.id})">
                    ${tieneDescuento ? `<div class="promo-badge"><i class="fas fa-tag"></i> ${porcentajeDescuento}% OFF</div>` : ''}
                    <div class="cantidad-option-title">${cantidadPromo} Tickets ${promo.nombre ? '- ' + promo.nombre : ''}</div>
                    ${tieneDescuento ? `<div class="precio-anterior">$${precioUnitarioPromo.toFixed(0)}</div>` : ''}
                    <div class="cantidad-option-price">$${precioPromo.toFixed(0)}</div>
                </div>
            `;
        });
    }

    cantidadOptions.innerHTML = htmlOpciones;

    actualizarTotal();
}

function seleccionarCantidad(cantidad) {
    cantidadSeleccionada = cantidad;
    promocionSeleccionada = null;

    document.querySelectorAll('.cantidad-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.tipo === 'normal' && parseInt(opt.dataset.cantidad) === cantidad) {
            opt.classList.add('selected');
        }
    });

    actualizarTotal();
    const comprarBtn = document.getElementById('comprarBtn');
    if (comprarBtn) comprarBtn.disabled = false;
}

function seleccionarPromocion(promoId) {
    const promocion = (sorteo.promociones || []).find(p => p.id === promoId);

    if (!promocion) {
        console.error('Promoción no encontrada:', promoId);
        return;
    }

    promocionSeleccionada = promocion;
    cantidadSeleccionada = promocion.cantidad_tickets || 1;

    document.querySelectorAll('.cantidad-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.tipo === 'promo' && parseInt(opt.dataset.promoId) === promoId) {
            opt.classList.add('selected');
        }
    });

    actualizarTotal();
    const comprarBtn = document.getElementById('comprarBtn');
    if (comprarBtn) comprarBtn.disabled = false;
}

function actualizarTotal() {
    let total = 0;

    if (promocionSeleccionada) {
        total = parseFloat(promocionSeleccionada.precio || promocionSeleccionada.precio_total) || 0;
    } else {
        total = precioUnitario * cantidadSeleccionada;
    }

    const totalEl = document.getElementById('totalAmount');
    if (totalEl) totalEl.textContent = `$${total.toFixed(0)} CLP`;
}

// Login
function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.add('active');
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.remove('active');
    const form = document.getElementById('loginForm');
    if (form) form.reset();
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) errorDiv.style.display = 'none';
}

function showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
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
            updateUIForUser(currentUser);
            closeLoginModal();
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
    updateUIForGuest();
}

// Comprar ticket
async function comprarTicket() {
    if (processing) return;

    if (!currentUser || !authToken) {
        openLoginModal();
        return;
    }

    if (cantidadSeleccionada === 0) {
        mostrarError('Por favor, selecciona la cantidad de tickets');
        return;
    }

    if (!sorteo || sorteo.estado !== 'activo') {
        mostrarError('Este sorteo no está disponible para compra');
        return;
    }

    processing = true;
    const btn = document.getElementById('comprarBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Procesando...</span>';
    }

    try {
        const cantidadTickets = promocionSeleccionada
            ? promocionSeleccionada.cantidad_tickets
            : cantidadSeleccionada;

        const reservaResponse = await fetch(`${API_URL}/tickets/reservar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                sorteoId: sorteo.id,
                cantidad: cantidadTickets
            })
        });

        if (!reservaResponse.ok) {
            const errorData = await reservaResponse.json();
            throw new Error(errorData.error || 'Error al reservar tickets');
        }

        const reservaData = await reservaResponse.json();
        const tickets = reservaData.tickets;

        const total = promocionSeleccionada
            ? parseFloat(promocionSeleccionada.precio || promocionSeleccionada.precio_total) || reservaData.total
            : reservaData.total;

        const ticketIds = tickets.map(t => t.id);

        console.log('📝 Creando pago PayPal...', {
            ticketIds,
            monto: total,
            cantidadTickets: ticketIds.length
        });

        const pagoResponse = await fetch(`${API_URL}/pagos/paypal/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                ticketIds,
                monto: total
            })
        });

        console.log('📝 Respuesta de PayPal:', {
            status: pagoResponse.status,
            statusText: pagoResponse.statusText,
            ok: pagoResponse.ok
        });

        if (!pagoResponse.ok) {
            let errorMessage = 'Error al crear pago PayPal';
            let errorDetails = '';
            let errorHint = '';

            try {
                const errorData = await pagoResponse.json();
                console.error('❌ Error de PayPal:', errorData);

                errorMessage = errorData.error || errorMessage;
                errorDetails = errorData.details || '';
                errorHint = errorData.hint || '';

                if (pagoResponse.status === 401) {
                    errorMessage = '❌ Error de autenticación con PayPal';
                    errorDetails = 'Las credenciales de PayPal (Client ID o Client Secret) son incorrectas o no corresponden al modo configurado (live/sandbox).';
                    errorHint = 'El administrador debe verificar en Vercel → Environment Variables que PAYPAL_MODE, PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET sean correctos.';
                } else if (pagoResponse.status === 400) {
                    errorMessage = errorData.error || 'Error en la solicitud de pago';
                    errorDetails = errorData.details || 'Verifica que los tickets estén disponibles.';
                } else if (pagoResponse.status === 500) {
                    errorMessage = errorData.error || 'Error del servidor al procesar el pago';
                    errorDetails = errorData.details || 'Hubo un problema al comunicarse con PayPal.';
                    errorHint = errorData.hint || 'Por favor, intenta de nuevo en unos momentos.';
                }
            } catch (e) {
                console.error('Error al parsear respuesta de error:', e);
                errorMessage = `Error ${pagoResponse.status}: ${pagoResponse.statusText}`;
            }

            let mensajeCompleto = errorMessage;
            if (errorDetails) mensajeCompleto += `\n\n${errorDetails}`;
            if (errorHint) mensajeCompleto += `\n\n💡 ${errorHint}`;

            throw new Error(mensajeCompleto);
        }

        const pagoData = await pagoResponse.json();
        console.log('✅ Pago PayPal creado:', {
            paymentId: pagoData.paymentId,
            approvalUrl: pagoData.approvalUrl ? '✅ Disponible' : '❌ No disponible',
            pagoId: pagoData.pagoId
        });

        const approvalUrl = pagoData.approvalUrl;

        if (approvalUrl) {
            console.log('🔗 Redirigiendo a PayPal...');
            window.location.href = approvalUrl;
        } else {
            console.error('❌ No se recibió approvalUrl en la respuesta');
            throw new Error('No se recibió la URL de aprobación de PayPal. Por favor, intenta de nuevo.');
        }
    } catch (error) {
        console.error('❌ Error completo al comprar ticket:', error);

        let errorMsg = error.message || 'Error al procesar la compra. Por favor, intenta de nuevo.';
        if (errorMsg.includes('credenciales') || errorMsg.includes('PAYPAL_CLIENT') || errorMsg.includes('configuración') || errorMsg.includes('autenticación')) {
            errorMsg += '\n\nPor favor, contacta al administrador para verificar la configuración de PayPal en Vercel.';
        }

        mostrarError(errorMsg);

        processing = false;
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-shopping-cart"></i> <span>Comprar Ahora</span>';
        }
    }
}

function mostrarError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (!errorDiv) {
        alert(message);
        return;
    }
    errorDiv.innerHTML = message.replace(/\n/g, '<br>');
    errorDiv.style.display = 'block';
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 10000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    loadSorteo();

    document.getElementById('loginBtn')?.addEventListener('click', openLoginModal);
    document.getElementById('closeLoginModal')?.addEventListener('click', closeLoginModal);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);

    document.getElementById('loginModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'loginModal') closeLoginModal();
    });

    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('loginSubmitBtn');
        const originalText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Iniciando sesión...</span>';
        }
        const email = document.getElementById('email')?.value || '';
        const password = document.getElementById('password')?.value || '';
        await login(email, password);
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    document.getElementById('comprarBtn')?.addEventListener('click', comprarTicket);
});

window.seleccionarCantidad = seleccionarCantidad;
window.seleccionarPromocion = seleccionarPromocion;
window.openLoginModal = openLoginModal;
