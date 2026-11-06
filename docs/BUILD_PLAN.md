# GlucoTwin Build Plan

> **Plan update - 1 November 2026:** Follow `MODULE_PLAN.md` for the current seven-part workflow. Prepare each part independently to its "90%" checkpoint and reserve final assembly/acceptance for **2 November** using `ASSEMBLY_NOV_2.md`. The dated phases below describe the original plan and historical baseline; they do not certify the new assembly.

**Schedule:** Friday, October 30; Saturday, October 31; and Sunday, November 1, 2026. The dates 30 and 31 are in October.

## Starting point

`D:\3Nov` now contains the project docs, synthetic demo fixture, a candidate fitted model and its metadata, and the exact feature dictionary. The model file SHA-256 matches `model_metadata.json`. The React, Spring Boot, FastAPI, and replay-publisher source plus Compose configuration are in place. Docker reports Spring, FastAPI, and the dashboard healthy; the replay publisher exits successfully after its one-shot fixture delivery. The browser score flow, safe model-unavailable state/recovery, and duplicate-reading protection have been manually exercised. Participant-level research tables were not copied.

Use only synthetic patient and CGM inputs in the public demo. The candidate model was trained on ShanghaiT2DM-derived research data; preserve attribution and keep participant-level tables out of Git. No physical IoT device or MQTT broker is needed: replay the synthetic readings to Spring Boot over HTTP. Never invent a score if the model cannot load or score the feature request.

## Phase 1 — Friday, October 30: Build the runnable foundation (complete)

**Goal:** Bring up the service skeleton and move the synthetic fixture through the full path.

- Finish and build the service folders, Dockerfiles, Compose configuration, health checks, and startup dependencies for React, Spring Boot, FastAPI, and the CGM replay publisher.
- Read `data/sample/demo_patient_001.json` and replay its nine timestamped readings to a Spring HTTP ingestion endpoint. Give each replayed event a stable unique ID.
- Implement Spring Boot as the fusion/API boundary and H2 as local state storage; ignore duplicate event IDs.
- Implement FastAPI to load the supplied model pipeline, validate the metadata and artifact hash, accept the exact 43 feature names, and return score, horizon, version, and supported factors. Use the recorded training-time imputation and scaling pipeline.
- Build the React dashboard to show the synthetic profile, replayed CGM history, target horizon, model result or unavailable state, and safety banner.
- Add `.gitignore`; prepare the project-owned MIT `LICENSE` and data attribution text before any public distribution.

**Phase exit:** Met. Compose starts; the synthetic patient and replayed readings reach the dashboard through Spring; the model result is returned only when the compatible artifact and complete feature vector are available. The API returns `unavailable`, with no substituted or stale score, when the model service is stopped.

## Phase 2 — Saturday, October 31: Verify model behavior and finish the demo path

**Goal:** Make the feature and score path traceable and prepare a second synthetic scenario.

- Implement and review feature construction against `docs/FEATURE_DICTIONARY.md`; confirm the 43 names and order match model metadata.
- Verify the model request/response and Spring routes against the actual code; replace draft API and port placeholders.
- Confirm model scoring and factor calculations use the included preprocessing pipeline and model coefficients; show “model score,” not calibrated probability.
- Correct the pitch slide if it uses 64.9% for the 493-meal test set. Its confirmed test prevalence is 300/493, or 60.9%; 64.9% is documented as an earlier eligible-label rate, not this test-set rate.
- Add a second synthetic patient only after its score is produced by the actual model and is clearly distinct from the first. **Complete:** `DEMO-002` has nine replayed readings and returns an available score of `0.989` through the same pipeline, compared with `0.368` for `DEMO-001`. These are uncalibrated research scores, not clinical probabilities.
- Finish dashboard labels, units, unavailable/error states, safety wording, README, setup instructions, and attribution.

**Phase exit:** Met for both demo scenarios. Each prediction is traceable from synthetic EHR and CGM through the exact feature vector and fitted artifact to the dashboard. The second scenario uses the same verified path.

## Phase 3 — Sunday, November 1: Rebuild, rehearse, and prepare backups

**Goal:** Confirm the demo can be recovered and presented without network access.

**Current verification:** A project-scoped clean rebuild (`docker compose down -v --remove-orphans`, `docker compose build --no-cache`, then `docker compose up -d`) completed on October 30 in **288.3 seconds**. After the rebuild, the dashboard, Spring API, and ML service were healthy; `DEMO-001` scored `0.367765...` (no event) and `DEMO-002` scored `0.988781...` (event) through the running stack.

- Rebuild the stack from a clean project state and record start time and manual steps.
- Check normal prediction, model-service outage/recovery, deterministic replay, and duplicate event handling.
- Export locally built images with `docker save` and confirm they can be loaded for an offline start.
- Capture dashboard screenshots, record a backup demo video, and rehearse the five-minute script twice.
- Review README and docs against the working application; list unverified or manual items.
- Scan for secrets, local paths, and oversized files; copy the backup to the chosen USB/cloud location.

**Phase exit:** A known-good build, offline image archive, screenshots/video, and demo script are ready. Clinical review/sign-off and submission-machine verification remain human tasks if not completed.

> Avoid using `docker system prune -a` as routine cleanup. It removes unused Docker images across the machine, including images for other projects. Use project-scoped Compose cleanup and rebuild commands unless broader cleanup is intended.


