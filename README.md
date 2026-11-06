# GlucoTwin

> **Research prototype under construction.** Demo inputs are synthetic. The included research model is uncalibrated and not clinically validated. No diagnosis, dosing, or emergency use.

GlucoTwin fuses a static synthetic health record with a replayed glucose timeline and scores one defined post-meal event over the next **120 minutes**. The dashboard is intended for a doctor-facing research demonstration.

Our work has two product phases: **Phase 1 - working research prototype** and **Phase 2 - simulated future vision**. Start with [Our Two Phases](docs/PROJECT_PHASES.md) and use the [Phase Checklist](docs/PHASE_CHECKLIST.md) to keep working features, pending assembly and mocked future capabilities clear.

**3 November interface update:** the supplied interactive anatomy hero is the first landing section. The existing patient workspace, Evidence and Future lab now share its design and procedural 3D model. See [UI integration](docs/UI_INTEGRATION_2026-11-03.md) for source files, data boundaries and verification.

**Custom meal input:** Patient workspace now has an editable description, food-group chips, portion controls and fitted-model what-if scoring. Attempts persist separately in H2 and can be reopened. The 3D twin marks the returned score without inventing a glucose curve. See [Meal simulator](docs/MEAL_SIMULATOR.md) for usage and limitations of the fixed synthetic baseline.

**Visual twin demo:** Future lab includes a fictional falling-trend clock, unusual-reading display rules and five scripted scenarios. The body also has separate saved-score and medication-context markers. These additions are not validated low-glucose or treatment forecasts; see [Visual twin and projection](docs/VISUAL_TWIN_AND_PROJECTION.md).

**2 November update:** the assembled Docker stack is running and both synthetic patients return actual fitted-model scores. Phase 1 now includes a readiness-guided flow, strict event identity checks, clearer connection handling and optional 3D overlay motion. See [Phase 1 Strengthening](docs/PHASE1_STRENGTHENING.md) for verified results and remaining acceptance checks.

## Prediction target

**Real-data research input:** Node 1 now supports local validation of de-identified, permitted real-derived records. See [Research Input Guide](research/README.md). The public dashboard remains synthetic; this separate validation path does not send data to Spring or perform model inference.

At the meal-time baseline, the model looks 120 minutes ahead. An event is glucose >= 180 mg/dL **or** a rise >= 40 mg/dL from baseline, at any point in the window. See [Clinical Scope](docs/CLINICAL_SCOPE.md).

## Demo architecture

```text
Synthetic EHR + CGM fixture
          │
          ▼
Deterministic replay publisher ──HTTP──> Spring Boot fusion API ──> H2
                                                │
                                                ├──> FastAPI + fitted model
                                                │
                                                └──> React dashboard
```

No physical IoT device or MQTT broker is needed. The browser calls Spring Boot only. If the model is unavailable, the API must return `unavailable` instead of inventing a score.

## Demo assets in this workspace

Core runtime acceptance passed on 2 November in a separate fresh-volume Docker project: real inference for both patients, ML outage/recovery, frozen snapshots, replay/review persistence and matched PDF exports. See [MVP acceptance evidence](docs/MVP_ACCEPTANCE.md) for commands, result IDs and remaining boundaries.

The dashboard now includes an [interactive 3D anatomy view](docs/ANATOMY_VIEW.md): full body, zoom toward the pancreas, selectable glucose-related organs/tissues, and patient context. Geometry and organ colors are educational illustrations and do not represent measured organ function.

The [combined 3D patient experience](docs/DYNAMIC_TWIN_GUIDE.md) makes this the main view: Phase 1 follows received synthetic glucose samples; Phase 2 plays clearly labelled fictional future stories. A shared timeline drives numbers, overlay color/brightness and opt-in particle playback. Mock curves never replace model scores or enter saved research records.

The [GSAP visual pass](docs/GSAP_VISUALS.md) adds camera transitions, coordinated entrances, phase-label fades and workflow progress animations, with reduced-motion support and updated desktop/mobile styling.

The [anatomy appearance notes](docs/ANATOMY_APPEARANCE.md) document the researched tissue palette, neutral lighting, optional glucose overlay, source references and remaining anatomical limitations.

The [organized website](docs/SITE_REDESIGN.md) now opens with an Overview, with separate Patient workspace, Evidence and Future lab destinations. Open `http://localhost:3000/#workspace` for the working patient flow. The workspace keeps one main glucose timeline and one score-and-save action.

The anatomy panel also offers a six-step guided tour. **Download research summary** saves the selected dashboard snapshot as a PDF with observed history, returned score/factors, trace and limitations. See [Tour and Research Export](docs/TOUR_AND_RESEARCH_EXPORT.md) for usage and timestamp limits. Neither feature changes model inference.

The [post-meal research workflow](docs/WORKFLOW_GUIDE.md) adds a two-patient worklist, immutable prediction attempts in H2, synthetic follow-up coverage/outcomes, append-only review/reopen notes and PDFs tied to saved result IDs. A missing follow-up sample cannot imply a negative outcome. The model and its 120-minute target are unchanged; the fictional future replay is workflow demonstration data, not clinical validation.

