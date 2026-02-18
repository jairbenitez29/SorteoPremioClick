# Wrapper que ejecuta exactamente: npx eas build --platform android --profile preview
# Pero con todas las configuraciones necesarias para evitar EPERM

Write-Host "Ejecutando: npx eas build --platform android --profile preview" -ForegroundColor Cyan
Write-Host ""

# Cerrar procesos que puedan estar bloqueando
Write-Host "Cerrando procesos que puedan estar bloqueando archivos..." -ForegroundColor Yellow
Get-Process | Where-Object {
    $_.ProcessName -like "*node*" -or 
    $_.ProcessName -like "*expo*" -or 
    $_.ProcessName -like "*eas*"
} | Where-Object {
    $_.Path -notlike "*cursor*" -and $_.Path -notlike "*vscode*"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

# Limpiar carpeta temporal de EAS completamente
$easTempPath = "$env:LOCALAPPDATA\Temp\eas-cli-nodejs"
if (Test-Path $easTempPath) {
    Write-Host "Limpiando carpeta temporal de EAS..." -ForegroundColor Yellow
    try {
        # Intentar eliminar cada subcarpeta individualmente
        Get-ChildItem -Path $easTempPath -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            $subFolder = $_.FullName
            try {
                Remove-Item -Path $subFolder -Recurse -Force -ErrorAction Stop
            } catch {
                # Si falla, esperar un poco y reintentar
                Start-Sleep -Seconds 1
                Remove-Item -Path $subFolder -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
        # Eliminar la carpeta principal
        Remove-Item -Path $easTempPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  OK: Carpeta temporal limpiada" -ForegroundColor Green
    } catch {
        Write-Host "  ADVERTENCIA: Algunas carpetas no se pudieron limpiar" -ForegroundColor Yellow
    }
}

# Configurar variables de entorno para evitar shallow-clone
$env:EAS_NO_VCS = "1"
$env:EAS_BUILD_SKIP_CLEANUP = "1"
$env:EAS_BUILD_USE_LOCAL_GIT = "0"

# Cambiar directorio temporal a uno con menos restricciones
$altTemp = "C:\Temp\eas-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
if (-not (Test-Path "C:\Temp")) {
    New-Item -ItemType Directory -Force -Path "C:\Temp" | Out-Null
}
$env:TMPDIR = $altTemp
$env:TEMP = $altTemp
$env:TMP = $altTemp

Write-Host ""
Write-Host "Ejecutando build..." -ForegroundColor Cyan
Write-Host ""

# Ejecutar el comando EXACTO que el usuario quiere
npx eas build --platform android --profile preview

# Limpiar directorio temporal alternativo
if (Test-Path $altTemp) {
    Remove-Item -Path $altTemp -Recurse -Force -ErrorAction SilentlyContinue
}
