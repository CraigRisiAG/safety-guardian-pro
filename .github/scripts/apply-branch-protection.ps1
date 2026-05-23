param(
  [Parameter(Mandatory = $false)]
  [string]$Owner = "CraigRisiAG",

  [Parameter(Mandatory = $false)]
  [string]$Repo = "safety-guardian-pro",

  [Parameter(Mandatory = $false)]
  [string]$Branch = "main"
)

if (-not $env:GITHUB_TOKEN) {
  throw "GITHUB_TOKEN environment variable is required."
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$payloadPath = Join-Path $scriptRoot "..\branch-protection\main-protection.json"
$payload = Get-Content -Raw -Path $payloadPath

$headers = @{
  Authorization = "Bearer $($env:GITHUB_TOKEN)"
  Accept        = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
}

$uri = "https://api.github.com/repos/$Owner/$Repo/branches/$Branch/protection"

Write-Host "Applying branch protection to $Owner/$Repo:$Branch"
Invoke-RestMethod -Method Put -Uri $uri -Headers $headers -Body $payload -ContentType "application/json"
Write-Host "Branch protection applied successfully."
