# 🚀 Resumen Rápido - Integración Auto-Login

## ✅ Pasos Rápidos (5 minutos)

### 1️⃣ Subir archivo JavaScript
- Ve a cPanel → Administrador de archivos → `public_html`
- Sube el archivo `web-auto-login.js` a `public_html/`

### 2️⃣ Modificar `index.html`
Abre `index.html` y agrega esta línea **ANTES** de tus otros scripts:

```html
<script src="/web-auto-login.js"></script>
```

**Ubicación:** Justo antes de `</body>` o antes de tus otros `<script>`

### 3️⃣ Modificar `index.js` o `script.js`
Abre tu archivo JavaScript principal y agrega al **inicio**:

```javascript
// Escuchar auto-login
window.addEventListener('userAuthenticated', function(event) {
    const { user, token } = event.detail;
    console.log('Usuario autenticado:', user);
    // Aquí actualiza tu estado de autenticación
    // Ejemplo: currentUser = user; o updateAuthState(user);
});

// Verificar sesión al cargar
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
        const user = JSON.parse(userStr);
        // Actualizar tu estado aquí también
    }
});
```

### 4️⃣ Guardar y Probar
- Guarda todos los cambios
- Prueba desde la app móvil: Perfil → Premiaciones en Línea
- Debería autenticarte automáticamente

---

## 📝 ¿Qué hace cada parte?

- **`web-auto-login.js`**: Detecta el token en la URL y autentica automáticamente
- **Código en `index.js`**: Escucha cuando el usuario se autentica y actualiza tu app
- **localStorage**: Guarda el token y usuario para mantener la sesión

---

## 🐛 Si no funciona

1. Abre la consola del navegador (F12)
2. Busca errores en rojo
3. Verifica que `web-auto-login.js` esté cargado (pestaña Network)
4. Verifica que la URL tenga `?token=XXX&autoLogin=true`

---

## 📞 ¿Necesitas más ayuda?

Lee el archivo `INSTRUCCIONES-CPANEL.md` para instrucciones detalladas.
