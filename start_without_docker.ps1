$ErrorActionPreference = 'Stop'
Set-ExecutionPolicy Bypass -Scope Process

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $rootDir '.env'

if (-not (Test-Path $envFile)) {
  throw "No se encontró .env en la raíz del proyecto."
}

# Se cargan aquí por comodidad y para validarlas antes de iniciar los procesos.
# El backend también las carga automáticamente mediante dotenv.
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$') {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
  }
}

foreach ($name in @('DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET')) {
  if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name, 'Process'))) {
    throw "Falta $name en .env"
  }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue) -or
  -not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw 'Node.js y npm deben estar instalados y disponibles en PATH.'
}

$dbHost = if ($env:DB_HOST) { $env:DB_HOST } else { '127.0.0.1' }
$dbPort = if ($env:DB_PORT) { $env:DB_PORT } else { '3306' }
$env:DB_HOST = $dbHost
$env:DB_PORT = $dbPort

$backendDir = Join-Path $rootDir 'backend'
$webDir = Join-Path $rootDir 'web'

if (-not (Test-Path (Join-Path $backendDir 'node_modules'))) {
  Write-Host 'Instalando dependencias del backend...'
  npm --prefix $backendDir ci
}

if (-not (Test-Path (Join-Path $webDir 'node_modules'))) {
  Write-Host 'Instalando dependencias del frontend...'
  npm --prefix $webDir ci
}

Write-Host 'Ejecutando migraciones...'
node (Join-Path $backendDir 'migrate.js')

$backendProcess = $null
$frontendProcess = $null

try {
  Write-Host "Iniciando API en http://localhost:$($env:PORT)..."
  $backendProcess = Start-Process -FilePath 'node' `
    -ArgumentList (Join-Path $backendDir 'server.js') `
    -WorkingDirectory $rootDir `
    -PassThru

  Write-Host 'Iniciando frontend Vite...'
  $frontendProcess = Start-Process -FilePath 'npm.cmd' `
    -ArgumentList 'run', 'dev' `
    -WorkingDirectory $webDir `
    -PassThru

  Write-Host 'Aplicación disponible en http://localhost:5173'
  Write-Host 'Presioná Ctrl+C para detener ambos procesos.'

  while (-not $backendProcess.HasExited -and -not $frontendProcess.HasExited) {
    Wait-Event -Timeout 1 | Out-Null
  }
}
finally {
  foreach ($process in @($backendProcess, $frontendProcess)) {
    if ($null -ne $process -and -not $process.HasExited) {
      Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
  }
}
