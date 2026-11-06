# Post-meal review worklist and prediction/outcome journal

Implemented on 1 November 2026 as a synthetic research workflow. The fitted model, its 43 inputs and the composite 120-minute target are unchanged. No second prediction model, meal optimizer, dosing rule, clinical priority or demonstrated prevention benefit was added.

## What is now available

The worklist puts both enabled synthetic patient meals on one screen. It displays recorded baseline glucose, a separate already-180-or-higher observation, model status/score, computation time, observed follow-up coverage and local review state. It does not classify patients as clinically safe, urgent or suitable for a particular meal.

Each explicit score/refresh now saves an immutable prediction attempt in H2, including unavailable and insufficient-data results. The saved snapshot contains patient/meal context, pre-meal readings and returned prediction; records have a result ID, stable meal ID, baseline time, computation time and SHA-256 fingerprint of the serialized input snapshot. The fingerprint identifies the recorded API input, not the fitted model binary or a complete execution environment. The model version remains in the prediction. Old attempts remain available as superseded versions; new computation does not replace old notes or outputs.

Reviewing and reopening append separate timestamped notes. There is no verified user/staff identity, clinical signature or access-controlled hospital workflow. Enter fictional demo notes only. These features do not authorize real patient data in the public application.

## Try it

1. Choose DEMO-001 and inspect the research worklist. DEMO-002's 190 mg/dL baseline is displayed as an existing observation, separately from any model score.
2. Click **Save scoring attempt**. This requests the existing model and saves the returned result. With no model service, an unavailable record is still saved; no score is invented.
3. Click **Replay first 45 minutes**. Three fictional future readings appear. A partial window without an observed event stays unknown.
4. Click **Replay with a missing sample**. The endpoint appends seven of the eight expected points, including the +120 endpoint, omitting +60. Unless already supplied by a previous stage, the absent point makes a negative outcome unknown.
5. Click **Complete follow-up replay**. This fills the missing point. Repeating a stage leaves existing event IDs unchanged. Earlier stages cannot remove observations already supplied by later stages.
6. Read the observed maximum, change from the original baseline, absolute/rise target components and sample coverage. An observed positive can be established by one valid positive sample; a negative requires all eight expected sample times without conflicts and a known baseline.
7. Enter a fictional note, then **Mark reviewed**. Add another note and **Reopen review** to retain an audit of the change.
8. Download the saved result. Its PDF uses that exact saved input/prediction version, with the currently captured follow-up and review history. Later notes or observations do not rewrite an already-downloaded PDF.
9. Save another attempt after follow-up exists. It is clearly retrospective and receives no prospective agreement assessment. Select the earlier version to see its original inputs, ID and computation time.

The ordinary **Score current meal / Refresh model score** action also saves an attempt. History and the anatomy context remain anchored at the recorded meal baseline after follow-up is appended. The raw CGM endpoint includes future observations; the patient overview's `cgmHistory` remains the pre-meal window.

## Clocks, data and outcome rules

- `baselineAt` is the simulated meal instant; `horizonEnd = baselineAt + 120 minutes`.
- `computedAt` is the actual wall-clock time the result was issued. A late replay uses historical observation times; that does not mean the forecast was issued on that historical date.
- Each newly ingested CGM row stores `receivedAt` separately from `observedAt`. Older rows from a pre-extension database may have null receipt time.
- `prospective` means result issuance preceded receipt of this replay's follow-up observations. It does not claim a real prospective clinical study. If outcome data was already present or a later-visible receipt predates issuance, comparison is withheld. An ingestion-ID cutoff provides an additional check.
- Outcome samples are strictly after baseline and at or before the horizon end. Readings outside that interval are excluded. Follow-up never enters saved model features.
- Complete sampled follow-up means one unambiguous value at each +15 through +120-minute point, with no conflicting timestamps. Eight points cannot exclude crossings between samples.
- Contradictory values at a timestamp are excluded and counted as conflicts. Equivalent duplicate values are collapsed. A valid positive elsewhere can still establish an observed event, with the conflict disclosed.
- `eventObserved` is null for an incomplete nonpositive window. It is not silently false. Individual target components also remain unknown until supported by an observed positive or complete samples.
- `predictionMatched` is null for unavailable predictions, unknown outcomes, retrospective records or saved inputs that differ from current pre-meal inputs. Otherwise it compares the original research threshold flag with the sampled composite outcome. Superseded results remain auditable historical attempts.
- `inputChanged` is calculated against the current pre-meal snapshot. It does not rewrite old input data. The saved model request uses the configured meal anchor and requires all nine exact pre-meal offsets, rejecting conflicting/off-grid history.

The current public demo has one configured meal per patient. Multiple real meals, authenticated staff workflows, large-scale worklist pagination and clinical deployment are future work. The H2 schema uses development `ddl-auto=update`; a production migration process has not been established.

