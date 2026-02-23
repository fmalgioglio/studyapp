param(
  [Parameter(Mandatory = $true)]
  [string]$Message
)

$ErrorActionPreference = "Stop"

git add -A

if (-not (git diff --cached --quiet)) {
  git commit -m "$Message"
  git push -u origin main
  Write-Host "Pushed to origin/main"
} else {
  Write-Host "No changes to commit."
}
