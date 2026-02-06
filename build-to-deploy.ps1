# Build-to-deploy script
# Creates deploy/github and deploy/netlify from src/ (or falls back to current files)
param()

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $root

Write-Host "Building deploy folders..."

# Ensure src exists and seed templates from existing index.html if missing
if (-not (Test-Path src)) { New-Item -ItemType Directory -Path src | Out-Null }

if (-not (Test-Path src\index.github.html)) {
  if (Test-Path index.html) { Copy-Item index.html src\index.github.html -Force }
}
if (-not (Test-Path src\index.netlify.html)) {
  if (Test-Path index.html) { Copy-Item index.html src\index.netlify.html -Force }
}

# Copy common assets and style into src if not present
if (-not (Test-Path src\style.css) -and (Test-Path style.css)) { Copy-Item style.css src\style.css -Force }

if (Test-Path assets) {
  if (Test-Path src\assets) { Remove-Item src\assets -Recurse -Force }
  Copy-Item assets src\assets -Recurse -Force
}

# Create deploy folders
$deployGithub = "deploy\github"
$deployNetlify = "deploy\netlify"

if (Test-Path $deployGithub) { Remove-Item $deployGithub -Recurse -Force }
if (Test-Path $deployNetlify) { Remove-Item $deployNetlify -Recurse -Force }

New-Item -ItemType Directory -Path $deployGithub | Out-Null
New-Item -ItemType Directory -Path $deployNetlify | Out-Null

# Copy files for GitHub
if (Test-Path src\index.github.html) { Copy-Item src\index.github.html $deployGithub\index.html -Force }
elseif (Test-Path index.html) { Copy-Item index.html $deployGithub\index.html -Force }

if (Test-Path src\style.css) { Copy-Item src\style.css $deployGithub\style.css -Force }
if (Test-Path src\assets) { Copy-Item src\assets $deployGithub\assets -Recurse -Force }

# Copy files for Netlify
if (Test-Path src\index.netlify.html) { Copy-Item src\index.netlify.html $deployNetlify\index.html -Force }
elseif (Test-Path index.html) { Copy-Item index.html $deployNetlify\index.html -Force }

if (Test-Path src\style.css) { Copy-Item src\style.css $deployNetlify\style.css -Force }
if (Test-Path src\assets) { Copy-Item src\assets $deployNetlify\assets -Recurse -Force }

Write-Host "Done. deploy/github and deploy/netlify created."
Write-Host "Files in deploy/github:`n"; Get-ChildItem $deployGithub -Recurse | Select-Object FullName, Length
Write-Host "Files in deploy/netlify:`n"; Get-ChildItem $deployNetlify -Recurse | Select-Object FullName, Length
