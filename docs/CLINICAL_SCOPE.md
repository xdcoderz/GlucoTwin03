# Clinical Scope

## Purpose
A research definition used to demonstrate fusion of static and dynamic data. It is **not** a diagnostic, treatment or dosing rule.

## Event definition
At the meal-time baseline glucose `G0`, look forward 120 minutes. The event occurs if, at any point in that window:

- glucose >= **180 mg/dL**, **or**
- glucose rises >= **40 mg/dL** above `G0` (i.e. glucose >= `G0 + 40`).

Worked example (demo patient 001): baseline 142 mg/dL, so the rise rule becomes 182 mg/dL. The fixed 180 rule triggers first.

> Note: when baseline > 140 mg/dL the fixed 180 rule is always the lower threshold; when baseline < 140 the rise rule is.

## Intended use
- Research demonstration on synthetic data.
- Showing a clinician which inputs influenced a score.
- Demonstrating a synthetic patient/meal worklist, saved prediction versions, sampled follow-up outcome review and local review notes. Fictional follow-up replay does not establish model accuracy or patient benefit. Notes are not authenticated clinical sign-off. See `WORKFLOW_GUIDE.md`.
- Local provenance/history validation of de-identified, permitted real-derived research inputs through the separate `--mode research --validate-only` command. See `research/README.md`. This Node 1 feature performs no inference and sends no data to the public application.

## Out of scope
- Diagnosis, treatment decisions, insulin or medication dosing.
- Emergency or real-time safety use.
- Identifiable patient-data handling or clinical deployment. Real-derived research input is limited to the separate local validation path; the public dashboard is still synthetic-only. No clinical/privacy deployment approval is implied.

## Output wording
The dashboard says **"model score"**, not "clinical probability", because calibration has not been established. A warning supports review and follow-up; it does not trigger treatment.

## Review status
Clinical review/sign-off: `<PENDING / NAME / DATE>`
