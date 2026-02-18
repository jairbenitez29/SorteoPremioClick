# Script para generar APK completo después de instalar Android Studio
# Ejecuta este script DESPUES de instalar Android Studio

Write-Host "Generando APK para cliente..." -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
$projectPath = Get-Location
Write-Host "Directorio del proyecto: $projectPath" -ForegroundColor Gray

# Paso 1: Verificar que Android Studio esté instalado
Write-Host "Paso 1: Verificando Android Studio..." -ForegroundColor Yellow
$androidStudioPaths = @(
    "$env:LOCALAPPDATA\Programs\Android\Android Studio",
    "C:\Program Files\Android\Android Studio",
    "C:\Program Files (x86)\Android\Android Studio"
)

$androidStudioFound = $false
foreach ($path in $androidStudioPaths) {
    if (Test-Path $path) {
        Write-Host "  OK: Android Studio encontrado en: $path" -ForegroundColor Green
        $androidStudioFound = $true
        break
    }
}

if (-not $androidStudioFound) {
    Write-Host "  ERROR: Android Studio no encontrado" -ForegroundColor Red
    Write-Host "  Por favor, instala Android Studio primero." -ForegroundColor Yellow
    Write-Host "  Sigue la guia en: GUIA_INSTALAR_ANDROID_STUDIO.md" -ForegroundColor Yellow
    exit 1
}

# Paso 2: Verificar Java
Write-Host ""
Write-Host "Paso 2: Verificando Java..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    Write-Host "  OK: Java encontrado" -ForegroundColor Green
} catch {
    Write-Host "  ADVERTENCIA: Java no encontrado en PATH" -ForegroundColor Yellow
    Write-Host "  Android Studio deberia incluir Java" -ForegroundColor Gray
}

# Paso 3: Prebuild (generar carpetas nativas)
Write-Host ""
Write-Host "Paso 3: Generando carpetas nativas de Android..." -ForegroundColor Yellow
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

# Paso 4: Generar APK
Write-Host ""
Write-Host "Paso 4: Generando APK..." -ForegroundColor Yellow
Write-Host "  Esto puede tardar 10-15 minutos la primera vez..." -ForegroundColor Gray

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

# Paso 5: Mostrar ubicacion del APK
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
} else {
    Write-Host "  ADVERTENCIA: No se encontro el APK en la ubicacion esperada" -ForegroundColor Yellow
    Write-Host "  Busca en: android\app\build\outputs\apk\release\" -ForegroundColor Gray
}
