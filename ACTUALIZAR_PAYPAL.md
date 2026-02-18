# Actualizar Credenciales de PayPal en cPanel

## Credenciales de PayPal Live (Producción)

Según las credenciales que te envió tu cliente:

**Client ID:**
```
AYQ9CQyPPn8l_kjF3B6uqm-XscR1RWYlym-3LdqFjdDFz-DiB5C1sWYrLdZgXzby2ZSeKv-AV54X8Kkd50
```

**Secret:**
```
EAILAF3nzwqGDI300Np9jgPB-4CmXJ87m0spq0o-7v43swxWe8CgKkncGMgJhR88J-Y_U2vPc5vHm4KYW
```

## Pasos para actualizar en cPanel:

1. **Accede a cPanel** y ve a la sección **"Node.js App"** o **"Node.js"**

2. **Encuentra tu aplicación** (probablemente llamada "api" o "PremioClick API")

3. **Haz clic en "Edit"** o en el ícono de editar

4. **Ve a la sección "Environment Variables"** o **"Variables de Entorno"**

5. **Actualiza las siguientes variables:**

   - `PAYPAL_CLIENT_ID` = `AYQ9CQyPPn8l_kjF3B6uqm-XscR1RWYlym-3LdqFjdDFz-DiB5C1sWYrLdZgXzby2ZSeKv-AV54X8Kkd50`
   
   - `PAYPAL_CLIENT_SECRET` = `EAILAF3nzwqGDI300Np9jgPB-4CmXJ87m0spq0o-7v43swxWe8CgKkncGMgJhR88J-Y_U2vPc5vHm4KYW`
   
   - `PAYPAL_MODE` = `production` (importante: debe ser "production" para pagos reales)

6. **Guarda los cambios**

7. **Reinicia la aplicación** haciendo clic en el botón **"Restart"**

## Verificación:

Después de actualizar, prueba comprar un ticket desde la web o la app móvil para verificar que PayPal funciona correctamente.

## Nota Importante:

- Estas son credenciales de **producción (Live)**, por lo que los pagos serán **reales**
- Asegúrate de que `PAYPAL_MODE` esté configurado como `production`
- No compartas estas credenciales públicamente
