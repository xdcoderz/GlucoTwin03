# Patient workspace

The main view follows five blocks:

1. Patient and meal: scenario selection, patient summary, recorded meal, meal time and baseline glucose. The full health record remains expandable.
2. Glucose history: compact readiness status and one chart, selected sample, slider and playback controls. Missing or conflicting input history and stream failures stay visible.
3. Score and factors: one 120-minute model score, event definition, one Score & save action and contributing factors. Model diagnostics expand on demand.
4. Follow-up: selected saved attempt and observed outcome. Patient list, older attempts, technical metadata, individual observations and synthetic replay controls are expandable.
5. Review and export: note, review status, mark reviewed/reopen actions and one PDF action. Earlier review notes expand on demand.

On wide screens, glucose history and score/factors sit beside each other. Narrow screens stack the same blocks in reading order.

The expandable [glucose scenario module](WORKSPACE_SCENARIOS_AND_TINTS.md) below that area provides five fictional stories, a synchronized visual twin and the falling-trend countdown. Its data stays separate from the recorded chart and saved model result.

## Optional patient twin

Use **View patient twin** in the history block. The 3D renderer loads when the section opens and is disposed when it closes. It uses the same selected sample and playback state as the main chart; there is no second sample slider. Closing the twin preserves the selected sample.

Unusual-reading flags remain in Future lab. They are removed from the primary patient view. Existing input-validation and readiness errors remain visible in the workspace.

## Guided tour

The guided anatomy tour is hidden throughout the application. Its tour steps, text and navigation code are retained. To restore its entry point later, change:

```ts
// frontend/dashboard/src/site/features.ts
export const FEATURES = { guidedAnatomyTour: true } as const;
```

This does not add a tour to Overview. The flag controls the existing tour entry in the patient/future anatomy component.

## Preserved behavior

- Same Spring/FastAPI interfaces and fitted model.
- Same readiness gate, explicit saved scoring attempts and unavailable-result handling.
- Existing attempts keep their frozen inputs and outputs. A newer attempt can mark an older one superseded.
- Review drafts survive navigation and brief API outages.
- Version selection, synthetic follow-up, review history and bound PDF exports stay available through disclosures.
- Deep links include `#phase-one-flow`, `#score-step`, `#workflow-section`, `#review-section` and `#patient-twin`. The last link opens its collapsed viewer.
- Dark/light themes and narrow layouts remain supported.

Browser verification uses the explicitly synthetic preview API for writes. Real Docker verification is read-only and compares both patient journals before and after.

Verification completed: all 37 browser tests passed for the workflow changes, followed by five passing checks for the final desktop-column/mobile-stack layout and navigation. The Docker build includes TypeScript checking and Vite compilation. The live check confirms the actual saved scores and five factors for both patients, one scoring action, one timeline, optional 3D, hidden tour, Review deep link, phone layout and unchanged journals. Evidence: `docs/research/ui_integration_live_2026-11-03.json`; screenshots: `docs/screenshots/workspace_simple_*` and `docs/screenshots/integrated_live_workspace_*`.
