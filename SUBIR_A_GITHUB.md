# Guía: Subir Proyecto a GitHub

## Paso 1: Crear Repositorio en GitHub

1. **Ve a GitHub:**
   - Abre tu navegador y ve a: https://github.com
   - Inicia sesión (o crea una cuenta si no tienes)

2. **Crear nuevo repositorio:**
   - Haz clic en el botón **"+"** (arriba a la derecha)
   - Selecciona **"New repository"**

3. **Configurar el repositorio:**
   - **Repository name**: `SorteosApp` (o el nombre que prefieras)
   - **Description**: "Aplicación móvil de sorteos - PremioClick"
   - **Visibility**: 
     - ✅ **Public** (si quieres que sea público)
     - ✅ **Private** (si quieres que sea privado)
   - **NO marques** "Add a README file" (ya tenemos archivos)
   - **NO marques** "Add .gitignore" (ya tenemos uno)
   - **NO marques** "Choose a license"

4. **Crear repositorio:**
   - Haz clic en **"Create repository"**

5. **Copia la URL del repositorio:**
   - GitHub te mostrará una página con instrucciones
   - **Copia la URL** que aparece (algo como: `https://github.com/tu-usuario/SorteosApp.git`)

## Paso 2: Conectar y Subir el Proyecto

Una vez que tengas la URL del repositorio, ejecuta estos comandos en PowerShell:

```powershell
# 1. Asegúrate de estar en el proyecto
cd C:\Users\KELVIN\OneDrive\Desktop\SorteosApp

# 2. Agrega todos los archivos (excepto los que están en .gitignore)
git add .

# 3. Haz commit de los cambios
git commit -m "Initial commit: Aplicación de sorteos PremioClick"

# 4. Agrega el repositorio remoto (REEMPLAZA con tu URL)
git remote add origin https://github.com/TU-USUARIO/SorteosApp.git

# 5. Cambia el nombre de la rama principal a 'main' (si es necesario)
git branch -M main

# 6. Sube el código a GitHub
git push -u origin main
```

## Si te pide credenciales:

- **Usuario**: Tu nombre de usuario de GitHub
- **Contraseña**: Necesitarás un **Personal Access Token** (no tu contraseña normal)

### Crear Personal Access Token:

1. Ve a: https://github.com/settings/tokens
2. Haz clic en **"Generate new token"** → **"Generate new token (classic)"**
3. **Nombre**: "SorteosApp"
4. **Expiración**: Elige una (ej: 90 días)
5. **Permisos**: Marca `repo` (todos los permisos de repositorio)
6. Haz clic en **"Generate token"**
7. **Copia el token** (solo se muestra una vez)
8. Úsalo como contraseña cuando Git te la pida

## Verificar que se subió:

1. Ve a tu repositorio en GitHub
2. Deberías ver todos los archivos del proyecto
3. ✅ ¡Listo!

## Comandos Útiles para el Futuro:

```powershell
# Ver estado de cambios
git status

# Agregar cambios
git add .

# Hacer commit
git commit -m "Descripción de los cambios"

# Subir cambios
git push

# Bajar cambios
git pull
```
