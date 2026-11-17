# Physiological twin integration

This is an experimental research implementation. It is not a clinical forecast,
an organ-function measurement, an insulin calculator or evidence of patient benefit.
The existing 43-feature meal event classifier is unchanged and has separate results.

## What is connected

```text
Recorded CGM + timestamped meal/activity context
                    |
             Spring API / H2
                    |
       FastAPI physiological twin engine
       six states -> patient fit -> UKF updates
       -> residual correction -> drift/recalibration
                    |
       baseline + meal/walk comparison + simulation bands
                    |
       saved input, state, covariance, parameters and curves
                    |
             Patient workspace
```

Tanmay's MIT `twin/model.py` is vendored at `ml-service/app/upstream/model.py`.
The adapter in `ml-service/app/twin_engine.py` uses its six-state ODE, UKF,
physiological priors, rollout and ridge residual functions. Calibration is adapted
to sparse observed CGM rather than interpolating future readings. Drift handling
and chronological evaluation are implemented in the adapter.

AlgoAura informs the searchable worklist, CGM metrics and wearable context.
Metrics use elapsed-time weighting, exclude gaps over 30 minutes, return unavailable
values for missing data and withhold GMI on short recordings. The UI uses our own
React/Spring/H2 stack. Source licenses are in `UPSTREAM_TWIN_CODE.md` and
`ml-service/app/upstream/`.

## Use the workspace

1. Open Patient workspace and select a patient.
2. Open **Glucose forecast at selected reading** beneath the recorded timeline.
3. Enter additional carbohydrate in grams, a slow-absorption fraction (0–1),
   and an optional walk lasting 0–120 minutes in five-minute steps.
4. Choose **Run & save twin forecast**. Solid and dashed curves compare the
   same assimilated state with and without the additional inputs. The comparison
   does not overwrite a recorded meal, CGM reading or classifier score.
5. Inspect 30/60/120-minute results, CGM summary and calibration/evaluation details.
6. Optionally record known synthetic carbohydrate, steps, heart rate, HRV or sleep
   at the selected timestamp. Run again to incorporate this recorded context.
7. Moving the selected reading clears the result. A new request uses only history
   through that reading. Requests have timeouts and results from old selections
   are discarded. When the backend fails, there is no browser fallback forecast.

**Carbohydrate grams are not meal weight.** The meal text/category form continues
to feed the original classifier. It cannot provide nutrient grams without a
separate reliable nutrient input, so no automatic conversion is made.

## Data and calibration rules

- Observations must have unique increasing timezone-aware timestamps aligned to
  five-minute intervals, glucose 40–500 mg/dL and no future observations.
- At most 14 days, 5,000 readings and 1,000 context records per request.
- Public Spring endpoints remain limited to the registered demo patients.
- Unknown historical meals/activity are omitted. HR/HRV/sleep are displayed only;
  they do not silently become glucose predictors. Step counts describe the preceding
  five-minute interval and affect the assumed exercise term.
- Four days plus at least five sufficiently observed four-hour meal windows are
  required for fitting. The first four days are the calibration partition.
  Current two-hour demo histories show **prior parameters**, not personalization.
- Fitted parameters are insulin sensitivity, glucose effectiveness and absorption
  rate. The model uses fast and slow gut pools, not geometric organ measurements.
- A UKF assimilates observed glucose. Gaps over 30 minutes reset the state;
  another consecutive reading is needed after a terminal gap.
- Ridge residual correction is trained only on the calibration partition.
  The boosted alternative is intentionally not imported: it needs a separate
  training/evaluation dataset and deployment contract. No upstream pickle is loaded.
- Drift compares matured 60-minute errors with calibration bias. With at least
  24 pairs and a shift over 12 mg/dL, refitting can occur at most once per day.
  It uses only completed historical windows. Residual correction is disabled for
  forecasts after a parameter change until freshly evaluated; previous calculations
  remain unchanged in chronological evaluation and saved records.
- 96 deterministic paired parameter/state draws produce **90% simulation bands**.
  They do not include every source of model error and are not validated prediction
  intervals or calibrated event probabilities.
- Evaluation compares the twin with last-value persistence at 30, 60 and 120 minutes,
  using observed pairs strictly after the initial calibration window and excluding
  pairs crossing long gaps. Zero pairs means no evidence, not zero error.
- CGM summary uses 70–180 inclusive, above 180 and below 70. This differs deliberately
  from the classifier's event definition (at least 180 or rise at least 40).
  GMI needs 14 days and 70% duration coverage in this implementation. It is not HbA1c.

## APIs

The browser calls only Spring. FastAPI remains internal in Compose.

| Method and Spring path | Purpose |
|---|---|
| POST `/api/patients/{id}/twin/forecasts` | Calculate and save an immutable simulation |
| GET `/api/patients/{id}/twin/forecasts` | Latest 20 saved inputs and results |
| POST `/api/patients/{id}/twin/context` | Append timestamped recorded context |
| GET `/api/patients/{id}/twin/context` | Read that patient's recorded context |

Forecast request:

```json
{"origin":"2026-10-30T12:00:00Z","scenario":{"carbsGrams":40,"slowFraction":0.5,"walkMinutes":20}}
```

Context request (blank optional UI fields serialize to null):

```json
{"observedAt":"2026-10-30T12:00:00Z","carbsGrams":35,"slowFraction":0.5,"stepsPer5Min":20,"heartRateBpm":80,"hrvMs":40,"sleepHours":7}
```

