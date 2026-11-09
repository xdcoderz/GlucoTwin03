<# Run one component per PowerShell terminal; does not install software or delete records. #>
[CmdletBinding()]
param(
    [ValidateSet('Check','Build','Model','Backend','Replay','Dashboard')]
    [string]$Component = 'Check',
    [ValidateRange(1024,65535)][int]$ModelPort = 8000,
    [ValidateRange(1024,65535)][int]$BackendPort = 8080,
    [ValidateRange(1024,65535)][int]$DashboardPort = 5173,
    [ValidatePattern('^[A-Za-z0-9-]+$')][string]$DatabaseName = 'local-demo',
    [string]$PythonPath,
    [string]$MavenPath
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent

function Get-DemoPython {
    if ($PythonPath) { return (Get-Item -LiteralPath $PythonPath).FullName }
    # Reuse a project environment, including an ancestor when using an isolated checkout.
    $folder = Get-Item -LiteralPath $repo
    while ($folder) {
        $candidate = Join-Path $folder.FullName '.venv/Scripts/python.exe'
        if (Test-Path -LiteralPath $candidate) { return $candidate }
        $folder = $folder.Parent
    }
    return (Get-Command python -ErrorAction Stop).Source
}

function Get-DemoMaven {
    if ($MavenPath) { return (Get-Item -LiteralPath $MavenPath).FullName }
    $installed = Get-Command mvn.cmd -ErrorAction SilentlyContinue
    if ($installed) { return $installed.Source }
    $cache = Join-Path $env:USERPROFILE '.m2/wrapper/dists'
    if (Test-Path -LiteralPath $cache) {
        $cached = Get-ChildItem -LiteralPath $cache -Filter mvn.cmd -File -Recurse |
            Sort-Object { if ($_.FullName -match 'apache-maven-(\d+\.\d+\.\d+)') { [version]$Matches[1] } else { [version]'0.0.0' } } -Descending |
            Select-Object -First 1
        if ($cached) { return $cached.FullName }
    }
    throw 'Maven was not found. Supply -MavenPath or install Apache Maven; no software was installed by this script.'
}

function Wait-DemoBackend {
    $clock = [Diagnostics.Stopwatch]::StartNew()
    while ($clock.Elapsed.TotalSeconds -lt 60) {
        try {
            $ready = Invoke-RestMethod "http://127.0.0.1:$BackendPort/actuator/health/readiness" -TimeoutSec 3
            if ($ready.status -eq 'UP') { return }
        } catch { }
        Start-Sleep -Milliseconds 500
    }
    throw 'Backend did not become ready within 60 seconds. Start Backend first; no replay was sent by this call.'
}

Push-Location -LiteralPath $repo
try {
    switch ($Component) {
        'Build' {
            $maven = Get-DemoMaven
            & $maven -B -ntp -f backend/fusion-api/pom.xml package
            if ($LASTEXITCODE -ne 0) { throw 'Backend build or tests failed.' }
        }
        'Model' {
            $python = Get-DemoPython
            $env:MODEL_PATH = (Resolve-Path 'ml-service/app/artifacts/logistic_regression.joblib').Path
            $env:MODEL_METADATA_PATH = (Resolve-Path 'ml-service/app/artifacts/model_metadata.json').Path
            & $python -m uvicorn app.main:app --app-dir ml-service --host 127.0.0.1 --port $ModelPort
            if ($LASTEXITCODE -ne 0) { throw 'Model service stopped with an error. Check ml-service/requirements.txt in the selected Python environment.' }
        }
        'Backend' {
            $jar = Join-Path $repo 'backend/fusion-api/target/fusion-api-0.1.0.jar'
            if (!(Test-Path -LiteralPath $jar)) { throw 'Build the backend first: ./tools/Local-Demo.ps1 -Component Build' }
            New-Item -ItemType Directory -Path runtime-data -Force | Out-Null
            $env:ML_SERVICE_URL = "http://127.0.0.1:$ModelPort"
            $env:SPRING_DATASOURCE_URL = "jdbc:h2:file:./runtime-data/$DatabaseName;DB_CLOSE_ON_EXIT=FALSE"
            $env:SIMULATED_MEAL_TIME = '2026-10-30T12:00:00Z'
            & java -jar $jar --server.address=127.0.0.1 "--server.port=$BackendPort"
            if ($LASTEXITCODE -ne 0) { throw 'Backend stopped with an error.' }
        }
        'Replay' {
            $python = Get-DemoPython
            Wait-DemoBackend
            $env:SPRING_API_URL = "http://127.0.0.1:$BackendPort/api/cgm/events"
            $env:SIMULATED_MEAL_TIME = '2026-10-30T12:00:00+00:00'
            $env:REPLAY_INTERVAL_SECONDS = '0.15'
            & $python cgm-publisher/app.py --fixture data/sample/demo_patient_001.json --fixture data/sample/demo_patient_002.json
            if ($LASTEXITCODE -ne 0) { throw 'Synthetic replay failed.' }
        }
        'Dashboard' {
            $vite = Join-Path $repo 'frontend/dashboard/node_modules/vite/bin/vite.js'
            if (!(Test-Path -LiteralPath $vite)) { throw 'Install dashboard dependencies with npm ci in frontend/dashboard first.' }
            $env:VITE_PROXY_TARGET = "http://127.0.0.1:$BackendPort"
            $env:VITE_API_BASE_URL = ''
            Push-Location frontend/dashboard
            try { & node $vite --host 127.0.0.1 --port $DashboardPort --strictPort }
            finally { Pop-Location }
            if ($LASTEXITCODE -ne 0) { throw 'Dashboard stopped with an error.' }
        }
        'Check' {
            $model = Invoke-RestMethod "http://127.0.0.1:$ModelPort/health" -TimeoutSec 10
            $backend = Invoke-RestMethod "http://127.0.0.1:$BackendPort/actuator/health/readiness" -TimeoutSec 10
            if ($model.model_loaded -ne $true -or $backend.status -ne 'UP') { throw 'Services responded, but model/backend readiness failed.' }
            Write-Output "Backend UP; model loaded: $($model.model_version). Checking both synthetic histories."
            foreach ($id in @('DEMO-001','DEMO-002')) {
                $ready = Invoke-RestMethod "http://127.0.0.1:$BackendPort/api/patients/$id/readiness" -TimeoutSec 10
                Write-Output "$id : $($ready.receivedExpectedSamples)/$($ready.expectedSamples) input samples; model $($ready.model.status)"
                if (!$ready.historyReady -or $ready.model.status -ne 'ready') { throw "$id is not ready. Run Replay and check the model service." }
            }
            $proxied = Invoke-RestMethod "http://127.0.0.1:$DashboardPort/api/patients/DEMO-001/readiness" -TimeoutSec 10
            if ($proxied.model.status -ne 'ready' -or $proxied.model.modelVersion -ne $model.model_version) { throw 'The dashboard route is not reaching the ready fitted-model stack. Check its proxy target.' }
            Write-Output "Dashboard-to-backend route reaches the ready model. Open http://127.0.0.1:$DashboardPort/?patient=DEMO-001#workspace"
        }
    }
}
finally { Pop-Location }
