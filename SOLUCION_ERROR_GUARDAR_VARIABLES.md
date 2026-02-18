# 🔧 Solución: Error al Guardar Variables de Entorno en cPanel

## ❌ Error Actual

```
Error: The received data is wrong. Contact support for resolution.
```

## 🔍 Posibles Causas

1. **Caracteres especiales** en las credenciales (guiones, guiones bajos)
2. **Espacios** antes o después de las credenciales
3. **Formato incorrecto** de las variables
4. **Credenciales muy largas** que exceden el límite

---

## ✅ Soluciones

### Solución 1: Agregar las Variables Una por Una

En lugar de editar las existentes, intenta **eliminarlas y crearlas de nuevo**:

1. **Elimina** `PAYPAL_CLIENT_ID` (haz clic en el ícono de basura)
2. **Elimina** `PAYPAL_CLIENT_SECRET` (haz clic en el ícono de basura)
3. **Haz clic en "+ ADD VARIABLE"**
4. **Agrega `PAYPAL_CLIENT_ID`**:
   - Name: `PAYPAL_CLIENT_ID`
   - Value: `ATJJeol8A8C6AHCJvr-vnCgtrfwG054CQiX0Ai_K9xqKKdEauL29xAzEpGGWVaVQL6MDH6qOnYHNeOLT`
   - Guarda
5. **Haz clic en "+ ADD VARIABLE"** de nuevo
6. **Agrega `PAYPAL_CLIENT_SECRET`**:
   - Name: `PAYPAL_CLIENT_SECRET`
   - Value: `EGi10pUVAUHoamn3quBQTXqNdX3MGmoMZnm1Z8BE_SMZmYqHHBR47yMhBbvjNAhx0Gk1QFQDv5E5xF1x`
   - Guarda

### Solución 2: Verificar que PAYPAL_MODE Exista

1. Verifica que exista la variable `PAYPAL_MODE`
2. Si no existe, créala:
   - Name: `PAYPAL_MODE`
   - Value: `live`
3. Si existe, verifica que el valor sea exactamente `live` (sin espacios)

### Solución 3: Copiar las Credenciales Correctamente

**Client ID** (copia exactamente esto, sin espacios):
```
ATJJeol8A8C6AHCJvr-vnCgtrfwG054CQiX0Ai_K9xqKKdEauL29xAzEpGGWVaVQL6MDH6qOnYHNeOLT
```

**Client Secret** (copia exactamente esto, sin espacios):
```
EGi10pUVAUHoamn3quBQTXqNdX3MGmoMZnm1Z8BE_SMZmYqHHBR47yMhBbvjNAhx0Gk1QFQDv5E5xF1x
```

**IMPORTANTE**:
- No agregues comillas
- No agregues espacios antes o después
- Copia exactamente como está

### Solución 4: Usar el Editor de package.json

Si el error persiste, puedes intentar agregar las variables directamente en el código:

1. Haz clic en **"Edit"** junto a `package.json`
2. Agrega un script para configurar las variables (aunque esto no es ideal, puede funcionar como alternativa temporal)

### Solución 5: Contactar Soporte de cPanel

Si ninguna de las soluciones anteriores funciona:

1. Haz clic en **"Show more"** en el error para ver el traceback completo
2. Copia el error completo
3. Contacta al soporte de tu hosting con:
   - El error completo
   - Las variables que intentas agregar
   - Una captura de pantalla

---

## 📋 Checklist de Verificación

- [ ] Eliminé las variables antiguas de PayPal
- [ ] Creé `PAYPAL_CLIENT_ID` desde cero con "+ ADD VARIABLE"
- [ ] Creé `PAYPAL_CLIENT_SECRET` desde cero con "+ ADD VARIABLE"
- [ ] Verifiqué que `PAYPAL_MODE=live` existe
- [ ] No agregué espacios antes o después de las credenciales
- [ ] No agregué comillas alrededor de las credenciales
- [ ] Copié las credenciales exactamente como están

---

## 🔄 Alternativa: Editar desde File Manager

Si cPanel no te deja guardar desde la interfaz:

1. Ve a **File Manager** en cPanel
2. Navega a `/home/premioclick/public_html/api/`
3. Busca el archivo `.env` (puede estar oculto, activa "Mostrar archivos ocultos")
4. Si no existe, créalo
5. Agrega estas líneas:
   ```
   PAYPAL_MODE=live
   PAYPAL_CLIENT_ID=ATJJeol8A8C6AHCJvr-vnCgtrfwG054CQiX0Ai_K9xqKKdEauL29xAzEpGGWVaVQL6MDH6qOnYHNeOLT
   PAYPAL_CLIENT_SECRET=EGi10pUVAUHoamn3quBQTXqNdX3MGmoMZnm1Z8BE_SMZmYqHHBR47yMhBbvjNAhx0Gk1QFQDv5E5xF1x
   ```
6. Guarda el archivo
7. Reinicia la aplicación Node.js

---

## 🆘 Si Aún No Funciona

1. **Haz clic en "Show more"** en el error para ver el traceback completo
2. **Comparte el error completo** para diagnosticar mejor
3. **Intenta agregar solo una variable a la vez** para identificar cuál causa el problema
4. **Verifica que no haya caracteres invisibles** al copiar (puedes copiar a un editor de texto primero y luego a cPanel)
