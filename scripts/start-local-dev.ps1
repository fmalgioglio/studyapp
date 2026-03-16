$ErrorActionPreference = "Stop"

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

$prismaPort = Get-PrismaDevPort

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

Write-Host "Starting Next dev server on localhost:3000..."
npx next dev --hostname localhost -p 3000
