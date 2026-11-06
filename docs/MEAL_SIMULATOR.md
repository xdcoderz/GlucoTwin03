# Custom meal input and what-if scoring

Patient workspace now starts with an editable meal form. It replaces the old read-only meal strip.

## Use it

1. Select the synthetic patient.
2. Enter a description, for example `2 rotis with dal and a cup of curd`.
3. Check the food chips. Suggestions recognize common aliases such as roti/paratha as bread and curd as dairy. Correct them manually when needed.
4. Enter a total portion in grams, or use the 50–400 g slider. The number field accepts 1–2,000 g. Set the minutes since the previous meal.
5. Once all nine correctly timed glucose inputs are ready, select **Simulate this meal**.
6. Read the uncalibrated 120-minute event score and leading factors. The optional 3D view opens with the score context; organs retain natural colors.
7. Use **Saved meal simulations** to reopen a previous attempt. These persist in H2 and are isolated by patient. Editing a field clears the previous displayed result and aura so an old score cannot be mistaken for the new meal's result.

## What the model actually does

The browser sends meal details to Spring Boot. Spring takes a snapshot of the selected synthetic health record and the exact two-hour history ending at the displayed meal baseline. It builds the same 43 inputs used by the fitted FastAPI model.

Only the meal description, selected food-group indicators, total reported weight and previous-meal interval change. Medication flags and patient characteristics remain inherited from the record. An explicit total weight overrides all gram amounts in the description; it is counted as one aggregate reported-weight entry, not added a second time. Selected chips explicitly override the eight matching food-group features.

Eight supported groups: rice, bread, vegetables, animal protein, fruit, dairy, noodles, roots/corn. Dal and other legumes have no dedicated feature. Chips do not provide carbohydrate grams or nutrient analysis. New meal names and portion estimates may fall outside the model's training distribution.

The result still addresses only the existing event: glucose at least 180 mg/dL OR a rise of at least 40 mg/dL from baseline at any time in 120 minutes. It is an uncalibrated event score. The model cannot produce a glucose curve, determine a safe meal, estimate the causal effect of changing food, or support treatment/dosing decisions. A larger portion is not guaranteed to monotonically increase the score.

## 3D behavior

The meal simulation twin is explicitly in **MEAL WHAT-IF SCORE CONTEXT** mode. Its soft body aura is red at/above the 0.50 research threshold and blue below it. Blue does not establish a safe meal. This mode does not show green or invent glucose readings. It hides glucose flow paths and uses the base arc to display the actual returned score. Missing/unavailable scores show no simulation twin. The existing glucose-sample viewers keep their separate green/red/blue rules.

## What is stored

Every valid request saves an immutable attempt in the separate `meal_simulations` H2 table: custom meal, exact patient/history/features snapshot, baseline, timestamp, input fingerprint, model version, score/status and factors. The API lists the latest 20 per patient; older attempts remain stored. The original patient JSON, recorded meal, recorded prediction journal, follow-up comparisons and existing PDF exports remain unchanged. What-if records do not count as prospective validation or food actually eaten.

This is a simulator at the **fixed synthetic baseline shown on screen**, not an operational daily intake or live clinical logging service. Scoring meals at other times would require a real aligned CGM history and a separately designed/validated workflow.

## API

`POST /api/patients/{patientId}/meal-simulations`

```json
{
  "description": "2 rotis with dal and curd",
  "categories": ["bread", "dairy"],
  "portionGrams": 250,
  "minutesSincePreviousMeal": 180
}
```

Description: nonblank, at most 500 characters. Categories: required list, up to eight unique supported codes (an empty list is allowed). Portion: finite 1–2,000 g. Previous meal: integer 0–1,440 minutes. Invalid requests return 400 before model inference/storage. Unknown patients return 400.

Returns a simulation object with `simulationId`, `mode: meal_what_if`, `patientId`, `createdAt`, `baselineAt`, `meal`, `features`, `inputHash`, `snapshot`, `prediction`, and `note`. Missing history yields `insufficient_data`; service/model failures yield `unavailable`, with no invented score. Valid attempts with these statuses are still saved for review.

`GET /api/patients/{patientId}/meal-simulations` returns the latest 20 saved attempts, newest first.

The local preview server implements the same interaction but always returns an unavailable model score. Only the assembled Docker stack runs the fitted model.

## Verification completed on 3 November

- All 27 Java tests passed, including five new custom-meal integration tests for exact feature overrides, immutable separate storage, input validation, missing history, model failure and exclusion of post-meal readings.
- Five browser tests passed: three new meal-form checks and two existing workspace checks. They covered editable fields, food suggestions, request payloads, unavailable/error states, clearing stale scores, per-patient isolation, saved attempts, the labeled 3D aura and mobile layout.
- The real Docker model (`shanghai-logistic-v1`) returned scores of 0.413831 for the 250 g roti/dal/curd example and 0.420752 when only the portion changed to 400 g. These are demonstration outputs, not calibrated probabilities or evidence of a causal food effect.
- Both saved simulations and both original patient journals survived a Spring restart unchanged. The live browser reported no page/shader errors. Evidence: [live verification](research/meal_simulator_live_2026-11-03.json). Screenshots: `screenshots/meal_form_desktop.png`, `screenshots/meal_form_mobile.png`, `screenshots/meal_simulation_twin.png`.

Deployment note: the source-based backend Docker rebuild stalled while downloading Maven dependencies. After the Java tests passed, the same source was packaged locally with `mvn -B -DskipTests package`; its jar was placed in the existing Java 21 runtime image and deployed through Compose. The normal repository Dockerfile remains unchanged. The frontend completed its normal Docker/Vite build. Build logs are in `tmp/meal-local-package.log`, `tmp/meal-runtime-build.log` and `tmp/meal-docker-build.log`.
