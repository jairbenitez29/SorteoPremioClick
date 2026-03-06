// API en Vercel; la web en premioclick.cl debe apuntar aquí
const PRODUCTION_API_URL = 'https://sorteo-5lh6.vercel.app/api';
// Configuración
const isProduction = window.location.hostname.includes('vercel.app') ||
                     window.location.hostname.includes('railway.app') ||
                     window.location.hostname.includes('render.com') ||
                     window.location.hostname.includes('premioclick.cl');
const API_URL = isProduction
    ? PRODUCTION_API_URL
    : window.location.origin.replace(/:\d+$/, ':3001') + '/api';
let sorteo = null;
let imagenes = [];
let imagenActual = 0;
let currentUser = null;
let authToken = null;
let todasLasImagenesProductos = [];
let imagenesProductoActual = [];

function esc(s) {
    if (s == null || s === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(s);
    return div.innerHTML;
}

// Autenticación
function getAuthToken() {
    return localStorage.getItem('token');
}

async function checkAuth() {
    const token = getAuthToken();
    if (!token) return;
    try {
        const response = await fetch(`${API_URL}/auth/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            authToken = token;
        }
    } catch (error) {
        console.error('Error al verificar autenticación:', error);
    }
}

function getSorteoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Cargar ganadores desde tombola si el sorteo está finalizado y no vienen en el GET
async function cargarGanadoresSiFalta(sorteoId) {
    if (!sorteo || sorteo.estado !== 'finalizado' || !sorteoId) return;
    if (sorteo.ganadores && sorteo.ganadores.length > 0) return;
    try {
        const response = await fetch(`${API_URL}/tombola/ganadores/${sorteoId}`);
        if (!response.ok) return;
        const data = await response.json();
        const list = Array.isArray(data) ? data : (data.ganadores || []);
        sorteo.ganadores = list;
    } catch (e) {
        console.error('Error al cargar ganadores:', e);
        if (!sorteo.ganadores) sorteo.ganadores = [];
    }
}

// Cargar sorteo
async function loadSorteo() {
    const sorteoId = getSorteoId();

    if (!sorteoId) {
        document.getElementById('loadingContainer').innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p>ID de sorteo no válido</p>
        `;
        return;
    }

    try {
        const response = await fetch(`${API_URL}/sorteos/${sorteoId}`);
        if (!response.ok) throw new Error('Sorteo no encontrado');
        sorteo = await response.json();

        console.log('🔍 ========== SORTEO RECIBIDO DEL BACKEND ==========');
        console.log('🔍 Sorteo completo:', JSON.stringify(sorteo, null, 2));
        console.log('🔍 Sorteo - imagen_portada:', sorteo.imagen_portada);
        console.log('🔍 Sorteo - tipo de imagen_portada:', typeof sorteo.imagen_portada);
        console.log('🔍 Sorteo - tiene imagen_portada?', !!sorteo.imagen_portada);
        if (sorteo.imagen_portada) {
            console.log('🔍 Sorteo - longitud imagen_portada:', sorteo.imagen_portada.length);
            console.log('🔍 Sorteo - preview imagen_portada:', sorteo.imagen_portada.substring(0, 100));
        }
        console.log('🔍 Sorteo - productos:', sorteo.productos);
        console.log('🔍 Sorteo - cantidad de productos:', sorteo.productos?.length || 0);
        if (sorteo.productos && sorteo.productos.length > 0) {
            sorteo.productos.forEach((producto, index) => {
                console.log(`🔍 Producto ${index + 1} (${producto.nombre}):`);
                console.log(`  - imagenes:`, producto.imagenes);
                console.log(`  - tipo de imagenes:`, typeof producto.imagenes);
                console.log(`  - es array?:`, Array.isArray(producto.imagenes));
                if (Array.isArray(producto.imagenes)) {
                    console.log(`  - cantidad de imagenes:`, producto.imagenes.length);
                    producto.imagenes.forEach((img, imgIndex) => {
                        console.log(`    - imagen ${imgIndex + 1}:`, img);
                    });
                }
            });
        }
        console.log('🔍 ========== FIN SORTEO RECIBIDO ==========');

        if (sorteo.imagenes) {
            try {
                if (typeof sorteo.imagenes === 'string') {
                    imagenes = JSON.parse(sorteo.imagenes);
                } else if (Array.isArray(sorteo.imagenes)) {
                    imagenes = sorteo.imagenes;
                } else {
                    imagenes = [];
                }
            } catch (e) {
                console.error('Error al parsear imágenes:', e);
                imagenes = [];
            }
        } else {
            imagenes = [];
        }

        // Si está finalizado y no vienen ganadores, intentar cargarlos desde tombola
        await cargarGanadoresSiFalta(sorteoId);
        mostrarSorteo();
    } catch (error) {
        console.error('Error al cargar sorteo:', error);
        document.getElementById('loadingContainer').innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error al cargar el sorteo</p>
        `;
    }
}

function mostrarSorteo() {
    document.getElementById('loadingContainer').style.display = 'none';
    document.getElementById('sorteoContainer').style.display = 'block';

    const portadaContainer = document.getElementById('sorteoPortada');
    console.log('🔍 ========== MOSTRANDO PORTADA ==========');
    console.log('🔍 portadaContainer encontrado?:', !!portadaContainer);
    console.log('🔍 sorteo.imagen_portada:', sorteo.imagen_portada);
    console.log('🔍 tiene imagen_portada?:', !!sorteo.imagen_portada);

    if (sorteo.imagen_portada) {
        console.log('🔍 Creando imagen de portada...');
        portadaContainer.innerHTML = `<img src="${esc(sorteo.imagen_portada)}" alt="Portada ${esc(sorteo.titulo)}" class="sorteo-portada-image" onerror="console.error('❌ Error al cargar imagen_portada:', this.src); this.style.display='none';">`;
        portadaContainer.style.display = 'block';
        console.log('✅ Imagen de portada creada y mostrada');
    } else {
        console.log('⚠️ No hay imagen_portada, ocultando contenedor');
        portadaContainer.style.display = 'none';
    }
    console.log('🔍 ========== FIN MOSTRANDO PORTADA ==========');

    document.getElementById('sorteoTitulo').textContent = sorteo.titulo;
    const badge = document.getElementById('sorteoBadge');
    badge.textContent = sorteo.estado;
    badge.className = `sorteo-badge-detalle ${sorteo.estado === 'activo' ? 'badge-activo' : 'badge-finalizado'}`;
    document.getElementById('sorteoDescripcion').textContent = sorteo.descripcion || 'Sin descripción';

    const fecha = new Date(sorteo.fecha_sorteo);
    document.getElementById('sorteoFecha').textContent = fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const productosCount = sorteo.productos?.length || 0;
    document.getElementById('sorteoPremios').textContent = `${productosCount} premio${productosCount !== 1 ? 's' : ''}`;

    const ticketsInfo = document.getElementById('sorteoTickets');
    if (currentUser && currentUser.rol === 'admin') {
        const ticketsVendidos = sorteo.estadisticas?.tickets_vendidos || 0;
        ticketsInfo.textContent = `${ticketsVendidos} vendidos`;
        ticketsInfo.parentElement.style.display = 'flex';
    } else {
        ticketsInfo.parentElement.style.display = 'none';
    }

    if (imagenes.length > 0) mostrarGaleria();
    if (sorteo.productos && sorteo.productos.length > 0) mostrarProductos();

    if (sorteo.estado === 'activo') {
        document.getElementById('comprarSection').style.display = 'block';
    }

    // Siempre mostrar sección de ganadores cuando el sorteo está finalizado (con lista o mensaje "Aún no hay ganadores")
    if (sorteo.estado === 'finalizado') {
        mostrarGanadores();
    }
}

function mostrarGaleria() {
    const galeriaContainer = document.getElementById('galeriaContainer');
    const galeriaGrid = document.getElementById('galeriaGrid');
    galeriaGrid.innerHTML = imagenes.map((imagen, index) => `
        <div class="galeria-item" onclick="abrirImagen(${index})">
            <img src="${esc(imagen)}" alt="Imagen ${index + 1}">
            <div class="galeria-item-overlay">
                <i class="fas fa-search-plus"></i>
            </div>
        </div>
    `).join('');
    galeriaContainer.style.display = 'block';
}

function mostrarProductos() {
    const productosSection = document.getElementById('productosSection');
    const productosGrid = document.getElementById('productosGrid');
    console.log('🔍 Mostrando productos. Cantidad:', sorteo.productos.length);

    todasLasImagenesProductos = [];
    sorteo.productos.forEach((producto, prodIndex) => {
        let imagenesArray = [];
        if (producto.imagenes) {
            if (Array.isArray(producto.imagenes)) {
                imagenesArray = producto.imagenes;
            } else if (typeof producto.imagenes === 'string') {
                try {
                    imagenesArray = JSON.parse(producto.imagenes);
                    if (!Array.isArray(imagenesArray)) imagenesArray = [];
                } catch (e) {
                    imagenesArray = [];
                }
            }
        }
        todasLasImagenesProductos.push({
            productoIndex: prodIndex,
            productoNombre: producto.nombre,
            imagenes: imagenesArray
        });
    });

    productosGrid.innerHTML = sorteo.productos.map((producto, index) => {
        let imagenesArray = [];
        if (producto.imagenes) {
            if (Array.isArray(producto.imagenes)) {
                imagenesArray = producto.imagenes;
            } else if (typeof producto.imagenes === 'string') {
                try {
                    imagenesArray = JSON.parse(producto.imagenes);
                    if (!Array.isArray(imagenesArray)) imagenesArray = [];
                } catch (e) {
                    imagenesArray = [];
                }
            }
        }
        const imagenesHTML = imagenesArray.length > 0
            ? `<div class="producto-imagenes">
                ${imagenesArray.map((img, imgIndex) => `
                    <img src="${esc(img)}" alt="${esc(producto.nombre)} - Imagen ${imgIndex + 1}"
                         onclick="abrirImagenProducto(${index}, ${imgIndex})"
                         onerror="this.style.display='none';"
                         style="cursor: pointer;">
                `).join('')}
               </div>`
            : '';
        return `
        <div class="producto-card">
            <span class="producto-posicion">${esc(producto.posicion_premio)}° Lugar</span>
            ${imagenesHTML}
            <h3 class="producto-nombre">${esc(producto.nombre)}</h3>
            ${producto.descripcion ? `<p class="producto-descripcion">${esc(producto.descripcion)}</p>` : ''}
        </div>
    `;
    }).join('');
    productosSection.style.display = 'block';
}

function mostrarGanadores() {
    const ganadoresSection = document.getElementById('ganadoresSection');
    const ganadoresContainer = document.getElementById('ganadoresContainer');
    if (!ganadoresSection || !ganadoresContainer) return;

    const lista = sorteo.ganadores && sorteo.ganadores.length > 0 ? sorteo.ganadores : [];

    if (lista.length === 0) {
        ganadoresContainer.innerHTML = '<p style="color:#616161; margin:0;">Aún no hay ganadores publicados para este sorteo.</p>';
        ganadoresSection.style.display = 'block';
        return;
    }

    const ganadoresPorPremio = {};
    lista.forEach(ganador => {
        const key = `${ganador.producto_id}_${ganador.posicion_premio}`;
        if (!ganadoresPorPremio[key]) {
            ganadoresPorPremio[key] = {
                producto_nombre: ganador.producto_nombre,
                posicion_premio: ganador.posicion_premio,
                numeros: []
            };
        }
        ganadoresPorPremio[key].numeros.push({
            numero: ganador.numero_ticket,
            nombre: ganador.ganador_nombre || 'Sin asignar',
            email: ganador.ganador_email || null
        });
    });

    if (currentUser) {
        const userTicketsGanadores = lista.filter(g => g.ganador_email === currentUser.email);
        if (userTicketsGanadores.length > 0) {
            mostrarMensajeGanador(userTicketsGanadores);
        }
    }

    ganadoresContainer.innerHTML = Object.values(ganadoresPorPremio).map(premio => {
        return premio.numeros.map(num => `
            <div class="ganador-card">
                <div class="ganador-header">
                    <span class="ganador-posicion">${esc(premio.posicion_premio)}° Lugar</span>
                </div>
                <div class="ganador-numero">#${esc(num.numero)}</div>
                <div class="ganador-premio">${esc(premio.producto_nombre)}</div>
                ${num.nombre !== 'Sin asignar' ? `<div class="ganador-nombre">Ganador: ${esc(num.nombre)}</div>` : ''}
            </div>
        `).join('');
    }).join('');

    ganadoresSection.style.display = 'block';
}

function mostrarMensajeGanador(ganadores) {
    const ganadoresContainer = document.getElementById('ganadoresContainer');
    if (!ganadoresContainer || ganadores.length === 0) return;
    const mensajeDiv = document.createElement('div');
    mensajeDiv.className = 'ganador-mensaje';
    mensajeDiv.style.gridColumn = '1 / -1';
    mensajeDiv.style.background = 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)';
    mensajeDiv.style.color = 'var(--white)';
    mensajeDiv.style.border = '3px solid #ffc107';
    mensajeDiv.style.display = 'flex';
    mensajeDiv.style.alignItems = 'center';
    mensajeDiv.style.justifyContent = 'center';
    mensajeDiv.style.gap = '1rem';
    mensajeDiv.innerHTML = `
        <i class="fas fa-trophy" style="font-size: 2.5rem;"></i>
        <div style="text-align: center;">
            <strong style="font-size: 1.3rem; display: block; margin-bottom: 8px;">¡Felicitaciones! ¡Eres Ganador!</strong>
            <p style="margin: 0; font-size: 1.1rem;">Tienes ${ganadores.length} ticket${ganadores.length !== 1 ? 's' : ''} ganador${ganadores.length !== 1 ? 'es' : ''}: ${ganadores.map(g => '#' + esc(g.numero_ticket)).join(', ')}</p>
        </div>
    `;
    ganadoresContainer.insertBefore(mensajeDiv, ganadoresContainer.firstChild);
}

function abrirImagen(index) {
    imagenActual = index;
    mostrarImagenModal();
}

function comprarTicket() {
    if (!currentUser || !authToken) {
        alert('Debes iniciar sesión para comprar tickets. Serás redirigido a la página principal.');
        window.location.href = 'index.html';
        return;
    }
    if (!sorteo || sorteo.estado !== 'activo') {
        alert('Este sorteo no está disponible para compra');
        return;
    }
    window.location.href = `comprar-ticket.html?id=${sorteo.id}`;
}

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    loadSorteo();

    document.getElementById('comprarTicketBtn')?.addEventListener('click', comprarTicket);
    document.getElementById('closeImagenModal').addEventListener('click', cerrarImagenModal);
    document.getElementById('prevImagen').addEventListener('click', () => {
        if (imagenesProductoActual.length > 0) anteriorImagenProducto();
        else anteriorImagen();
    });
    document.getElementById('nextImagen').addEventListener('click', () => {
        if (imagenesProductoActual.length > 0) siguienteImagenProducto();
        else siguienteImagen();
    });

    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('imagenModal');
        if (!modal || !modal.classList.contains('active')) return;
        if (e.key === 'Escape') cerrarImagenModal();
        else if (e.key === 'ArrowLeft') {
            if (imagenesProductoActual.length > 0) anteriorImagenProducto();
            else anteriorImagen();
        } else if (e.key === 'ArrowRight') {
            if (imagenesProductoActual.length > 0) siguienteImagenProducto();
            else siguienteImagen();
        }
    });

    document.getElementById('imagenModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'imagenModal') cerrarImagenModal();
    });
});

function abrirImagenProducto(productoIndex, imagenIndex) {
    const producto = todasLasImagenesProductos[productoIndex];
    if (!producto || !producto.imagenes || producto.imagenes.length === 0) return;
    imagenesProductoActual = producto.imagenes;
    imagenActual = imagenIndex;
    mostrarImagenModalProducto();
}

function mostrarImagenModalProducto() {
    const modal = document.getElementById('imagenModal');
    const img = document.getElementById('imagenModalImg');
    const counter = document.getElementById('imagenCounter');
    if (!modal || !img || imagenesProductoActual.length === 0) return;
    img.src = imagenesProductoActual[imagenActual];
    counter.textContent = `${imagenActual + 1} / ${imagenesProductoActual.length}`;
    modal.classList.add('active');
    document.getElementById('prevImagen').style.display = imagenActual > 0 ? 'block' : 'none';
    document.getElementById('nextImagen').style.display = imagenActual < imagenesProductoActual.length - 1 ? 'block' : 'none';
}

function siguienteImagenProducto() {
    if (imagenActual < imagenesProductoActual.length - 1) {
        imagenActual++;
        mostrarImagenModalProducto();
    }
}

function anteriorImagenProducto() {
    if (imagenActual > 0) {
        imagenActual--;
        mostrarImagenModalProducto();
    }
}

function mostrarImagenModal() {
    const modal = document.getElementById('imagenModal');
    const img = document.getElementById('imagenModalImg');
    const counter = document.getElementById('imagenCounter');
    const imagenesAMostrar = imagenesProductoActual.length > 0 ? imagenesProductoActual : imagenes;
    if (!modal || !img || imagenesAMostrar.length === 0) return;
    img.src = imagenesAMostrar[imagenActual];
    counter.textContent = `${imagenActual + 1} / ${imagenesAMostrar.length}`;
    modal.classList.add('active');
    document.getElementById('prevImagen').style.display = imagenActual > 0 ? 'block' : 'none';
    document.getElementById('nextImagen').style.display = imagenActual < imagenesAMostrar.length - 1 ? 'block' : 'none';
}

function cerrarImagenModal() {
    const modal = document.getElementById('imagenModal');
    if (modal) modal.classList.remove('active');
    imagenesProductoActual = [];
}

function siguienteImagen() {
    const imagenesAMostrar = imagenesProductoActual.length > 0 ? imagenesProductoActual : imagenes;
    if (imagenActual < imagenesAMostrar.length - 1) {
        imagenActual++;
        mostrarImagenModal();
    }
}

function anteriorImagen() {
    if (imagenActual > 0) {
        imagenActual--;
        mostrarImagenModal();
    }
}

window.abrirImagen = abrirImagen;
window.abrirImagenProducto = abrirImagenProducto;
