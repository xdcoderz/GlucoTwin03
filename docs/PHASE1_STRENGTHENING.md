# Phase 1: stronger workflow and backend

Updated 2 November 2026. Open the assembled app at **http://localhost:3000**. The development view at **http://127.0.0.1:5175** now uses the same Spring API on port 8080. Docker Desktop must remain running.

## The flow

1. **Patient twin:** select a synthetic patient, inspect the recorded glucose timeline, and explore the 3D body. The body stays the main visual.
2. **Check & score:** inspect all nine required pre-meal times. Missing/conflicting inputs are identified. The API supplies readiness; a reading count alone is insufficient. Request a model score and save its immutable snapshot.
3. **Follow-up:** use the clearly fictional replay stages to demonstrate received samples. A missing sample cannot establish a negative outcome.
4. **Review & export:** inspect the original result, coverage and observed outcome; save a local review note. Existing PDFs remain tied to Phase 1 records.

The section links jump directly between these areas. The four-step guide marks recorded progress and suggests the next action. Completing this workflow does not mean that a patient is safe or that the model is clinically validated.

## Visual improvements

- Nine-slot history strip: exact time, receipt/missing/conflict state and glucose value.
- Model-ready/offline badge with a bounded backend health probe; real scoring can still fail after a successful probe.
- Separate replay baseline and wall-clock ingestion timestamps. Legacy readings without receipt metadata remain explicitly unknown.
- A zero-to-one score bar with the fixed 0.50 research threshold, labelled as an uncalibrated score. It is not a calibrated probability or clinical risk meter.
- Progress rails animate when a step becomes complete; scoring feedback pulses while a request is pending. Button feedback is brief. Reduced-motion settings remove these animations.
- **Animate glucose overlay** animates the illustrative 3D pathways without advancing the selected sample. **Pause overlay motion** stops it. Replay retains its separate controls. Path speed does not represent measured physiology.
- The dashboard keeps the loaded patient and unsaved review draft during a brief overview-API outage. A visible warning appears, writes are disabled, and polling/retry can restore the connection.
- Saved scores whose input snapshot differs from current input receive an explicit warning.

## Backend changes

### Read-only readiness

`GET /api/patients/{id}/readiness` reports history slots, quality issues, ingestion timestamp, model health, latest result/review state and suggested next action. It does not request a score or create a journal entry. Contract: [readiness-v1.json](../contracts/readiness-v1.json).

The model health client uses one-second connect/read timeouts and a five-second cache. A health failure says unavailable. No synthetic score is inserted. The existing model call retains its bounded timeout and unavailable result behavior.

### Strict event identity

A duplicate event ID is ignored only if its patient, timestamp, glucose value and source match the original. Reusing an ID with changed content returns **409 Conflict** and preserves the original. A database failure without a matching existing event is no longer misreported as a duplicate.

Both HTTP input and internal replay enforce finite glucose values from 40 to 500 mg/dL. Event/source lengths are bounded to their storage fields. These are the existing demo transport limits, not clinical safety limits. The raw CGM endpoint now includes stored `receivedAt` metadata.

### Model-response checks

Spring checks the score range, 120-minute horizon, fixed 0.50 threshold, consistent event flag, nonblank model version and valid finite factor contributions/directions. Invalid responses are saved as unavailable.

FastAPI rejects non-finite supplied feature values before inference, checks finite score/contribution output, and returns only validation field locations/types. Validation messages no longer log or echo the rejected feature values.

### Frontend resilience

Overview and journal polling wait for one request cycle to finish before scheduling the next. Requests have timeouts. A slow request therefore cannot be perpetually displaced by the next timer tick. Patient-switch guards remain in place. Scoring is gated by backend history readiness; unavailable model attempts can still be explicitly saved.

The Python module preview implements the same readiness shape but always reports model unavailable. Its raw CGM route now includes fictional follow-up samples as well as pre-meal history. It is still memory-only and performs no inference.

## Observed verification

| Check | Result |
|---|---|
| Java tests | 22 passed: five feature-builder cases and 17 journal/API cases, including the four new hardening cases |
| Python suite | 15 passed |
| New/affected browser checks | Nine passed: six twin tests and three Phase 1 flow tests |
| Production build | TypeScript and Vite passed; all four Docker images built |
| Assembled stack | Dashboard, Spring and fitted ML healthy; deterministic publisher exits successfully |
| Actual model outputs | DEMO-001: 0.3677653238267805; DEMO-002: 0.9887812722077698; version shanghai-logistic-v1; five factors each |
| Real workflow | DEMO-001: seven samples left outcome unknown; eight completed the fictional sampled outcome; review saved; original snapshot and 142 mg/dL baseline preserved |
| Isolated unavailable-model check | Separate in-memory Spring instance pointed at an unreachable ML endpoint: unavailable/null result saved, history readiness remained true |
| ML boundary | Loaded verified artifact; non-finite input rejected; validation response omitted test input value |
| Production UI | Actual scores displayed, score refresh worked, desktop/mobile screenshots reviewed, no page errors, no 400px overflow, reduced-motion control disabled as expected |

Machine-readable workflow evidence: [integration result](research/phase1_integration_2026-11-02.json).

The first immediate reduced-motion check ran before React processed the browser preference event; the condition-based check passed. A successful build retains the existing large-bundle warning and does not establish hardware animation performance.

## Still pending

Later acceptance update: [MVP Acceptance](MVP_ACCEPTANCE.md) records a fresh-volume, real four-service run that passed model stop/recovery, Spring recreation persistence and bound available/unavailable PDF verification. The original demo stack was not interrupted for its outage test. The older pending notes below describe the state before that acceptance run.

- Main-stack model stop/recovery test: automatic approval review blocked stopping the running ML container, giving only “blocked by policy.” The isolated unavailable check above avoids disrupting it; it is not the same recovery test.
- Recheck assembled H2 persistence after a stack restart and match assembled saved-result PDF contents. Earlier native H2/PDF checks are separate evidence.
- Complete event-machine acceptance, updated image archive, backup video and rehearsal.
- No new model training, calibration, clinical validation, organ-function estimation or Phase 2 medical capability is claimed.

Screenshots: [working flow](screenshots/phase1_live_flow_desktop.png), [mobile flow](screenshots/phase1_live_flow_mobile.png), [real score](screenshots/phase1_live_score_desktop.png), [3D view](screenshots/phase1_live_twin_desktop.png).
