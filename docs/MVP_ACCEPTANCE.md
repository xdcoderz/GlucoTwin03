# MVP runtime acceptance — 2 November 2026

**Result: the core synthetic research workflow passed controlled end-to-end acceptance on this Windows machine.**

This verifies the software path from bundled input files through actual fitted-model inference, saved results, fictional follow-up, review history and PDF export. It is not a new model-accuracy evaluation, clinical validation or an event-machine acceptance test.

## Environment and isolation

- Docker Engine 28.5.2 and Compose v2.40.3-desktop.1.
- A separate Compose project, `glucotwin-mvp-proof`, built all four services from the current workspace using the ordinary `compose.yaml`.
- A new named H2 volume, `glucotwin-mvp-proof_h2-data`, started with empty prediction journals. The original `glucotwin_h2-data` volume was not reset, removed or attached to the test stack.
- Ports 3000 and 8080 were free because the original containers were stopped at the beginning of this run. The test used the real production dashboard configuration and HTTP endpoints, not the Python preview API or browser request substitution.
- Builds used the existing Docker cache. This was a fresh-database assembly test on the current machine, not a clean operating-system installation or uncached dependency-download test.

## Observed results

| Gate | Evidence / result |
| --- | --- |
| Local integrity | Seven module checks passed: fixture consistency, event contract, artifact SHA-256, exact 43-feature order and module entry files |
| Python tests | 15 passed |
| Java tests | 22 passed: 5 feature-builder tests and 17 journal/API integration tests; zero failures/errors |
| Docker assembly | All four images built; model, Spring and dashboard healthy; replay completed with exit 0 |
| Initial data | Both patients had nine valid pre-meal samples and initially empty journals |
| Actual model | DEMO-001: `0.3677653238267805`; DEMO-002: `0.9887812722077698`; `shanghai-logistic-v1`; five factors each |
| Fixed baseline | Baselines 142 and 190 mg/dL preserved; original attempts issued before fictional follow-up was ingested |
| Partial/gapped follow-up | 3 and 7 samples left the negative outcome unknown |
| Complete follow-up | Eight expected samples established the synthetic sampled negative outcome for DEMO-001 |
| Early positive | DEMO-002 established an observed event with partial follow-up |
| Separation of future inputs | Patient overview retained nine pre-meal readings; saved input snapshots, hashes and model outputs stayed unchanged |
| Idempotency | Repeated complete follow-up accepted zero new points and reported eight duplicates; exact duplicate historical events did not grow histories |
| Conflicting event IDs | Changed payload under an existing event ID returned HTTP 409 and did not replace the original input |
| Review history | Reviewed and reopened TEST ONLY notes appended in order to both original results |
| Actual ML outage | Stopping only the test project's ML container produced a saved unavailable attempt, null score, null classification and no factors |
| Outage UI | Dashboard showed an em dash and unavailable model state, without stale factor contributions |
| Recovery | Restarting the test ML service restored actual inference; available, unavailable and recovered versions remained separately addressable |
| H2 persistence | Recreating the test Spring container preserved complete journal JSON for both patients: original IDs, snapshots, hashes, scores, follow-up and review history |
| Historical selection | After recovery/recreation, the dashboard could select the original available result and the historical unavailable result; review notes remained visible |
| Browser errors | No page errors in the available/PDF and recovered/historical acceptance probes |
| Available PDF | Three pages; result ID, full input hash, score, model/factors, UTC timestamps, 8/8 follow-up and TEST ONLY review history matched its selected saved record |
| Unavailable PDF | Three pages; correct unavailable result ID/hash/timestamps, no substituted score and no stale factors |
| PDF visual review | All six rendered pages inspected for clipping, overlap and legibility; no layout defects observed |

Unknown synthetic patient IDs are rejected with HTTP 400 in the current Spring API. Successful ingestion returns HTTP 202. The initial acceptance harness assumed 404/200 respectively; those expectations were corrected to the implemented API behavior. A restart polling connection-reset exception was also handled in the harness. These were verification-script corrections, not changes to the inference implementation.

## Result identities

- Original DEMO-001 available result: `60f19eb5-056e-4ac0-a730-cd0387d6b4b5`.
- DEMO-001 unavailable result: `824a5594-7776-4b9f-b15e-fa54635d0b6b`.
- The recovered result is a third saved version; it did not overwrite either earlier record.

The first PDF was captured while the original result was current. The outage PDF was captured while the unavailable result was current. Subsequent recovery made them historical; this does not change the already exported snapshots.

## Evidence files

- `docs/research/mvp_acceptance_2026-11-02.json`: input/result snapshots and recorded runtime assertions.
- `docs/research/mvp_pdf_expected.json`: the exact API records selected for export.
- `docs/research/mvp_pdf_verification.json`: PDF matching results.
- `output/pdf/mvp_acceptance_available.pdf` and `output/pdf/mvp_acceptance_unavailable.pdf`: verified browser exports.
- `docs/screenshots/mvp_acceptance_available.png`, `mvp_acceptance_ml_outage.png`, `mvp_acceptance_restart_historical.png`: assembled UI evidence.

## Reproducing the acceptance run

Use a dedicated project with a fresh volume and a new evidence filename. **Do not point the mutation phases at the regular demo stack.** They create scoring attempts, append fictional observations and write TEST ONLY review notes.

Check that ports 3000/8080 are free. If the normal app is running, schedule a separate acceptance run or create a reviewed port/build-argument override; do not run two projects on the same host ports.

```powershell
# Choose a new project name that has no existing data volume.
$proofProject = 'glucotwin-proof-new'
$proofEvidence = 'docs/research/mvp_acceptance_new.json'

python -B tools/check_modules.py
mvn.cmd -q -f backend/fusion-api/pom.xml test
docker compose -p $proofProject up --build -d

python -B tools/verify_mvp_acceptance.py --phase baseline --project $proofProject --evidence $proofEvidence
python -B tools/verify_mvp_acceptance.py --phase workflow --project $proofProject --evidence $proofEvidence

# Export and inspect the original available saved result in the dashboard.
docker compose -p $proofProject stop ml-service
python -B tools/verify_mvp_acceptance.py --phase outage --project $proofProject --evidence $proofEvidence
# Verify unavailable UI and export that selected unavailable result.

docker compose -p $proofProject start ml-service
python -B tools/verify_mvp_acceptance.py --phase recovery --project $proofProject --evidence $proofEvidence
docker compose -p $proofProject up -d --no-deps --force-recreate spring
python -B tools/verify_mvp_acceptance.py --phase persistence --project $proofProject --evidence $proofEvidence

# Removes only this test project's containers/network; retains its named volume.
docker compose -p $proofProject down
```

Inspect every command's exit code; stop on failure. Run the write phases once in order. The harness supports resuming already-recorded baseline/coverage checks, but review writes are not intended as repeatable no-op commands.

On this Windows machine Maven used the system Windows certificate store via `MAVEN_OPTS`; preserve that setting if required by the local TLS environment. No TLS verification was disabled.

## Remaining boundaries

- The original running project's ML service was not deliberately interrupted. The full outage/recovery test used the isolated assembled project with the same configuration and real services.
- Clinical performance, model calibration, confidence intervals and external-population validity remain unestablished by these workflow checks.
- Event-machine setup, offline image loading, a backup video, fresh installation/network conditions and presentation rehearsal remain separate gates.
- This run did not execute every browser/PDF test in the repository. It checked the actual assembled workflow and two bound PDF exports in addition to the Python/Java suites.
- The acceptance volume is retained for inspection; its TEST ONLY records are separate from the normal demo database.
