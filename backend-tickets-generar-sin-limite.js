/**
 * CAMBIO PARA TU routes/tickets.js EN EL SERVIDOR
 *
 * En la ruta POST /generar/:sorteoId, BORRA solo este bloque (las 6 líneas):
 *
 *    // Verificar que no se exceda el límite de 1000 tickets por mes
 *    if (numeroInicial + cantidad > 1000) {
 *      return res.status(400).json({
 *        error: `Solo se pueden crear hasta 1000 tickets por mes. Ya existen ${numeroInicial} tickets este mes.`
 *      });
 *    }
 *
 * El resto del archivo se queda igual. Así podrás generar todos los tickets que quieras;
 * la numeración ya sigue desde el último (numeroInicial + 1, etc.) sin duplicados.
 */
