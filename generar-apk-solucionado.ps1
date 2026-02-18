# Script para generar APK con solucion para errores de permisos
# Ejecuta este script como Administrador

Write-Host "Generando APK para cliente..." -ForegroundColor Cyan
Write-Host ""

$projectPath = Get-Location
Write-Host "Directorio del proyecto: $projectPath" -ForegroundColor Gray

# Paso 1: Cerrar procesos que puedan estar bloqueando
Write-Host "Paso 1: Cerrando procesos bloqueantes..." -ForegroundColor Yellow
Get-Process | Where-Object {
    $_.ProcessName -like "*java*" -or 
    $_.ProcessName -like "*gradle*" -or 
    $_.ProcessName -like "*android*"
} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "  OK: Procesos cerrados" -ForegroundColor Green

# Paso 2: Eliminar carpeta android si existe
Write-Host ""
Write-Host "Paso 2: Eliminando carpeta android anterior..." -ForegroundColor Yellow
if (Test-Path "android") {
    try {
        # Intentar eliminar con diferentes metodos
        Remove-Item -Path "android" -Recurse -Force -ErrorAction Stop
        Write-Host "  OK: Carpeta android eliminada" -ForegroundColor Green
    } catch {
        Write-Host "  ADVERTENCIA: No se pudo eliminar automaticamente" -ForegroundColor Yellow
        Write-Host "  Por favor:" -ForegroundColor Yellow
        Write-Host "    1. Cierra VS Code/Cursor si esta abierto" -ForegroundColor White
        Write-Host "    2. Cierra Android Studio si esta abierto" -ForegroundColor White
        Write-Host "    3. Elimina manualmente la carpeta 'android' desde el Explorador" -ForegroundColor White
        Write-Host "    4. Ejecuta este script de nuevo" -ForegroundColor White
        exit 1
    }
} else {
    Write-Host "  OK: No hay carpeta android previa" -ForegroundColor Green
}

# Paso 3: Verificar Android Studio
Write-Host ""
Write-Host "Paso 3: Verificando Android Studio..." -ForegroundColor Yellow
$androidStudioPaths = @(
    "$env:LOCALAPPDATA\Programs\Android\Android Studio",
    "C:\Program Files\Android\Android Studio",
    "C:\Program Files (x86)\Android\Android Studio"
)

$androidStudioFound = $false
foreach ($path in $androidStudioPaths) {
    if (Test-Path $path) {
        Write-Host "  OK: Android Studio encontrado" -ForegroundColor Green
        $androidStudioFound = $true
        break
    }
}

if (-not $androidStudioFound) {
    Write-Host "  ERROR: Android Studio no encontrado" -ForegroundColor Red
    exit 1
}

# Paso 4: Prebuild (generar carpetas nativas)
Write-Host ""
Write-Host "Paso 4: Generando carpetas nativas de Android..." -ForegroundColor Yellow
Write-Host "  Esto puede tardar varios minutos..." -ForegroundColor Gray

try {
    npx expo prebuild --platform android --clean
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: Fallo el prebuild" -ForegroundColor Red
        exit 1
    }
    Write-Host "  OK: Carpetas nativas generadas" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
    exit 1
}

# Paso 5: Generar APK
Write-Host ""
Write-Host "Paso 5: Generando APK..." -ForegroundColor Yellow
Write-Host "  Esto puede tardar 10-15 minutos..." -ForegroundColor Gray

if (-not (Test-Path "android")) {
    Write-Host "  ERROR: Carpeta android no encontrada" -ForegroundColor Red
    exit 1
}

try {
    Push-Location android
    .\gradlew assembleRelease
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: Fallo la generacion del APK" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
    Write-Host "  OK: APK generado exitosamente" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Paso 6: Mostrar ubicacion del APK
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "APK GENERADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
$apkPath = Join-Path $projectPath "android\app\build\outputs\apk\release\app-release.apk"
if (Test-Path $apkPath) {
    $apkSize = (Get-Item $apkPath).Length / 1MB
    Write-Host "Ubicacion del APK:" -ForegroundColor Cyan
    Write-Host "  $apkPath" -ForegroundColor White
    Write-Host ""
    Write-Host "Tamaño: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Este es el archivo que debes compartir con tu cliente." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Para abrir la carpeta, ejecuta:" -ForegroundColor Cyan
    Write-Host "  explorer `"$apkPath`"" -ForegroundColor White
} else {
    Write-Host "  ADVERTENCIA: No se encontro el APK en la ubicacion esperada" -ForegroundColor Yellow
    Write-Host "  Busca en: android\app\build\outputs\apk\release\" -ForegroundColor Gray
}