Exact duplicate context at a timestamp is idempotent; conflicting context returns
409 and preserves the original. Forecast records contain a UUID, creation time,
full frozen input and result. H2's existing `h2-data` volume persists them. Models
are deterministically reconstructed from the saved prefix rather than blindly
resuming a mutable state from a future replay position. Service errors return
`unavailable` and are not saved as successful forecasts.

Internal FastAPI: POST `/twin/forecast` accepts patientId, origin, referenceGlucose,
hba1c, readings, context and scenario. It is independently usable for offline
research; it does not require a working classifier artifact to calculate physiology.

## Run and verify

Rebuild existing services with `docker compose up --build` from the project root.
The ML Dockerfile now copies the complete application and installs SciPy.

Local checks from the project root in PowerShell:

```powershell
python -m venv .venv-twin
.\.venv-twin\Scripts\python.exe -m pip install -r ml-service/requirements.txt pytest httpx
.\.venv-twin\Scripts\python.exe -m pytest ml-service/tests/test_twin.py -q
mvn -f backend/fusion-api/pom.xml test
npm --prefix frontend/dashboard run build
Set-Location frontend/dashboard
npx playwright test --config playwright.twin.config.ts
```

The dedicated browser config starts real FastAPI and Spring services with an
isolated in-memory test database, seeds synthetic readings and checks the actual
browser/API/model/persistence path. It does not touch the main demo database.
The ordinary preview API deliberately does not invent twin output.

To reproduce any saved forecast, save a returned record to JSON and run:

```powershell
.\.venv-twin\Scripts\python.exe tools/evaluate_twin.py saved-forecast.json --output research-results/reproduced.json
```

The generated long-history tests exercise code paths, including recalibration.
They are not independent clinical validation. Real-data accuracy, interval coverage,
and intervention effects remain unproven. No medication/dosing simulation, FHIR
integration, wearable hardware connection or upstream performance claims are shipped.

## Metric references

- [Bergenstal et al., GMI](https://pubmed.ncbi.nlm.nih.gov/30224348/)
- [International consensus CGM metrics and data coverage](https://diabetesjournals.org/care/pages/soc-table-6-4)

## Verification on 16 November 2026

- Eight Python checks passed: scenarios, state isolation, invalid/future data,
  gaps, metric weighting, fitting/residual evaluation, API validation and drift.
- All 31 Java tests passed across the full run and corrected twin-test rerun
  (27 existing tests, four new twin tests).
- Five existing-workflow browser checks passed against the preview API.
- The real Spring/FastAPI browser test passed, including saved context, patient
  isolation, simulated dependency failure/recovery, desktop/mobile overflow,
  original classifier inference, JSON download and the **3D canvas**.
- Exported JSON reproduced every result field exactly with `evaluate_twin.py`.
- Production frontend build and local Java packaging passed. The build retains
  the existing large-bundle advisory; no performance claim is made.
- Asset check: no new emoji icons, external images, missing icon imports or
  placeholder imagery. The dashboard uses its existing chart and design assets.
- Docker Desktop started, but a clean Compose rebuild failed on Maven Central
  certificate trust (`PKIX path building failed`). TLS verification was not disabled.
  Tests therefore establish local service integration, not a successful Docker rebuild.

The 3D model remains on Overview and under **Patient workspace > Glucose history >
View patient twin**, above the forecast disclosure. The visual overlay follows
recorded glucose; hypothetical scenario curves remain separately labelled.

## Foreground local startup when Docker cannot build

Use these in separate PowerShell terminals, all starting in the project root.
These commands use a separate `runtime-data/twin-local` database and preserve
the existing Docker H2 volume. Build/package first using the commands above
and `mvn -f backend/fusion-api/pom.xml -DskipTests package`.

Terminal 1, model service:

```powershell
$env:MODEL_PATH = (Resolve-Path ml-service/app/artifacts/logistic_regression.joblib).Path
$env:MODEL_METADATA_PATH = (Resolve-Path ml-service/app/artifacts/model_metadata.json).Path
.\.venv-twin\Scripts\python.exe -m uvicorn app.main:app --app-dir ml-service --host 127.0.0.1 --port 8000
```

Terminal 2, Spring API:

```powershell
New-Item -ItemType Directory -Force runtime-data/twin-local | Out-Null
$env:ML_SERVICE_URL = 'http://127.0.0.1:8000'
$env:SPRING_DATASOURCE_URL = 'jdbc:h2:file:./runtime-data/twin-local/glucotwin;DB_CLOSE_ON_EXIT=FALSE'
java -jar backend/fusion-api/target/fusion-api-0.1.0.jar
```

Terminal 3, dashboard:

```powershell
$env:VITE_API_BASE_URL = 'http://localhost:8080'
npm --prefix frontend/dashboard run dev -- --host 127.0.0.1 --port 3000 --strictPort
```

After Spring is ready, seed the synthetic CGM in another terminal:

```powershell
$env:SPRING_API_URL = 'http://127.0.0.1:8080/api/cgm/events'
python cgm-publisher/app.py --fixture data/sample/demo_patient_001.json --fixture data/sample/demo_patient_002.json
```

Open `http://localhost:3000`. Stop each foreground service with Ctrl+C.
Do not run the local services and Compose on the same ports simultaneously.
