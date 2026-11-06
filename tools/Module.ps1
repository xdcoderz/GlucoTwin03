param(
    [ValidateSet('all','data','replay','backend','ml','dashboard','packaging','docs')]
    [string]$Part = 'all',
    [ValidateSet('Check','Build','Start','Stop')]
    [string]$Action = 'Check',
    [switch]$UseDocker
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    if ($Action -eq 'Check') {
        if ($UseDocker) {
            docker compose -f compose.modules.yaml run --rm --no-deps checks python -B tools/check_modules.py --part $Part
        } else {
            python -B tools/check_modules.py --part $Part
        }
        if ($LASTEXITCODE -ne 0) { throw 'Module checks failed.' }
        return
    }
    if ($Part -eq 'all') { throw 'Choose one module for Build/Start/Stop. Full assembly is scheduled for 2 November.' }
    if ($Part -notin @('replay','backend','ml','dashboard')) { throw "Part '$Part' has no container action. Use Check." }
    if ($Action -eq 'Build') {
        docker compose -f compose.modules.yaml build $Part
    } elseif ($Action -eq 'Stop') {
        if ($Part -eq 'dashboard') { docker compose -f compose.modules.yaml stop dashboard mock-api }
        else { docker compose -f compose.modules.yaml stop $Part }
    } elseif ($Part -eq 'replay') {
        docker compose -f compose.modules.yaml run --build --rm --no-deps replay
    } elseif ($Part -eq 'dashboard') {
        docker compose -f compose.modules.yaml up -d --build --no-deps mock-api dashboard
    } else {
        docker compose -f compose.modules.yaml up -d --build --no-deps $Part
    }
    if ($LASTEXITCODE -ne 0) { throw "Module action failed: $Action $Part" }
} finally {
    Pop-Location
}
