# Build-to-deploy script (archived)
# Creates deploy/github and deploy/netlify from src/ (or falls back to current files)
param()

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $root

Write-Host "Building deploy folders..."

# Helper: load simple .env file into environment (local only, do not commit .env)
function Load-DotEnv($path){
  if(-not (Test-Path $path)) { return }
  Get-Content $path | ForEach-Object {
    $_ = $_.Trim()
    if($_ -eq '' -or $_ -like '#*') { return }
    $pair = $_ -split '=', 2
    if($pair.Count -eq 2){
      $name = $pair[0].Trim()
      $val = $pair[1].Trim()
      if($val.StartsWith("'") -and $val.EndsWith("'")) { $val = $val.Substring(1, $val.Length - 2) }
      elseif($val.StartsWith('"') -and $val.EndsWith('"')) { $val = $val.Substring(1, $val.Length - 2) }
      if($name -and $val){
        [System.Environment]::SetEnvironmentVariable($name, $val, 'Process')
      }
    }
  }
}

# (rest omitted in archive copy)
