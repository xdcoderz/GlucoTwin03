# Real-data research input: Node 1

GlucoTwin now has a separate local input-validation path for de-identified, real-derived research records. This changes Node 1 (file reading); it does **not** enable real patients in the public dashboard or establish clinical accuracy. The public Spring API and synthetic replay remain demo-only. No participant records were imported, downloaded or evaluated as part of this change.

## Why separate the modes?

- **Demo:** fictional inputs for showing software behavior. Requires `synthetic: true` and `containsRealPatientData: false`.
- **Research:** actual research-derived measurements, with direct identifiers removed and use permitted by the source terms. Requires explicit research declarations and a real meal baseline timestamp. This mode currently validates locally and never sends or prints individual measurements.

`containsRealPatientData: true` means the values originate from real participants, even after identifiers are removed. It does not mean those identifiers should be included. Declaring `deidentified: true` is not anonymization: removing identifiers and checking free-text fields must happen before using the record. Schema checks cannot prove consent, usage rights, or de-identification.

## Where to put private local input

Use `data/private/` or an approved external local folder. `data/private/` and `research-results/` are excluded from Git and Docker build context. Ignore rules prevent ordinary staging/build copying; they are not encryption, access control, or protection against forced uploads. Keep private files out of screenshots, public fixtures and deliverable archives.

The input still uses the existing top-level structure: `schemaVersion`, `provenance`, `patient`, `currentMeal`, `cgmHistory`. Additional identifier fields are rejected. Keep the model inputs in the same documented units; the history contract currently requires exactly nine readings at 15-minute offsets, ending at the meal baseline. Irregular real CGM data needs a separately reviewed preparation step; the validator does not interpolate, impute missing CGM samples, or change units.

## Required research metadata

The following is a **metadata example**, not a real participant record. Do not relabel the fictional demo records as genuine research data.

```json
{
  "provenance": {
    "synthetic": false,
    "containsRealPatientData": true,
    "deidentified": true,
    "researchUsePermitted": true,
    "source": "Dataset DOI/version or approved local source reference",
    "usageTerms": "Applicable license or research-use permission reference"
  },
  "patient": {
    "patientId": "RESEARCH-001",
    "displayName": "RESEARCH-001"
  },
  "currentMeal": {
    "baselineAt": "2025-04-10T12:00:00+05:30"
  }
}
```

Add the actual de-identified profile, meal fields and CGM history following `docs/DATA_DICTIONARY.md`. Retain medication and meal values as recorded; do not invent absent clinical values. `displayName` must equal the pseudonymous `patientId`. Patient IDs must start with `RESEARCH-` and contain only letters, digits and hyphens. Avoid using an original hospital/patient identifier as that alias.

`baselineAt` is the actual meal-time reference, including timezone. Local research validation uses it rather than the demo's simulated October 30 baseline. The example above represents 06:30 UTC, keeping its original instant intact. This path does not infer the outcome in the following 120 minutes.

## Validate one local record

From PowerShell in the project root, with Python 3 installed:

```powershell
python -B cgm-publisher/app.py --mode research --validate-only --fixture data/private/patient.json
```

Expected summary after successful provenance/history validation:

```json
{"status":"validated","mode":"research","readings":9,"sent":false,"modelScored":false}
```

Research mode requires explicit `--fixture` and `--validate-only`. It refuses normal delivery and `--dry-run` event printing. Invalid input produces a generic error without echoing its path, identity or measurements. This validation gate does not certify that every medical field is correct or that a record is free of identifying text.

Default demo behavior remains unchanged:

```powershell
python -B cgm-publisher/app.py --dry-run --fixture data/sample/demo_patient_001.json
```

## How we establish accuracy later

The included model was already fitted using ShanghaiT2DM-derived real research data. Synthetic fixtures only exercise the software. Merely accepting more real inputs does not retrain or improve that model.

Next research stages are to obtain suitable permitted/de-identified data, verify units and timestamps, construct leakage-free pre-meal features, derive observed outcomes from the subsequent 120 minutes, and evaluate on patients not used for model fitting or tuning. Report discrimination, threshold errors, baseline comparison and calibration. No new accuracy result can be reported from this Node 1 validation feature alone.

Real-data inference/evaluation, private storage, access controls and a research-labelled UI require their own module work before participant measurements are connected to the full system. Do not route research records through the public demo by changing provenance flags or patient IDs to DEMO values.

References:

- [scikit-learn: held-out evaluation and cross-validation](https://scikit-learn.org/stable/modules/cross_validation.html)
- [scikit-learn: calibration](https://scikit-learn.org/stable/modules/calibration.html)
- Dataset provenance: `docs/DATA_LICENSE_AND_ATTRIBUTION.md`.

## Tests

`python -B -m unittest discover -s tests` includes seven additional tests of the research policy, timestamps, CLI restrictions and suppression of individual measurements. Their inputs are fabricated solely for testing; passing them is not real-data model validation.
