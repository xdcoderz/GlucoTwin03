# Assembly checklist: 2 November 2026

Run from the root folder. Complete these gates on assembly day; checkmarks below are intentionally blank until observed. The standalone module project is named `glucotwin-modules`, while the original full demo uses `glucotwin`.

2 November progress: core Docker integration and the workflow were exercised during [Phase 1 Strengthening](PHASE1_STRENGTHENING.md). Only observed gates are checked below. Main-stack ML interruption, restart/PDF acceptance and final packaging remain outstanding.

Later 2 November update: [MVP Acceptance](MVP_ACCEPTANCE.md) records the passing isolated four-service acceptance run, including actual ML outage/recovery, full H2 journal persistence after recreating Spring, and verified dashboard/PDF bindings. The older main-stack checklist below is retained as a separate event-machine/manual checklist; unchecked items are not claims that the isolated acceptance failed.

## 1. Freeze each part

- [x] `python -B tools/check_modules.py` passes (seven module checks; 15 Python tests).
- [x] `mvn -f backend/fusion-api/pom.xml test` passes (22 Java tests).
- [ ] Build all four application images and record any changed dependency versions.
- [ ] Review `contracts/v1.json` on each service boundary.
- [ ] Stop optional module containers: `docker compose -f compose.modules.yaml --profile ml --profile backend --profile dashboard --profile replay stop`.

## 2. Assemble the real services

```powershell
docker compose up --build -d
docker compose ps -a
docker compose logs --tail 100 cgm-publisher
```

- [x] Dashboard, Spring and ML show healthy; one-shot replay exits successfully.
- [x] Both patients contain nine historical readings (future follow-up is separate).
- [ ] Open http://localhost:3000 and request a score for each patient.

```powershell
Invoke-RestMethod http://localhost:8080/api/patients
(Invoke-RestMethod http://localhost:8080/api/patients/DEMO-001/cgm).Count
(Invoke-RestMethod http://localhost:8080/api/patients/DEMO-002/cgm).Count
Invoke-RestMethod -Method Post http://localhost:8080/api/patients/DEMO-001/refresh
Invoke-RestMethod -Method Post http://localhost:8080/api/patients/DEMO-002/refresh
```

Historical reference outputs with the October 30 model/fixtures: approximately 0.367765 and 0.988781. These are expectations to compare with actual model execution, never substitutes for model results.

## 3. Prove failure behavior and idempotency

```powershell
docker compose stop ml-service
Invoke-RestMethod -Method Post http://localhost:8080/api/patients/DEMO-001/refresh
docker compose start ml-service
docker compose ps
```

- [ ] During outage: unavailable, null score and event classification; UI hides the previous result after refresh.
- [ ] Wait for ML to become healthy; refreshing restores a real score.
- [ ] `docker compose run --rm cgm-publisher` delivers duplicate IDs without increasing either reading count.
- [ ] Switching scenarios shows the correct patient's history, score and factors.
- [ ] Anatomy starts at the full body, zooms toward the pancreas, and resets. Its patient snapshot follows the selected patient and available/null prediction state; organ colors remain illustrative.
- [ ] Walk the six tour stops, Previous, Finish, Exit and Restart on the assembled dashboard. Manual organ selection leaves the tour.
- [ ] Download a saved research result after scoring each patient. Verify result ID, original input snapshot/fingerprint, model version/factors, configured meal baseline, issuance versus capture time and unavailable behavior after ML failure.
- [ ] Save a result before replay; verify partial/gapped/complete fictional follow-up, duplicate replay, unknown negative windows and the separate already-high baseline observation. Patient overview history stays nine pre-meal points after follow-up is appended.
- [ ] Verify old saved versions, append/reopen notes, baseline/receipt-time linkage, withheld comparison for retrospective/unavailable results and restart persistence in the assembled H2 volume.

## 4. Final packaging and presentation

- [ ] Refresh the Docker image archive after rebuilding; the October 30 archive predates modularization changes.
- [ ] Compute and record its new SHA-256. Verify `docker image load -i deliverables/glucotwin-images.tar` on the event machine and use `docker compose up -d --no-build`.
- [ ] For a clean-data test, use `docker compose down -v` only after deciding to discard this project's synthetic H2 readings, then start again. Do not use global Docker cleanup.
- [ ] Record current evidence/screenshots and a backup video; update deck text and team names.
- [ ] Review wording: pre-meal inputs, next-120-minute prediction, uncalibrated score, explicitly fictional follow-up and sampled observed outcomes. No claim of real-patient outcome validation or prevention.
- [ ] Rehearse the demo twice; copy current backups to the event machine and USB/cloud.

The existing runbook/deck/screenshots describe the October 30 baseline. Update them after these gates pass; their existence does not prove the November 2 assembly passed.
