# GlucoTwin: our two phases

Agreed on 1 November 2026. Use this page to decide where a feature belongs.

## Phase 1 - Working research prototype

**Purpose:** Show what our actual software and existing model can do.

- Load a synthetic patient, recorded meal and preceding two hours of glucose readings.
- Use the fitted model to score one event within the next 120 minutes: glucose >=180 mg/dL **or** a rise >=40 mg/dL from the meal baseline.
- Show the glucose history, score/status and contributing model factors.
- Provide the patient review worklist, saved prediction versions, synthetic follow-up and review notes.
- Explain the biology through the illustrative 3D body and guided tour.
- Export a PDF tied to a saved result.

**Where we are (2 November):** The Docker dashboard, Spring/H2 and fitted ML now run together, and both patients produce actual model results. The readiness-guided workflow and stricter backend checks are implemented; see [Phase 1 Strengthening](PHASE1_STRENGTHENING.md). Some assembled outage/restart/PDF checks and event-machine acceptance remain pending on the [2 November checklist](ASSEMBLY_NOV_2.md). A module preview with ML offline still shows unavailable.

**Done means:** The assembled services run together, actual model responses reach the dashboard/PDF, unavailable/recovery behavior works, saved baselines remain fixed, and the planned acceptance checks pass.

This is synthetic research software with an uncalibrated score, not a clinically validated product. Fictional follow-up demonstrates the workflow; it does not prove prediction accuracy or prevention.

## Phase 2 - Simulated future vision

**Purpose:** Help judges experience what a more ambitious GlucoTwin could eventually offer.

We can build interactive screens and mock backend responses for:

- Future glucose curves and possible high/low episodes.
- Comparisons between meal or activity scenarios.
- Clinician-selected treatment scenarios, shown as fictional research examples.
- A personalised patient view with combined health/activity context.
- Expanded care-team follow-up and outcome dashboards.

**Where we are (3 November):** The viewer now supports five fictional stories, separate score/medication-context graphics, unvalidated unusual-reading rules and a clearly labelled linear countdown on dummy data. See [Visual twin and projection](VISUAL_TWIN_AND_PROJECTION.md). These additions demonstrate presentation and arithmetic only. Advanced predictive models, validated low-glucose forecasts, medication-response simulation, meal/activity comparisons and expanded care-team screens remain unbuilt.

**Done means for the demonstration:** Selected screens work with repeatable mock scenarios, controls update the visuals consistently, and every simulated result is clearly labelled. A mock backend is enough for this phase's presentation; implementing the actual medical capability remains future research.

Use the visible label **"Phase 2 - Simulated future vision"** and label individual outputs **"Simulated data - not a model prediction"**. Carry the same distinction into screenshots, slides and exports.

## Rules that keep us in scope

1. Assign every new feature to Phase 1 or Phase 2 before building it.
2. Mark its status honestly: **planned**, **mock demonstration**, **implemented**, or **verified in the assembled app**.
3. Keep mock responses/scenarios separate from Phase 1 inference. A model outage must never silently switch to a made-up score.
4. Keep patient/meal context consistent within each demonstration. Identify which numbers are synthetic observations, fitted-model outputs or mock future results.
5. Do not present mock confidence bands, comparisons or treatment scenarios as measured accuracy, proven benefit or medical advice. The 3D body remains illustrative.
6. Moving a simulated prediction into the working scope requires real implementation, suitable data and evaluation; clinical use needs further validation.

The two product phases sit above the existing [dated build plan](BUILD_PLAN.md) and [seven-module plan](MODULE_PLAN.md). They do not replace the assembly schedule.

## What we tell judges

**Phase 1:** "This is our working research prototype, using synthetic demo inputs and an existing fitted model. Here is what we have verified."

**Phase 2:** "This is an interactive simulation of the experience we aim to build. These advanced outputs are mocked and are not validated medical predictions."

Track the remaining work in [Phase Checklist](PHASE_CHECKLIST.md). Use [Clinical Scope](CLINICAL_SCOPE.md) for the current target and [Workflow Guide](WORKFLOW_GUIDE.md) for the implemented review/journal behavior.
