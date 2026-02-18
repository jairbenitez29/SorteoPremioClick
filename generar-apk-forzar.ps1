# Script para forzar el build sin shallow-clone
# Ejecuta este script como Administrador

Write-Host "Forzando build sin shallow-clone..." -ForegroundColor Cyan
Write-Host ""

# Limpiar TODAS las carpetas temporales de EAS
$easTempPath = "$env:LOCALAPPDATA\Temp\eas-cli-nodejs"
if (Test-Path $easTempPath) {
    Write-Host "Limpiando carpeta temporal de EAS..." -ForegroundColor Yellow
    Get-ChildItem -Path $easTempPath -Directory | ForEach-Object {
        try {
            Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
        } catch {
            # Intentar cerrar procesos que puedan estar usando los archivos
            $folderName = $_.Name
            Write-Host "  Intentando liberar: $folderName" -ForegroundColor Gray
            Start-Sleep -Seconds 1
            Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
    Write-Host "  OK: Carpeta temporal limpiada" -ForegroundColor Green
}

# Cambiar el directorio temporal de Node.js
$newTempDir = "C:\Temp\eas-build-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
if (-not (Test-Path "C:\Temp")) {
    New-Item -ItemType Directory -Force -Path "C:\Temp" | Out-Null
}
New-Item -ItemType Directory -Force -Path $newTempDir | Out-Null

Write-Host ""
Write-Host "Usando directorio temporal alternativo: $newTempDir" -ForegroundColor Gray

# Configurar variables de entorno
$env:EAS_NO_VCS = "1"
$env:TMPDIR = $newTempDir
$env:TEMP = $newTempDir
$env:TMP = $newTempDir
$env:NODE_TMPDIR = $newTempDir

# También intentar deshabilitar el shallow-clone completamente
$env:EAS_BUILD_SKIP_CLEANUP = "1"
$env:EAS_BUILD_USE_LOCAL_GIT = "0"

Write-Host ""
Write-Host "Iniciando build de Android..." -ForegroundColor Cyan
Write-Host ""

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

# Limpiar directorio temporal
Write-Host ""
Write-Host "Limpiando directorio temporal..." -ForegroundColor Cyan
try {
    if (Test-Path $newTempDir) {
        Remove-Item -Path $newTempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
} catch {
    Write-Host "  ADVERTENCIA: No se pudo limpiar: $newTempDir" -ForegroundColor Yellow
}

Write-Host ""
if ($buildSuccess) {
    Write-Host "Build completado exitosamente" -ForegroundColor Green
} else {
    Write-Host "Build fallo. Revisa los errores arriba." -ForegroundColor Red
    Write-Host ""
    Write-Host "Si el error persiste, el problema es que EAS Build internamente" -ForegroundColor Yellow
    Write-Host "crea un shallow-clone y Windows lo bloquea." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Solucion alternativa: Usa build local" -ForegroundColor Cyan
    Write-Host "  npx eas build --platform android --profile preview --local" -ForegroundColor White
}
