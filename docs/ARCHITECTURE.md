# Architecture

## Components

| Component | Role |
|---|---|
| Synthetic EHR JSON | Static demo profile: age, sex, BMI, HbA1c, fasting glucose, diabetes duration, and medication context |
| Deterministic CGM replay publisher | Reads the synthetic fixture and sends timestamped readings to Spring over HTTP |
| Spring Boot | Fusion point. Loads the EHR, accepts and deduplicates CGM events, builds model inputs, calls FastAPI, and serves the dashboard API |
| H2 | Stores received CGM, immutable prediction snapshots and separate append-only review notes |
| FastAPI ML service | Loads the supplied scikit-learn pipeline and returns the model score and supported factors |
| React dashboard | Doctor-facing prototype view; calls Spring Boot only |

## Data paths

1. Static patient profiles: `data/sample/demo_patient_001.json` and `data/sample/demo_patient_002.json` -> Spring Boot.
2. Dynamic replay: synthetic CGM fixture -> HTTP event ingestion -> Spring Boot -> H2.
3. Prediction: Spring Boot -> 43 ordered features -> FastAPI -> score and factors.
4. View: React -> Spring Boot -> patient state and prediction status.
5. Review worklist: Spring loads the latest saved attempt for each configured patient/meal. Refresh saves a new immutable attempt, including failure states; prior records remain accessible.
6. Follow-up: explicitly fictional observations -> Spring/H2 -> coverage and sampled outcomes against the frozen meal baseline -> research journal and version-bound PDF. These observations never become inputs to the original result.

The replay publisher is the simulated sensor source. No IoT device or MQTT broker is required for this demo.

## Design rules

- The browser calls Spring Boot only; it never calls the model service directly.
- **Failure-safe:** if the model is absent or unreachable, return `unavailable`; never invent a score.
- **Idempotent ingestion:** repeated `eventId` values do not create duplicate readings.
- **Deterministic:** replaying the same fixture with the same model bundle produces the same feature vector and score.
- Only readings at or before the prediction baseline enter model features. Future outcomes never enter the request.
- The configured recorded meal instant anchors every score. A newest follow-up reading cannot move that baseline. `computedAt` is result issuance wall time; observation and receipt times are separate. See `WORKFLOW_GUIDE.md` and `contracts/workflow-v1.json`.
- Show synthetic demo inputs only. The supplied model was trained using ShanghaiT2DM-derived research data; see `DATA_LICENSE_AND_ATTRIBUTION.md`.

## Prediction pipeline

Collect -> Engineer the documented 43 features -> Apply the artifact's median imputation, missing indicators, and scaling -> Score with logistic regression -> Explain supported leading factors.
