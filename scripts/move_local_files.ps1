<#
.SYNOPSIS
  Move local-only files and folders into `nogadanews_local/` for archival.

USAGE
  -DryRun (default): shows what would be moved.
  -Execute : actually perform the move.

This script is cautious: it will not move `node_modules` unless you pass `-IncludeNodeModules`.
#>

[CmdletBinding()]
param(
    [switch]$Execute,
    [switch]$IncludeNodeModules
)

$root = Resolve-Path ".." -Relative | ForEach-Object { Join-Path $_ "nogadanews" }
if(-not (Test-Path "nogadanews_local")){
    New-Item -ItemType Directory -Path "nogadanews_local" | Out-Null
}

# Items to consider
$items = @(
    'deploy',
    'dev',
    'logs',
    'build-to-deploy.ps1',
    'article.tmp.json'
)

if($IncludeNodeModules){ $items += 'node_modules' }

Write-Host "Will process the following items:" -ForegroundColor Cyan
$items | ForEach-Object { Write-Host " - $_" }

foreach($item in $items){
    if(Test-Path $item){
        $dest = Join-Path 'nogadanews_local' $item
        if($Execute){
            Write-Host "Moving '$item' -> '$dest'" -ForegroundColor Yellow
            Move-Item -Path $item -Destination $dest -Force
        } else {
            Write-Host "Would move: '$item' -> '$dest'" -ForegroundColor Green
        }
    } else {
        Write-Host "Not found: $item" -ForegroundColor DarkGray
    }
}

Write-Host "Done. To actually move run: .\scripts\move_local_files.ps1 -Execute`nAdd -IncludeNodeModules to include node_modules (cautious)." -ForegroundColor Cyan
