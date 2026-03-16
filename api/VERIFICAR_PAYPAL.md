# Cómo verificar las credenciales de PayPal

Si al comprar un ticket ves **"Error de autenticación con PayPal" (401)**, sigue estos pasos.

---

## 1. Probar credenciales desde el navegador

Después de desplegar en Vercel, abre:

**https://sorteo-5lh6.vercel.app/api/pagos/paypal/test**

- Si responde **`{ "ok": true, "message": "Credenciales PayPal correctas" }`** → las variables están bien y el problema puede ser otro (por ejemplo caché o deploy antiguo).
- Si responde **`ok: false`** → la respuesta incluye un **hint** que indica qué corregir.

---

## 2. Revisar variables en Vercel

1. Entra a **Vercel** → tu proyecto → **Settings** → **Environment Variables**.
2. Debes tener exactamente:

   | Nombre               | Valor                                      |
   |----------------------|--------------------------------------------|
   | `PAYPAL_MODE`        | `sandbox` (pruebas) o `live` (producción)  |
   | `PAYPAL_CLIENT_ID`   | Client ID de tu app en PayPal              |
   | `PAYPAL_CLIENT_SECRET` | Secret de la misma app                  |

3. **Errores frecuentes:**
   - **Espacios:** no dejes espacios al inicio o al final al pegar.
   - **Modo y credenciales:** si `PAYPAL_MODE=sandbox` usa **credenciales Sandbox**; si `PAYPAL_MODE=live` usa **credenciales Live**. No mezcles.
   - **Recortar:** copia el Client ID y el Secret completos (no los cortes al pegar).

4. Después de cambiar variables: **Redeploy** el proyecto (Deployments → ⋮ en el último deploy → Redeploy) para que se apliquen.

---

## 3. Dónde sacar las credenciales en PayPal

1. Entra a **https://developer.paypal.com** e inicia sesión.
2. **Apps & Credentials**.
3. Para **pruebas:** pestaña **Sandbox** → tu app (o crea una) → **Client ID** y **Secret**.
4. Para **producción:** pestaña **Live** → tu app → **Client ID** y **Secret**.

Sandbox y Live tienen IDs y Secrets **distintos**. Usa siempre el par que corresponda a `PAYPAL_MODE`.

---

## 4. Resumen rápido

| Comprobación                         | Acción |
|--------------------------------------|--------|
| `/api/pagos/paypal/test` da `ok: true` | Credenciales correctas. Si la compra sigue fallando, redeploy o revisa que la web use la API de Vercel. |
| `ok: false` con 401                   | Revisa Client ID, Secret y que coincidan con Sandbox/Live. |
| Variables nuevas en Vercel            | Haz **Redeploy** para que se carguen. |
