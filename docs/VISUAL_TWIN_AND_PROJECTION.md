# Visual twin and simulated projection

Implemented 3 November 2026. These features extend the presentation and research interface. They do not add a validated low-glucose model, a trained anomaly detector, or a medication-response simulator.

## Demo walkthrough

1. Open `http://localhost:3000` and select **Patient workspace**. In the 3D viewer, received synthetic glucose drives the pathways. Tissue colors remain anatomical illustration colors.
2. Inspect the **saved model context** panel. The base arc and its brightness reflect the saved, uncalibrated 120-minute composite-event score. The arc is hidden when that score is unavailable. It is not a low-glucose score.
3. Enable **Highlight medication context**. A blue outline marks the presence of recorded medication information. The names are shown; no timing, dose, organ response or glucose effect is inferred. This display toggle does not change model inputs.
4. Open **Future lab**, select DEMO-001 if a 42-minute example is desired, and click **Open falling trend demo**. The selected fictional values are 127 at +15 minutes and 112 at +30 minutes: slope = -1 mg/dL/min; (112 - 70) / 1 = 42 minutes.
5. Click **Run projection clock**. One real second advances one simulated second. Pause or reset it. The selected sample and body remain fixed; the details show the separate value extrapolated along the fictional line. This is not a new glucose measurement.
6. Click **Show unusual reading demo**. The scripted jump triggers an unusual-change rule and withholds the countdown. Advance one sample to see the reversal flag.
7. Open **Evidence** for the validation roadmap and its downloadable slide. The updated pitch deck is in `deliverables`.

## Independent visual meanings

| Graphic | Meaning |
| --- | --- |
| Red pathways | Selected glucose >=180, or a rising sample slope >=0.5 mg/dL/min when glucose is not below 70 |
| Blue pathways | Selected glucose <70, or a falling sample slope <=-0.5 mg/dL/min when glucose is below 180 |
| Teal pathways | Other valid samples; not a safety classification |
| Path brightness | A clipped visual scale based on selected glucose |
| Base arc | Saved composite-event score on a 0-1 scale; purple marks >=0.50 research threshold |
| Optional blue body outline | Recorded medication context exists; not a pharmacology simulation |
| Organ colors and geometry | Generic illustrative anatomy; no organ-health estimate |

Absolute high/low bands take precedence over direction coloring. All numeric band and slope settings here are display choices, not validated clinical classifications. The landing hero uses its own explicitly fictional sample curves; it does not represent a selected patient's saved score.

## Unusual-reading rules

`inspectPattern` uses only the selected and earlier samples. It flags an absolute rate of at least 3 mg/dL/min, a rapid opposite-direction reversal, a gap greater than 20 minutes, or invalid sample order/values. The 3 mg/dL/min and 20-minute values are unvalidated project heuristics.

The rule cannot distinguish a genuine physiological excursion from a sensor or data issue. No triggered rule means only that the current rule set did not trigger. It is not proof of safe glucose or clean sensor data. Flags do not alter inputs, thresholds, saved scores or outcome labels.

## Projection calculation and gates

For two fictional samples `(t0,g0)` and `(t1,g1)`:

```text
slope = (g1 - g0) / (t1 - t0)          [mg/dL/min]
minutes to 70 = (g1 - 70) / -slope     [minutes]
```

Only Future lab renders this calculation. No future samples are consulted. It requires valid increasing times, no active pattern flag, glucose above 70 and a slope below -0.05 mg/dL/min. A crossing beyond 120 minutes is withheld. An already-at/below-70 sample is described as an observation in the fictional curve, without an invented future crossing.

The clock pauses when leaving Future lab or hiding the browser tab. Changing sample or scenario resets it. It requires explicit start, and does not start automatically. At zero it stops with **Illustrated threshold reached**. The existing replay is separately accelerated at one sample per second; its samples are 15 simulated minutes apart. Running the projection clock pauses sample replay.

## Boundaries and remaining research

- The fitted model remains a fixed 120-minute composite-event classifier (>=180 OR rise >=40), not a glucose trajectory or low-glucose-time model.
- The new projection and flags are local visual state. They make no API writes and are excluded from Phase 1 result snapshots, review journals and research PDFs.
- No validated drug-effect animation is implemented. Medication names and the context outline must not be described as predicted treatment benefit.
- The existing local audit contains some low-containing meal windows (28 training, 35 validation, 21 test), potentially overlapping. This does not establish independent episode counts or validate a countdown. See `REPOSITORY_REVIEW_AND_PRODUCT_SCOPE.md`.
- Future clinical consideration requires suitable permitted data and labels, locked patient-level and external evaluation, clinician review, governance and an appropriately approved prospective study. No benefit or deployment readiness is claimed.

## Implementation

| Source | Responsibility |
| --- | --- |
| `frontend/dashboard/src/anatomy/visualResearch.ts` | Pure past-only pattern rules and linear arithmetic |
| `frontend/dashboard/src/anatomy/ProjectionPanel.tsx` | Explicit-start local clock and explanatory UI |
| `frontend/dashboard/src/anatomy/twinSignals.ts` | Five fictional scenarios and display colors |
| `frontend/dashboard/src/anatomy/TwinExperience.tsx` | Source selection, pattern/projection panels and isolation |
| `frontend/dashboard/src/anatomy/BodyTwinPanel.tsx` | Context controls and accessible labels |
| `frontend/dashboard/src/anatomy/scene.ts` | Separate score arc and medication-context geometry |
| `frontend/dashboard/tests/visualResearch.spec.ts` | Arithmetic, withholding, isolation, clock and context checks |

Run `npx playwright test` from `frontend/dashboard`. The suite uses a clearly labelled synthetic preview API. Use the real Docker stack for the final production-browser check; preview tests alone do not establish real-model or clinical performance.

## Verification completed

- 32 automated checks passed, including projection arithmetic, withholding cases, past-only pattern rules, pause/reset, scenario isolation, 3D context and existing workflow/PDF regressions.
- The rebuilt production dashboard was checked against the actual Spring and model services. The 42-minute example, clock controls, jump/reversal flags, 400px layout, roadmap navigation and PPTX download passed.
- No POST requests or browser errors occurred during that production check, and both patients' complete saved journals matched before/after. Evidence: `docs/research/visual_twin_live_2026-11-03.json`. Re-run with `node tools/verify_visual_twin_live.mjs` while Docker is running.
- The downloadable single-slide roadmap and 12-slide pitch deck passed package/layout checks and were rendered for inspection. The first 11 slides' text and both charts' cached values match the source deck exactly. The source charts had no embedded workbook; the updated deck intentionally creates editable workbook snapshots from their complete supplied cached values. It does not claim to recover original workbook formulas. Original v5 is retained.
- Asset checks found no new emoji icons, missing model assets or placeholder image hosts. Motion additions are data updates (clock/progress), with explicit start/pause and no decorative movement. No native PowerPoint opening or clinical validation is claimed.
