# Script para generar APK usando un directorio temporal diferente
# Ejecuta este script como Administrador

Write-Host "Generando APK (usando directorio temporal alternativo)..." -ForegroundColor Cyan
Write-Host ""

# Crear un directorio temporal alternativo en C:\Temp
$altTempDir = "C:\Temp\eas-build"
if (-not (Test-Path "C:\Temp")) {
    New-Item -ItemType Directory -Force -Path "C:\Temp" | Out-Null
}
if (Test-Path $altTempDir) {
    Remove-Item -Path $altTempDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Force -Path $altTempDir | Out-Null
Write-Host "Directorio temporal alternativo: $altTempDir" -ForegroundColor Gray

# Limpiar carpeta temporal original de EAS
$easTempPath = "$env:LOCALAPPDATA\Temp\eas-cli-nodejs"
if (Test-Path $easTempPath) {
    Write-Host "Limpiando carpeta temporal original de EAS..." -ForegroundColor Yellow
    try {
        Remove-Item -Path $easTempPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  OK: Carpeta temporal limpiada" -ForegroundColor Green
    } catch {
        Write-Host "  ADVERTENCIA: No se pudo limpiar completamente" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Iniciando build de Android..." -ForegroundColor Cyan
Write-Host ""

# Configurar variables de entorno
$env:EAS_NO_VCS = "1"
$env:TMPDIR = $altTempDir
$env:TEMP = $altTempDir
$env:TMP = $altTempDir

# Ejecutar EAS Build
$buildSuccess = $false
try {
    npx eas build --platform android --profile preview
    if ($LASTEXITCODE -eq 0) {
        $buildSuccess = $true
    }
} catch {
    Write-Host ""
    Write-Host "ERROR durante el build: $_" -ForegroundColor Red
    $buildSuccess = $false
}

# Limpiar directorio temporal alternativo
Write-Host ""
Write-Host "Limpiando directorio temporal alternativo..." -ForegroundColor Cyan
try {
    if (Test-Path $altTempDir) {
        Remove-Item -Path $altTempDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  OK: Directorio temporal limpiado" -ForegroundColor Green
    }
} catch {
    Write-Host "  ADVERTENCIA: No se pudo limpiar completamente: $altTempDir" -ForegroundColor Yellow
}

Write-Host ""
if ($buildSuccess) {
    Write-Host "Build completado exitosamente" -ForegroundColor Green
} else {
    Write-Host "Build fallo. Revisa los errores arriba." -ForegroundColor Red
}