## Synthetic follow-up fixtures

`backend/fusion-api/src/main/resources/follow_up_synthetic.json` is the shared source for backend and preview workflow demonstrations. DEMO-001 has a fictional sampled negative outcome (observed maximum 161, rise 19 from 142); DEMO-002 has fictional future values above 180. These values were authored to exercise the workflow, not generated by the fitted model or taken from participant research records. They do not establish accuracy or a causal meal response.

`partial` appends the first three points, `gap` appends all except +60, and `complete` appends all eight. The backend refuses follow-up replay until an attempt has been saved. The replay endpoints do not call the model. The original pre-meal publisher and real-data validate-only path remain separate.

## Native backend preview used for verification

This runs only the backend and dashboard modules. It does not assemble or validate the ML/Docker stack. Requirements: JDK 21+, Maven, Node/npm, Python for the existing replay publisher.

```powershell
cd D:\3Nov
mvn.cmd -f backend/fusion-api/pom.xml package
java -jar backend/fusion-api/target/fusion-api-0.1.0.jar --server.port=18085 '--spring.datasource.url=jdbc:h2:file:D:/3Nov/runtime-data/journal-preview;DB_CLOSE_ON_EXIT=FALSE' --ml.service.base-url=http://127.0.0.1:1
```

In another terminal, seed history with the normal synthetic publisher:

```powershell
cd D:\3Nov
$env:SPRING_API_URL = 'http://127.0.0.1:18085/api/cgm/events'
$env:REPLAY_INTERVAL_SECONDS = '0'
python -B cgm-publisher/app.py --fixture data/sample/demo_patient_001.json --fixture data/sample/demo_patient_002.json
```

Then start the frontend in another terminal:

```powershell
cd D:\3Nov\frontend\dashboard
npm.cmd ci
$env:VITE_API_BASE_URL = 'http://127.0.0.1:18085'
npm.cmd run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

Open http://127.0.0.1:5175. The deliberate unreachable model address demonstrates unavailable scores. This is a working Spring/H2 journal, not model inference evidence. Records survive restarting the backend with the same H2 path. The project directory is already excluded from Git for runtime database files. Stop Java before rebuilding its executable JAR on Windows because the running process locks the archive.

Default CORS origins are localhost/127.0.0.1 on 3000, 5173 and 5175. Use `CORS_ALLOWED_ORIGINS` for another explicit comma-separated origin list. Keep `SIMULATED_MEAL_TIME` identical in backend and publisher if changing the default 2026-10-30T12:00:00Z anchor. Use a separate fresh demo database for a new anchor: the original publisher's history IDs are stable per patient and should not be reused for a second meal in the same database.

On this machine Maven required the Windows root certificate store. If the ordinary command encounters the same certificate-chain error:

```powershell
$savedMavenOpts = $env:MAVEN_OPTS
try {
  $env:MAVEN_OPTS = "$savedMavenOpts -Djavax.net.ssl.trustStoreType=Windows-ROOT -Djavax.net.ssl.trustStore=NONE"
  mvn.cmd -f backend/fusion-api/pom.xml package
} finally { $env:MAVEN_OPTS = $savedMavenOpts }
```

The independent Python preview (`tools/preview_api.py`) also supports the synthetic worklist/journal but keeps its records in process memory and always returns unavailable scores. Restarting that preview clears its workflow state. Browser tests use that adapter; backend tests and the native restart check establish separate H2 behavior.

## APIs and verification

See [API Contract](API_CONTRACT.md) and `contracts/workflow-v1.json`. The original ML feature/horizon contract in `contracts/v1.json` remains unchanged. The additive patient-response journal carries result identity; legacy snapshots without one retain an explicit PDF timestamp limitation.

Verification performed:

- Maven: five existing feature-builder tests plus thirteen Spring/H2 workflow/CORS integration tests, including racing duplicate delivery.
- Existing fifteen Python tests pass after the preview extension.
- Existing nine browser scenarios plus two workflow scenarios pass: partial/gapped/complete replay, notes/reopen, version selection, selected-result PDF, reload, patient isolation, 400px layout, keyboard use, dependency failure and recovery.
- Native file-backed H2 backend: history replay, unavailable record save, gap/complete/idempotent follow-up, note append, actual process restart, same saved snapshot/fingerprint/ID/computation time/notes/outcome afterward.
- Production TypeScript/Vite build; PDF content checks and visual page inspection. Bundle-size warnings remain; no performance improvement is claimed.

Full Docker startup, both actual fitted-model scores, model-outage recovery against the assembled stack and event-machine verification remain on [2 November's assembly checklist](ASSEMBLY_NOV_2.md). Add these workflow checks there before claiming assembled acceptance.
