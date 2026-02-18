# 🔍 Debug: Error al Obtener Precio del Ticket

## Cambios Realizados

### 1. Backend (`backend/routes/sorteos.js`)
✅ **Mejorado el logging** para rastrear cómo se obtiene el precio:
- Logs detallados de cada paso en la obtención del precio
- Verificación de si hay tickets disponibles
- Verificación de si hay tickets en general
- Logs del precio obtenido y su tipo

### 2. App Móvil (`app/comprar-ticket/[id].tsx`)
✅ **Mejorado el cálculo del precio** con logging extensivo:
- Logs detallados del valor de `precio_ticket` recibido
- Verificación de tipos de datos
- Fallback a `tickets[0].precio` si `precio_ticket` no está disponible
- Logs de error si el precio es 0

---

## 📋 Pasos para Diagnosticar

### Paso 1: Subir Archivos Corregidos

1. **Backend**: Sube `backend/routes/sorteos.js` a cPanel:
   - Ruta: `/home/premioclick/public_html/api/routes/sorteos.js`

2. **App Móvil**: El archivo `app/comprar-ticket/[id].tsx` ya está corregido localmente
   - Recompila la app móvil para que tome los cambios

### Paso 2: Verificar Logs del Backend

1. Ve a **cPanel → Node.js App → Logs**
2. Intenta cargar un sorteo desde la app móvil
3. Busca estos logs en el backend:

```
🔍 ========== OBTENIENDO PRECIO DEL TICKET ==========
🔍 Sorteo ID: [id]
🔍 Tickets disponibles encontrados: [número]
🔍 Precio del ticket disponible: [precio]
✅ Precio del ticket obtenido y asignado: [precio]
```

**Si ves**:
- `⚠️ No se encontraron tickets para este sorteo, precio establecido en 0`
  - **Problema**: El sorteo no tiene tickets generados
  - **Solución**: Genera tickets para el sorteo desde la app admin

### Paso 3: Verificar Logs de la App Móvil

1. Abre la consola de desarrollo (React Native Debugger o Metro)
2. Intenta comprar un ticket
3. Busca estos logs:

```
🔍 Sorteo cargado: {
  id: ...,
  titulo: ...,
  precio_ticket: [precio o undefined],
  ...
}

🔍 ========== CALCULANDO PRECIO UNITARIO ==========
🔍 sorteo.precio_ticket (raw): [valor]
🔍 Tipo de precio_ticket: [tipo]
✅ Precio obtenido de precio_ticket: [precio]
🔍 Precio unitario final: [precio]
```

**Si ves**:
- `❌ ERROR: Precio del ticket es 0`
  - Revisa el log completo para ver qué datos está recibiendo la app

---

## 🔧 Posibles Problemas y Soluciones

### Problema 1: El sorteo no tiene tickets generados
**Síntoma**: Backend muestra "No se encontraron tickets para este sorteo"
**Solución**:
1. Ve a la app admin
2. Selecciona el sorteo
3. Genera tickets para ese sorteo
4. Asegúrate de que los tickets tengan un precio mayor a 0

### Problema 2: Los tickets tienen precio 0 o NULL
**Síntoma**: Backend encuentra tickets pero el precio es 0
**Solución**:
1. Ve a phpMyAdmin
2. Ejecuta esta consulta:
   ```sql
   SELECT id, sorteo_id, precio, estado 
   FROM tickets 
   WHERE sorteo_id = [ID_DEL_SORTEO]
   LIMIT 10;
   ```
3. Verifica que los tickets tengan un precio mayor a 0
4. Si no, actualiza los tickets:
   ```sql
   UPDATE tickets 
   SET precio = [PRECIO_CORRECTO] 
   WHERE sorteo_id = [ID_DEL_SORTEO] AND precio = 0;
   ```

### Problema 3: El precio no se está enviando en la respuesta JSON
**Síntoma**: App móvil muestra `precio_ticket: undefined`
**Solución**:
1. Verifica los logs del backend para ver si `precio_ticket` se está asignando
2. Verifica que el backend esté usando la versión corregida de `sorteos.js`
3. Reinicia la aplicación Node.js en cPanel

### Problema 4: Error de conversión de tipos
**Síntoma**: El precio viene como string o otro tipo
**Solución**:
- El código ya maneja esto con `parseFloat()`
- Los logs mostrarán el tipo de dato recibido

---

## 🧪 Cómo Probar

1. **Abre la app móvil** y ve a un sorteo que tenga tickets
2. **Haz clic en "Comprar Ticket"**
3. **Revisa la consola** de la app móvil:
   - Debe mostrar el log `🔍 Sorteo cargado:` con `precio_ticket`
   - Debe mostrar el log `🔍 ========== CALCULANDO PRECIO UNITARIO ==========`
   - Debe mostrar el precio final calculado

4. **Revisa los logs del backend** en cPanel:
   - Debe mostrar `🔍 ========== OBTENIENDO PRECIO DEL TICKET ==========`
   - Debe mostrar el precio obtenido

5. **Verifica que el precio se muestre correctamente** en la pantalla de compra

---

## 📝 Checklist

- [ ] Archivo `backend/routes/sorteos.js` subido a cPanel
- [ ] App móvil recompilada con los cambios
- [ ] Aplicación Node.js reiniciada en cPanel
- [ ] Logs del backend muestran la obtención del precio
- [ ] Logs de la app móvil muestran el cálculo del precio
- [ ] El precio se muestra correctamente en la pantalla (no $0)

---

## 🆘 Si Aún No Funciona

1. **Comparte los logs**:
   - Logs del backend (de cPanel)
   - Logs de la app móvil (de la consola)
   - Captura de pantalla de la pantalla de compra

2. **Verifica en la base de datos**:
   - ¿El sorteo tiene tickets?
   - ¿Los tickets tienen precio mayor a 0?
   - Ejecuta: `SELECT COUNT(*), MIN(precio), MAX(precio) FROM tickets WHERE sorteo_id = [ID]`

3. **Prueba directamente el endpoint**:
   - Abre en el navegador: `https://premioclick.cl/api/sorteos/[ID]`
   - Verifica que la respuesta JSON incluya `"precio_ticket": [número]`
