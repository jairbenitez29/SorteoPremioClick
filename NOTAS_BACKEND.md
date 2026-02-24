# Notas para el backend

## Límite de 1000 tickets por mes

El mensaje *"Solo se pueden crear hasta 1000 tickets por mes"* lo devuelve el **servidor** cuando se llama a la ruta de generación de tickets (por ejemplo `POST /tickets/generar/:sorteoId`).

En esta app (frontend) no existe ese límite; la restricción está en el backend. Para que no haya límite al crear tickets:

1. Localiza en tu API el controlador o middleware que valida la cantidad de tickets creados por mes.
2. Elimina o amplía esa validación para permitir generar los tickets que se necesiten.

La app ya envía `cantidad` y `precio` en el body; no hace falta cambiar nada en el cliente.
