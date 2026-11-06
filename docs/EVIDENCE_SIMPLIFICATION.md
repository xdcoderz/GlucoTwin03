# Evidence page

The page now prioritizes five subjects:

1. Prediction target: the same composite event within 120 minutes.
2. Data and testing: ShanghaiT2DM-derived meal windows, patient-level split, 493 test meals from 15 test patients.
3. Model/baseline comparison: unchanged AUC, balanced accuracy and F1.
4. Mistakes: 78 missed events and 76 false alarms remain visible. The complete confusion matrix is expandable.
5. Limitations: uncalibrated score, no confidence intervals, no external or clinical validation, and synthetic replay is not validation.

The page includes the model-card download, source dataset DOI and a technical-notes download. It has one bottom link to the patient workspace.

## Supporting material

- Architecture and interface-design references moved into `frontend/dashboard/public/research/PROJECT_NOTES.md`, downloadable from Evidence.
- The 3D explanation is a short expandable note. Detailed anatomy references remain in the organ viewers.
- The validation roadmap and slide download moved to a collapsed section in Future lab.
- `#validation-roadmap` now resolves to Future lab and opens the roadmap. The in-lab shortcut continues to use that address.
- Existing headings, scoring target, evaluation values and model-card contents are preserved. No backend or saved-record behavior changed.

## Verification

The browser check covers offline Evidence access, keyboard disclosure, both themes at desktop/400px widths, downloads and Back/Forward navigation through the relocated roadmap. Existing site and theme checks cover navigation between all four destinations. The Docker dashboard is rebuilt and checked against the real services without writing patient records.
