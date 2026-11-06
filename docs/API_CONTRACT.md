# API Contract

The routes below match the implemented local prototype. The FastAPI model service remains internal to the Compose network.

## Custom meal what-if input (3 November)

`POST /api/patients/{id}/meal-simulations` accepts `description`, `categories`, `portionGrams` and `minutesSincePreviousMeal`. It runs the fitted model on a new meal with the fixed synthetic baseline/history, then saves an immutable simulation in its own H2 table. It does not replace the original recorded meal or its journal. `GET` on the same route lists the latest 20 simulations for that patient.

See [Meal simulator](MEAL_SIMULATOR.md) for the request/response schema, validation limits, exact feature overrides, score-context 3D behavior and the distinction between a what-if and an actual intake log.

For the modular handoff, `contracts/v1.json` freezes the shared fields and feature order. Independent development ports and preview routes are documented in `MODULE_PLAN.md`; the dashboard preview always returns an unavailable/null score. Final service-to-service acceptance is scheduled for 2 November.

## CGM ingestion (Spring Boot)

`POST /api/cgm/events`

Request:
```json
{
  "patientId": "DEMO-001",
  "eventId": "DEMO-001-0001",
  "observedAt": "2026-10-30T10:00:00Z",
  "glucoseMgDl": 142,
  "source": "synthetic-cgm-replay"
}
```

Spring stores each event once. A repeated `eventId` is an idempotent duplicate only when patient, observation timestamp, glucose and source match. Changed content under the same ID returns HTTP 409 and preserves the original. Event IDs are limited to 120 characters; patient IDs and sources to 80. Glucose must be finite and within the existing 40–500 mg/dL transport limits.

## Patient workflow readiness

`GET /api/patients/{id}/readiness` is read-only. It reports the nine exact history slots, missing/conflicting data, model readiness, latest receipt timestamp, saved attempt/review state and suggested next action. It never requests a prediction. See [readiness-v1.json](../contracts/readiness-v1.json) and [Phase 1 Strengthening](PHASE1_STRENGTHENING.md). The raw `/cgm` route includes stored `receivedAt`; older null timestamps are not invented.

## ML service (FastAPI), internal only

`POST /predict`

Request contains all 43 numeric feature names and values documented in `FEATURE_DICTIONARY.md` and `model_metadata.json`, plus the fixed horizon. The implementation must reject missing or unexpected feature names; an abbreviated single-feature request is not scoreable.

Response:
```json
{
  "status": "available",
  "model_score": 0.37,
  "horizon_minutes": 120,
  "threshold": 0.5,
  "top_factors": [ { "feature": "baseline_glucose_mg_dl", "contribution": 0.0, "direction": "up" } ],
  "model_version": "shanghai-logistic-v1"
}
```

The numeric values above are examples, not a promised prediction for the demo patient. The score is uncalibrated and must not be labelled a clinical probability.

`GET /health` -> `{ "status": "ok", "model_loaded": true, "model_version": "shanghai-logistic-v1" }`

## Fusion API (Spring Boot), used by the dashboard

| Method | Path | Returns |
|---|---|---|
| GET | `/api/patients` | Enabled synthetic scenarios (`patientId`, `displayName`) |
| GET | `/api/patients/{id}` | Static record + latest fused state |
| GET | `/api/patients/{id}/cgm` | Recent readings |
| POST | `/api/patients/{id}/refresh` | Triggers a prediction |
| GET | `/api/patients/{id}/prediction` | Score, horizon, factors or `unavailable` |

### Unavailable state

```json
{ "status": "unavailable", "reason": "ml_service_unreachable" }
```

The dashboard must show a clear “score unavailable” message and the safety banner.

## Additive research workflow contract

`contracts/workflow-v1.json` extends the frozen ML contract without changing the target, feature list or `/predict` payload. The patient overview now also returns `journal`, including its current saved result identity (null `predictionId` when no attempt exists). `currentMeal` includes `mealId`, `baselineAt` and `clockMode: synthetic_replay`. Its `cgmHistory` is bounded to the recorded pre-meal window; the raw `/cgm` endpoint includes any later ingested observations. New CGM records expose `receivedAt` alongside observation time; historical pre-extension rows may have no receipt timestamp.

| Method | Path | Behavior |
|---|---|---|
| GET | `/api/worklist` | Latest saved attempt, or unsaved status row, for each enabled synthetic patient/meal; no record creation |
| GET | `/api/patients/{id}/journal` | Saved attempts, newest first, including superseded versions |
| GET | `/api/journal/{predictionId}` | Immutable snapshot/output plus derived follow-up and append-only reviews |
| POST | `/api/journal/{predictionId}/reviews` | Append `{"action":"reviewed","note":"Fictional demo review"}` or `action:"reopened"`; nonblank note, max 1000 characters |
| POST | `/api/demo/patients/{id}/follow-up` | Append fictional fixture observations with `{"stage":"partial"}`, `"gap"` or `"complete"`; requires a previously saved attempt; no model call |

`POST /api/patients/{id}/refresh` retains its prediction response shape and now saves a new attempt in H2. Insufficient history returns a specific reason such as `missing_history_offset_45`; model outage remains unavailable/null. Available results with malformed score/horizon/threshold/flag are withheld as `invalid_model_response`. All nine exact 15-minute pre-meal offsets must be present and unambiguous; equivalent duplicates are collapsed.

Saved result fields: `predictionId`, `patientId`, `displayName`, `mealId`, `baselineAt`, `computedAt`, `horizonEnd`, `clockMode`, `inputHash`, `prospective`, `superseded`, `inputChanged`, `baselineGlucoseMgDl`, `baselineAlreadyHigh`, `qualityIssues`, `prediction`, `snapshot`, `outcome`, `reviewState`, `reviews`. `inputHash` fingerprints the serialized API input snapshot; it is not a model-artifact hash. `computedAt` records result issuance, including failed attempts, rather than an internal model execution timestamp.

Outcome fields include `status`, `expectedSamples:8`, `receivedSamples`, `complete`, `conflictingTimestamps`, nullable `eventObserved`, `reaches180`, `rises40`, `observedMaxMgDl`, `observedRiseMgDl`, `predictionMatched`, valid `readings` and an interpretation note. Statuses: `awaiting_outcome`, `partial_follow_up`, `insufficient_follow_up`, `event_observed`, `no_event_observed_complete`.

A positive valid sample can establish an observed event with partial coverage. A nonpositive incomplete/conflicted window remains unknown. Eight expected samples do not establish continuous coverage. Prediction comparison is withheld for unavailable scores, unknown outcomes, retrospective receipt timing or changed inputs. Review state is `awaiting_review` or `reviewed`; reviews have `recordedAt`, `action`, `note`, without verified staff identity.

Replay response: `{"synthetic":true,"stage":"complete","accepted":8,"duplicates":0,"modelScored":false}`. Repeated stages retain stable event IDs, report duplicates, and do not erase prior observations. The synthetic timeline is shared from `follow_up_synthetic.json`. Missing saved attempt returns 409; invalid action/stage/note returns 400. Public application input remains synthetic-only. See `WORKFLOW_GUIDE.md` for examples and limitations.

