$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:3000"
$loopbackUrl = "http://127.0.0.1:3000"

Write-Host "Checking health endpoint..."
$health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method GET
if (-not $health) {
  throw "Health endpoint returned no payload."
}

Write-Host "Checking login shell..."
$loginStatus = curl.exe -s -o NUL -w "%{http_code}" "$baseUrl/login"
if ($loginStatus -ne "200") {
  throw "Login page did not return 200."
}

Write-Host "Checking loopback canonical redirect..."
$loopbackStatus = curl.exe -s -o NUL -w "%{http_code}" "$loopbackUrl/planner" 2>$null
if ($loopbackStatus -ne "307" -and $loopbackStatus -ne "308" -and $loopbackStatus -ne "000") {
  throw "Expected loopback redirect or refusal on 127.0.0.1."
}

Write-Host "Smoke checks passed."
