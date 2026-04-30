param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('migrate', 'seed', 'reset', 'reseed', 'all')]
    [string]$Action,

    [string]$DatabaseUrl = $env:DATABASE_URL,
    [string]$PsqlPath = 'psql'
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$schemaFile = Join-Path $scriptDir '001_initial_safety_guardian_schema.sql'
$seedFile = Join-Path $scriptDir '002_seed_test_data.sql'
$resetFile = Join-Path $scriptDir '003_seed_reset.sql'

function Invoke-SqlFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath
    )

    if (-not (Test-Path $FilePath)) {
        throw "SQL file not found: $FilePath"
    }

    Write-Host "Running $([System.IO.Path]::GetFileName($FilePath))..."

    $args = @('-v', 'ON_ERROR_STOP=1', '-f', $FilePath)
    if (-not [string]::IsNullOrWhiteSpace($DatabaseUrl)) {
        $args = @('-d', $DatabaseUrl) + $args
    }

    & $PsqlPath @args

    if ($LASTEXITCODE -ne 0) {
        throw "psql failed for file: $FilePath"
    }
}

try {
    switch ($Action) {
        'migrate' {
            Invoke-SqlFile -FilePath $schemaFile
        }
        'seed' {
            Invoke-SqlFile -FilePath $seedFile
        }
        'reset' {
            Invoke-SqlFile -FilePath $resetFile
        }
        'reseed' {
            Invoke-SqlFile -FilePath $resetFile
            Invoke-SqlFile -FilePath $seedFile
        }
        'all' {
            Invoke-SqlFile -FilePath $schemaFile
            Invoke-SqlFile -FilePath $seedFile
        }
    }

    Write-Host "Completed action: $Action" -ForegroundColor Green
}
catch {
    Write-Error $_
    exit 1
}
