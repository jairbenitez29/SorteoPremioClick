# Script para generar APK sin usar Git (evita problemas de permisos)
# Ejecuta este script como Administrador

Write-Host "🚀 Generando APK con EAS Build (sin Git)..." -ForegroundColor Cyan
Write-Host ""

# Limpiar carpeta temporal de EAS
$tempPath = "$env:LOCALAPPDATA\Temp\eas-cli-nodejs"
if (Test-Path $tempPath) {
    Write-Host "🧹 Limpiando carpeta temporal..." -ForegroundColor Yellow
    try {
        Remove-Item -Path $tempPath -Recurse -Force -ErrorAction Stop
        Write-Host "✅ Carpeta temporal limpiada" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  No se pudo limpiar completamente la carpeta temporal" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "📦 Iniciando build de Android (sin Git)..." -ForegroundColor Cyan
Write-Host ""

# Ejecutar EAS Build sin usar Git
$env:EAS_NO_VCS = "1"
npx eas build --platform android --profile preview

Write-Host ""
Write-Host "✅ Build completado" -ForegroundColor Green
