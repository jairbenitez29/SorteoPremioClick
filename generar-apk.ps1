# Script para generar APK con EAS Build
# Ejecuta este script como Administrador si tienes problemas de permisos

Write-Host "🚀 Generando APK con EAS Build..." -ForegroundColor Cyan
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
        Write-Host "   Esto es normal si hay procesos bloqueando archivos" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "📦 Iniciando build de Android..." -ForegroundColor Cyan
Write-Host ""

# Ejecutar EAS Build
npx eas build --platform android --profile preview

Write-Host ""
Write-Host "✅ Build completado" -ForegroundColor Green
