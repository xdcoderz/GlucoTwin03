# Model Card: GlucoTwin glucose-event model

## Model
Logistic regression over 43 numeric features, with imputation and scaling fitted on training data. Output is a **model score**, not a calibrated probability.

## Target
Event within 120 minutes of a meal: glucose >= 180 mg/dL or rise >= 40 mg/dL from baseline (see CLINICAL_SCOPE).

## Data
ShanghaiT2DM-derived meal windows. Patient-level split (no patient appears in two splits):

| Split | Patients | Eligible meals |
|---|---|---|
| Train | 70 | 1,871 |
| Validation | 15 | 451 |
| Test | 15 | 493 |

## Test results (threshold 0.50, 493 meals)

| Metric | Value | Baseline |
|---|---|---|
| ROC AUC | 0.757 | 0.500 |
| Balanced accuracy | 0.673 | 0.500 |
| F1 | 0.742 | 0.757 (always-positive) |

| | Predicted no event | Predicted event |
|---|---|---|
| Actually no event | 117 | 76 |
| Actually event | 78 | 222 |

Derived: test event prevalence = 300 / 493 = **60.9%**; recall 0.740; specificity 0.606; precision 0.745.

> The included `model_metadata.json` confirms a 60.9% positive-label rate for this 493-meal test set. The pitch deck's 64.9% does not match the test set; identify which other split it describes or correct the slide.

## Honest reading
ROC AUC shows useful ranking. F1 does not beat the always-positive baseline, and 78 events are missed at 0.50. A lower threshold would trade more false alarms for fewer misses.

## Limitations
- 15 test patients from one Shanghai cohort.
- No calibration, confidence intervals, external validation or fairness study.
- Meal context uses keyword flags only.
- Demo uses synthetic EHR and simulated CGM.

## Intended use / out of scope
See CLINICAL_SCOPE. Not for diagnosis, dosing or emergency use.

