# Demo Guide

## Setup before presenting
- [ ] `docker compose up` is already running, dashboard open
- [ ] Dashboard loads both synthetic scenarios: Patient 001 (score `0.368`) and Patient 002 (score `0.989`). Both are uncalibrated model scores.
- [ ] Backup video and PPT PDF open in other windows
- [ ] Wi-Fi not required

## 5-minute script
1. **Problem (30s):** Health history changes over months; glucose changes every few minutes. A doctor needs both at once.
2. **Scenario (30s):** Synthetic patient 001, 52F, T2DM 7 years, HbA1c 7.6%, glucose 112 -> 142 over 2 hours, just ate brown rice + vegetables + chicken.
3. **Target (30s):** Event = >=180 mg/dL or +40 from baseline within 120 min.
4. **Live demo (2 min):** show streaming readings, the model score, the top factors, and the safety banner. Switch from Patient 001 (`0.368`) to the distinct Patient 002 scenario (`0.989`). Say explicitly that scores are uncalibrated and are not treatment recommendations.
5. **Failure safety (30s):** stop the ML service; dashboard shows "unavailable" rather than a made-up score; restart it.
6. **Honesty (30s):** AUC 0.757, F1 not above baseline, 78 missed events, synthetic demo, not validated.
7. **Close (15s):** The contribution is a working fusion loop, not clinical superiority.

## Likely questions
| Question | Answer |
|---|---|
| Why logistic regression? | Deterministic, traceable factors; the contribution is the fusion pipeline, not model novelty. |
| AUC 0.757 isn't great | It shows useful ranking; we report that F1 does not beat the always-positive baseline. |
| Is this clinical? | No. Synthetic data, uncalibrated, no validation, no diagnosis or dosing. |
| How should we interpret the score? | It is an uncalibrated model score, not a clinical probability. Review the target horizon, factors, and safety notice. It does not trigger treatment. |
| What did you build vs reuse? | Our code: fusion, API, dashboard, publisher, model service. Reused: ShanghaiT2DM data, open-source libraries. |
| Why "twin"? | A data-fusion virtual patient, not a physiological simulation. |
| Privacy? | Demo patient and CGM inputs are synthetic. The model was trained on de-identified ShanghaiT2DM research data; participant-level tables are excluded from the public demo. |
| Next steps? | Calibration, larger multi-cohort validation, confidence intervals, fairness analysis, real CGM integration, clinician review. |

## Failure plan
1. Stack won't start -> load Docker images from `glucotwin-images.tar`.
2. Still failing -> play backup video, show screenshots.
3. CGM replay stalls -> restart the deterministic publisher and confirm Spring accepts the HTTP events.


