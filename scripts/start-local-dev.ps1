$ErrorActionPreference = "Stop"

$turbopackCachePath = Join-Path (Get-Location) ".next\\dev\\cache\\turbopack"
$schemaPath = Join-Path (Get-Location) "prisma\\schema.prisma"
$generatedClientPath = Join-Path (Get-Location) "src\\generated\\prisma\\client.ts"

function Get-PrismaDevPort {
  $envText = Get-Content ".env" -Raw
  $match = [regex]::Match($envText, 'DATABASE_URL\s*=\s*"prisma\+postgres://localhost:(\d+)/')
  if ($match.Success) {
    return [int]$match.Groups[1].Value
  }

  return 51213
}

function Test-PortListening {
  param([int]$Port)

  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $iar = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
    $connected = $iar.AsyncWaitHandle.WaitOne(400)
    if (-not $connected) {
      $client.Close()
      return $false
    }
    $client.EndConnect($iar)
    $client.Close()
    return $true
  } catch {
    return $false
  }
}

function Ensure-PrismaClientFresh {
  $shouldGenerate = $false

  if (-not (Test-Path $generatedClientPath)) {
    $shouldGenerate = $true
  } elseif ((Get-Item $schemaPath).LastWriteTimeUtc -gt (Get-Item $generatedClientPath).LastWriteTimeUtc) {
    $shouldGenerate = $true
  }

  if (-not $shouldGenerate) {
    return
  }

  Write-Host "Prisma schema changed. Regenerating client..."
  cmd.exe /c "npx prisma generate > prisma-generate.log 2>&1"
  if ($LASTEXITCODE -ne 0) {
    throw "Prisma client generation failed. Check prisma-generate.log."
  }
}

$prismaPort = Get-PrismaDevPort
Ensure-PrismaClientFresh

if (-not (Test-PortListening -Port $prismaPort)) {
  Write-Host "Starting prisma dev on port $prismaPort..."
  Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npx prisma dev > prisma-dev.log 2>&1" -WorkingDirectory (Get-Location)

  $started = $false
  for ($attempt = 0; $attempt -lt 40; $attempt++) {
    Start-Sleep -Milliseconds 500
    if (Test-PortListening -Port $prismaPort) {
      $started = $true
      break
    }
  }

  if (-not $started) {
    throw "Prisma dev did not start on port $prismaPort. Check prisma-dev.log."
  }
}

Write-Host "Canonical local origin: http://localhost:3000"
Write-Host "No Python or venv is required for the StudyApp local flow."
Write-Host "If DEV_BOOTSTRAP_ENABLED=true, use the Enter dev app button on / or /login."
if (Test-Path $turbopackCachePath) {
  Write-Host "Resetting stale Turbopack dev cache..."
  Remove-Item -Recurse -Force $turbopackCachePath
}
Write-Host "Starting Next dev server with loopback access on port 3000..."
npx next dev --hostname :: -p 3000
