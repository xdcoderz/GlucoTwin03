# GlucoTwin modular build: prepare now, assemble 2 November 2026

This module plan supports **Phase 1** of [Our Two Phases](PROJECT_PHASES.md). Phase 2 is a separately labelled simulated future vision. Track both in the [Phase Checklist](PHASE_CHECKLIST.md); mock screens do not complete the assembly gates below.

The current integrated implementation is preserved. Work is now organized as seven modules in their existing folders; copying the code into seven separate projects would create version drift. A source checkpoint exists at `deliverables/checkpoints/before_module_split_2026-11-01.zip`. The October 30 images and deliverables remain a historical baseline.

"90%" is a planning checkpoint: implementation and independent verification are prepared; final cross-service acceptance and presentation approval remain for 2 November. It is not a measured percentage of lines or a claim that all runtime checks have passed today. The original `compose.yaml` remains the assembly configuration. `compose.modules.yaml` is an independent development project with separate ports, images, and H2 volume.

## Seven parts

**Dashboard extension:** Part 5 now includes the independent interactive body/organ viewer described in `ANATOMY_VIEW.md`. It uses the same patient context and keeps anatomy education distinct from inference. Browser checks are recorded in `ANATOMY_QA.md`; final real-backend acceptance remains an assembly-day gate.

**Node 1 research extension:** `research/README.md` documents explicit local validation for permitted, de-identified real-derived files. Public demo loading is unchanged. Research inference, evaluation and UI integration remain separate work; the earlier handbook describes the synthetic-demo baseline.

| Part | Source and prepared work | Independent check | Reserved for assembly day |
|---|---|---|---|
| 1. Data | `data/sample`: two synthetic profiles, meals, nine pre-meal readings; duplicate Spring resource copies checked for equality | `Module.ps1 -Part data` | Confirm profiles and baseline times through actual API/UI |
| 2. Replay | `cgm-publisher`: pure event generation, validation, stable IDs, dry-run mode | `Module.ps1 -Part replay`; replay unit tests | Real HTTP delivery, deduplication, replay after restart |
| 3. Backend/H2 | `backend/fusion-api`: patient endpoints, CGM, fixed-baseline feature construction, prediction client and durable prediction/review journal | 18 Maven tests; native file-H2 restart preserves saved inputs/results/notes | Actual fitted-model call, assembled volume/restart, unavailable/recovery behavior |
| 4. ML | `ml-service`: fitted pipeline, hash/version/schema validation, inference and factors | `Module.ps1 -Part ml` checks hash and schema without loading model; optional isolated container at port 18000 | Load and execute fitted model, reject malformed inputs, compare real scores |
| 5. Dashboard | `frontend/dashboard`: overview, worklist, outcome/review journal, anatomy/tour and version-bound PDF; memory-only fixture API at `tools/preview_api.py` | 11 browser scenarios; native Spring/H2 preview at 5175; optional isolated dashboard at 13000 | Actual fitted scores/factors in journal and PDFs; final assembled interaction checks |
| 6. Packaging | `compose.modules.yaml`, module commands, original assembly Compose, source checkpoint | Compose config validation; builds per module | Full startup, health gates, clean-data run and offline load/restart |
| 7. Docs/pitch | Existing docs/deck/runbook plus this plan, frozen contract, assembly checklist | Check guide files and paths exist; review changes against implementation | Final wording, team names, current screenshots, video and rehearsal |

## One command for independent checks

From PowerShell in the project root:

```powershell
.\tools\Module.ps1
.\tools\Module.ps1 -Part replay -Action Check
```

The default is read-only local checks using Python 3, including standard-library unit tests. It does not start the application. Python is optional when Docker is available:

```powershell
.\tools\Module.ps1 -UseDocker
```

Docker-based commands require Docker Desktop's Linux engine. Native backend checks require JDK 21+ and Maven; frontend builds require a supported Node/npm installation, or use the container build.

```powershell
mvn -f backend/fusion-api/pom.xml test
.\tools\Module.ps1 -Part ml -Action Build
.\tools\Module.ps1 -Part backend -Action Build
.\tools\Module.ps1 -Part dashboard -Action Build
.\tools\Module.ps1 -Part replay -Action Build
```

## Start one module, without assembling the project

```powershell
.\tools\Module.ps1 -Part ml -Action Start
# http://localhost:18000/health (inspect model_loaded, not just status)

.\tools\Module.ps1 -Part backend -Action Start
# http://localhost:18080/api/patients
# No publisher starts. No ML starts automatically. Scores can be unavailable.

.\tools\Module.ps1 -Part replay -Action Start
# Prints 18 validated events and exits; does not deliver them.

.\tools\Module.ps1 -Part dashboard -Action Start
# http://localhost:13000; fixture preview API uses port 18081.
# All preview scores are unavailable. Preview never loads or simulates a model.
```

Stop the selected long-running module using the same command with `-Action Stop`. Dashboard stop also stops its preview API. The module runner rejects `-Part all` for Build/Start/Stop to keep module actions explicit.

For a native dashboard build: `npm --prefix frontend/dashboard ci`, then `npm --prefix frontend/dashboard run build`. The checked-in npm lockfile fixes the resolved frontend dependencies; its Dockerfile also uses `npm ci`. Preview API can run natively with `python tools/preview_api.py`; it binds to localhost by default. Docker preview binds inside its container and publishes only to localhost. Its patient display names say PREVIEW ONLY and scores remain unavailable.

On this Windows machine, Java initially could not validate the Maven repository certificate using its default trust store. The tests were run with the system's Windows root certificate store for that command only, leaving certificate validation enabled:

```powershell
$savedMavenOpts = $env:MAVEN_OPTS
try {
  $env:MAVEN_OPTS = "$savedMavenOpts -Djavax.net.ssl.trustStoreType=Windows-ROOT -Djavax.net.ssl.trustStore=NONE"
  mvn -B -f backend/fusion-api/pom.xml test
} finally { $env:MAVEN_OPTS = $savedMavenOpts }
```

For Node 24 behind the same local certificate interception, set `NODE_OPTIONS` to include `--use-system-ca` for the npm command and restore it afterward. Do not turn off TLS verification.

## Frozen handoff contract

`contracts/v1.json` records patient IDs, exact 43 feature names/order, CGM fields, Spring prediction fields/statuses, horizon, threshold, and ownership. Treat a change here as a coordinated change for both sides of the interface. FastAPI's raw result does not need a `reason` on success; Spring serializes the full prediction shape including nullable fields.

Readings span minus 120 minutes through the meal-time baseline. The latest reading is the current prediction baseline. Only the following 120-minute outcome is predicted; future outcomes are not present in either fixture. `predicted_event` is a model threshold classification, not a measured future event. H2 persists CGM readings; predictions are currently held in memory and require an explicit refresh after restart.

## Verification status

The November 1 check report is in `docs/MODULE_CHECK_RESULTS.md`. Independent source checks are distinct from service builds, model execution, browser checks, and integrated acceptance. Final assembly uses `docs/ASSEMBLY_NOV_2.md`.
