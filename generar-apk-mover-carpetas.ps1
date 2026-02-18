# Script para generar APK moviendo temporalmente carpetas problematicas
# Ejecuta este script como Administrador

Write-Host "Generando APK (moviendo carpetas temporalmente)..." -ForegroundColor Cyan
Write-Host ""

$projectPath = Get-Location
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$tempBackupPath = "$env:TEMP\SorteosApp-Backup-$timestamp"

# Crear carpeta de respaldo temporal
New-Item -ItemType Directory -Force -Path $tempBackupPath | Out-Null
Write-Host "Carpeta de respaldo: $tempBackupPath" -ForegroundColor Gray

# Mover carpetas problematicas
$foldersToMove = @("backend", "imagenes", "web")
$movedFolders = @()

foreach ($folder in $foldersToMove) {
    $folderPath = Join-Path $projectPath $folder
    if (Test-Path $folderPath) {
        Write-Host "Moviendo $folder..." -ForegroundColor Yellow
        try {
            $destPath = Join-Path $tempBackupPath $folder
            Move-Item -Path $folderPath -Destination $destPath -Force -ErrorAction Stop
            $movedFolders += $folder
            Write-Host "  OK: $folder movido" -ForegroundColor Green
        } catch {
            Write-Host "  ERROR: No se pudo mover $folder : $_" -ForegroundColor Red
        }
    }
}

if ($movedFolders.Count -eq 0) {
    Write-Host "ADVERTENCIA: No se movieron carpetas" -ForegroundColor Yellow
} else {
    Write-Host ""
    $foldersList = $movedFolders -join ', '
    Write-Host "Carpetas movidas: $foldersList" -ForegroundColor Green
}

# Limpiar carpeta temporal de EAS
$easTempPath = "$env:LOCALAPPDATA\Temp\eas-cli-nodejs"
if (Test-Path $easTempPath) {
    Write-Host ""
    Write-Host "Limpiando carpeta temporal de EAS..." -ForegroundColor Yellow
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

# Ejecutar EAS Build
$buildSuccess = $false
try {
    $env:EAS_NO_VCS = "1"
    npx eas build --platform android --profile preview
    if ($LASTEXITCODE -eq 0) {
        $buildSuccess = $true
    }
} catch {
    Write-Host ""
    Write-Host "ERROR durante el build: $_" -ForegroundColor Red
    $buildSuccess = $false
}

Write-Host ""
Write-Host "Restaurando carpetas..." -ForegroundColor Cyan

# Restaurar carpetas movidas
foreach ($folder in $movedFolders) {
    $sourcePath = Join-Path $tempBackupPath $folder
    $destPath = Join-Path $projectPath $folder
    if (Test-Path $sourcePath) {
        try {
            Move-Item -Path $sourcePath -Destination $destPath -Force -ErrorAction Stop
            Write-Host "  OK: $folder restaurado" -ForegroundColor Green
        } catch {
            Write-Host "  ERROR: Error al restaurar $folder : $_" -ForegroundColor Red
            Write-Host "     La carpeta esta en: $sourcePath" -ForegroundColor Yellow
        }
    }
}

# Eliminar carpeta de respaldo si esta vacia
if (Test-Path $tempBackupPath) {
    try {
        $remainingItems = Get-ChildItem -Path $tempBackupPath -ErrorAction SilentlyContinue
        if ($null -eq $remainingItems -or $remainingItems.Count -eq 0) {
            Remove-Item -Path $tempBackupPath -Force -ErrorAction SilentlyContinue
        } else {
            Write-Host ""
            Write-Host "ADVERTENCIA: Algunas carpetas no se restauraron. Revisa: $tempBackupPath" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ADVERTENCIA: No se pudo eliminar carpeta de respaldo: $tempBackupPath" -ForegroundColor Yellow
    }
}

Write-Host ""
if ($buildSuccess) {
    Write-Host "Build completado exitosamente" -ForegroundColor Green
} else {
    Write-Host "Build fallo. Revisa los errores arriba." -ForegroundColor Red
}