- `data/sample/demo_patient_001.json` and `data/sample/demo_patient_002.json` are synthetic patient and nine-reading CGM fixtures for public demo use. The dashboard scenario selector starts on the lower-score case; append `?patient=DEMO-002` to open the high-score case.
- `ml-service/app/artifacts/logistic_regression.joblib` is the candidate fitted research model; `model_metadata.json` records its version, 43 input features, preprocessing, and artifact SHA-256.
- `docs/FEATURE_DICTIONARY.md` and `docs/DATA_DICTIONARY.md` describe the model inputs and demo schema.
- `docs/DATA_LICENSE_AND_ATTRIBUTION.md` records the research dataset attribution and handling notes.

The model artifact hash matches the hash in its metadata. The FastAPI inference service and Spring feature builder use the recorded 43-feature schema and the fitted preprocessing pipeline; this is a deterministic research-demo path, not clinical validation. The participant-level processed research tables were **not** copied into this workspace; keep them out of the public demo and Git.

## Model evidence

Test set: 493 meals from a patient-level split.

| Metric | Model | Baseline |
|---|---:|---:|
| ROC AUC | 0.757 | 0.500 |
| Balanced accuracy | 0.673 | 0.500 |
| F1 | 0.742 | 0.757 (always-positive) |

At threshold 0.50, the confusion matrix is 117 TN, 76 FP, 78 FN, and 222 TP. Test event prevalence is 300/493 = **60.9%**. F1 does not beat the always-positive baseline. There are no confidence intervals, calibration, or external validation. See [Model Card](docs/MODEL_CARD.md).

## Quick start

### Current work plan: modules first, assembly on 2 November

The project is now organized into seven parts with independent checks and a separate module Compose configuration. Start with [Module Plan](docs/MODULE_PLAN.md). Run `.\tools\Module.ps1` for local checks, or add `-UseDocker` to run them in a Python container. Module commands do not start the full stack. Follow [Assembly Checklist](docs/ASSEMBLY_NOV_2.md) on 2 November. The original working baseline is preserved in a source checkpoint and the October 30 Docker archive.

The application code and Docker Compose configuration are in place. Start the stack with:

```bash
docker compose up --build
```

Open the dashboard at [http://localhost:3000](http://localhost:3000). The Spring API is on port 8080; FastAPI stays inside the Compose network.

## Documentation

| Document | Purpose |
|---|---|
| [Our Two Phases](docs/PROJECT_PHASES.md) | Working prototype versus simulated future vision |
| [Phase Checklist](docs/PHASE_CHECKLIST.md) | Simple progress and scope checks for both phases |
| [Dynamic Twin Guide](docs/DYNAMIC_TWIN_GUIDE.md) | Combined 3D modes, replay controls and visual meanings |
| [Build Plan](docs/BUILD_PLAN.md) | Dated implementation phases |
| [Clinical Scope](docs/CLINICAL_SCOPE.md) | Event definition and safety boundaries |
| [Architecture](docs/ARCHITECTURE.md) | Components and data paths |
| [Data Dictionary](docs/DATA_DICTIONARY.md) | Synthetic patient and CGM schema |
| [Feature Dictionary](docs/FEATURE_DICTIONARY.md) | Exact 43 model inputs |
| [API Contract](docs/API_CONTRACT.md) | Implemented service interfaces |
| [Model Card](docs/MODEL_CARD.md) | Training, metrics, and limits |
| [Shanghai baseline report](docs/SHANGHAI_BASELINE_MODEL.md) | Model evidence and interpretation |
| [Data preparation pipeline](docs/SHANGHAI_T2DM_PIPELINE.md) | Research data processing notes |
| [Data attribution](docs/DATA_LICENSE_AND_ATTRIBUTION.md) | Source dataset and license notes |
| [Setup and Tools](docs/SETUP_AND_TOOLS.md) | Tools, ports, and troubleshooting |
| [Demo Guide](docs/DEMO_GUIDE.md) | Demo script and Q&A |
| [Prep Responsibility Matrix](docs/PREP_RESPONSIBILITY_MATRIX.md) | AI and manual tasks |

## Data and license

The public demo patient and CGM values are synthetic. The candidate model was trained on ShanghaiT2DM-derived research data. Follow the attribution and handling notes in `docs/DATA_LICENSE_AND_ATTRIBUTION.md`; do not copy participant-level tables into the public repository. The project is licensed under the included MIT [LICENSE](LICENSE).

## Current build status

The October 30 integrated build was verified healthy, including both score paths, outage/recovery, and duplicate handling. This is historical evidence, not a claim that services are currently running. November 1 modular work and verification are tracked in [Module Plan](docs/MODULE_PLAN.md) and [Module Check Results](docs/MODULE_CHECK_RESULTS.md). Final assembled acceptance is reserved for 2 November.


