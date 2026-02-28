param(
  [Parameter(Mandatory = $true)]
  [string]$Message,
  [switch]$IncludeDocs,
  [switch]$IncludePublicAssets
)

$ErrorActionPreference = "Stop"

$corePathspecs = @(
  "src",
  "prisma/schema.prisma",
  "prisma/migrations",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "next.config.ts",
  "next.config.mjs",
  "next.config.js",
  "postcss.config.mjs",
  "eslint.config.mjs",
  "scripts/end-session.ps1",
  ".prettierrc",
  ".prettierrc.json",
  "README.md",
  "public/mascots/LICENSE.txt"
)

if ($IncludeDocs) {
  $corePathspecs += "docs"
  $corePathspecs += "README.dev.md"
}

if ($IncludePublicAssets) {
  $corePathspecs += "public"
}

# Reset index so we only stage curated paths, never accidental local files.
git reset --quiet

foreach ($pathspec in $corePathspecs) {
  if (Test-Path $pathspec) {
    git add -- $pathspec 2>$null
  }
}

# Extra guard for sensitive/local data if ever tracked by mistake.
$blockedPaths = @(
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test",
  "prisma/dev.db",
  "prisma/dev.db-journal"
)

foreach ($blocked in $blockedPaths) {
  git reset --quiet -- $blocked 2>$null
}

$stagedFiles = git diff --cached --name-only

if (-not [string]::IsNullOrWhiteSpace($stagedFiles)) {
  Write-Host "Staged core files:"
  Write-Host $stagedFiles
  git commit -m "$Message"
  git push -u origin main
  Write-Host "Pushed to origin/main"
} else {
  Write-Host "No core changes to commit."
}
