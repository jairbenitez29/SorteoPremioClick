# Solucion FINAL: Eliminar temporalmente carpetas problemáticas del proyecto
# Esto evita que EAS Build las encuentre en el shallow-clone

Write-Host "Ejecutando: npx eas build --platform android --profile preview" -ForegroundColor Cyan
Write-Host ""

$projectPath = Get-Location
$backupPath = "$env:TEMP\SorteosApp-Backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Force -Path $backupPath | Out-Null

# Carpetas que causan problemas (basado en los errores que has tenido)
$problemFolders = @("imagenes", "backend", "web", "components")

Write-Host "Moviendo carpetas problemáticas temporalmente..." -ForegroundColor Yellow
$movedFolders = @()

foreach ($folder in $problemFolders) {
    $folderPath = Join-Path $projectPath $folder
    if (Test-Path $folderPath) {
        try {
            $destPath = Join-Path $backupPath $folder
            Move-Item -Path $folderPath -Destination $destPath -Force -ErrorAction Stop
            $movedFolders += $folder
            Write-Host "  OK: $folder movido" -ForegroundColor Green
        } catch {
            Write-Host "  ERROR: No se pudo mover $folder" -ForegroundColor Red
        }
    }
}

if ($movedFolders.Count -gt 0) {
    Write-Host ""
    Write-Host "Carpetas movidas: $($movedFolders -join ', ')" -ForegroundColor Green
    Write-Host "Ubicacion de respaldo: $backupPath" -ForegroundColor Gray
}

# Limpiar carpeta temporal de EAS
$easTempPath = "$env:LOCALAPPDATA\Temp\eas-cli-nodejs"
if (Test-Path $easTempPath) {
    Write-Host ""
    Write-Host "Limpiando carpeta temporal de EAS..." -ForegroundColor Yellow
    Remove-Item -Path $easTempPath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  OK: Carpeta temporal limpiada" -ForegroundColor Green
}

# Limpiar cualquier carpeta temporal en C:\Temp
$cTempEas = "C:\Temp\eas-*"
if (Test-Path "C:\Temp") {
    Get-ChildItem -Path "C:\Temp" -Filter "eas-*" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "Ejecutando build..." -ForegroundColor Cyan
Write-Host ""

# Configurar variables
$env:EAS_NO_VCS = "1"

# Ejecutar el build
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

Write-Host ""
Write-Host "Restaurando carpetas..." -ForegroundColor Cyan

# Restaurar carpetas
foreach ($folder in $movedFolders) {
    $sourcePath = Join-Path $backupPath $folder
    $destPath = Join-Path $projectPath $folder
    if (Test-Path $sourcePath) {
        try {
            Move-Item -Path $sourcePath -Destination $destPath -Force -ErrorAction Stop
            Write-Host "  OK: $folder restaurado" -ForegroundColor Green
        } catch {
            Write-Host "  ERROR: No se pudo restaurar $folder" -ForegroundColor Red
            Write-Host "    La carpeta esta en: $sourcePath" -ForegroundColor Yellow
        }
    }
}

# Limpiar backup si esta vacio
if (Test-Path $backupPath) {
    $remaining = Get-ChildItem -Path $backupPath -ErrorAction SilentlyContinue
    if ($null -eq $remaining -or $remaining.Count -eq 0) {
        Remove-Item -Path $backupPath -Force -ErrorAction SilentlyContinue
    } else {
        Write-Host ""
        Write-Host "ADVERTENCIA: Algunas carpetas no se restauraron." -ForegroundColor Yellow
        Write-Host "Revisa: $backupPath" -ForegroundColor Yellow
    }
}

Write-Host ""
if ($buildSuccess) {
    Write-Host "Build completado exitosamente!" -ForegroundColor Green
} else {
    Write-Host "Build fallo." -ForegroundColor Red
    Write-Host ""
    Write-Host "Si el error persiste, esto es un bug conocido de EAS Build en Windows." -ForegroundColor Yellow
    Write-Host "La unica solucion real es usar build local:" -ForegroundColor Yellow
    Write-Host "  npx eas build --platform android --profile preview --local" -ForegroundColor Cyan
}
