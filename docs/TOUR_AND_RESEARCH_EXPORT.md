# Guided anatomy tour and research PDF

Implemented independently on 1 November 2026 in the dashboard module. Final Spring/ML assembly remains scheduled for 2 November.

## Use the guided tour

1. Open the dashboard and choose a synthetic scenario.
2. Click **Start guided tour** beside the anatomy heading.
3. Use **Next step** to follow the whole body, digestive tract, pancreas, liver, skeletal muscle and adipose tissue. Each step changes the camera and explains one connection. The order is a teaching sequence, not a simulation of physiological timing.
4. **Previous step** revisits a stop. **Finish tour** confirms completion. **Exit tour** returns to free exploration, and the start/restart control begins again at the body.
5. Selecting another structure manually leaves the tour. Camera controls and the opacity slider remain available. All tour controls are real keyboard-operable buttons. Keyboard activation and reduced-motion settings use immediate camera changes.

The tour does not start automatically or advance on a timer. Educational text remains available when WebGL fails. Retry recreates the 3D view without requiring a new patient or score. Organ source links remain in the explanation panel; see [Anatomy View](ANATOMY_VIEW.md) for sources and geometry limits.

## Download a research summary

1. Finish replay and request/refresh a score in the integrated demo. In independent preview mode, scores intentionally remain unavailable.
2. Click **Download research summary** under the scenario selector.
3. The button changes to **Preparing PDF**. The browser downloads an actual PDF; no print dialog or screenshot service is required.
4. Check browser downloads for `GlucoTwin_<patient>_<capture-time>.pdf`. If generation fails, **Retry PDF download** keeps the dashboard data intact.

The summary includes the patient ID and recorded profile, meal context, captured UTC time, returned score status/version/horizon/threshold/event flag, observed-history vector chart, returned model factors, latest nine valid timestamped readings with source labels, latest event ID and research limitations. Long content wraps and continues on additional pages. An empty timeline has an explicit empty state. Invalid/non-finite readings are excluded with a count; unavailable/invalid scores withhold both score and factor output, even if stale values remain in other response fields.

The click handler clones the API response **before** asynchronously loading the PDF library. Switching patients or receiving another poll during generation therefore cannot mix records in that PDF. Generation makes no inference call and sends no data to an export server. When a saved result ID is present, export uses its immutable input/prediction snapshot and includes the captured follow-up/review history. The scoring action creates the H2 journal entry; downloading the PDF does not create another attempt.

The PDF uses basic Latin text; unsupported characters are replaced with `?`, accents are transliterated, and a rendering note appears if replacement occurs. The current synthetic fixtures use supported text. Full international-font support remains future work.

## Saved identity and legacy timestamp limitation

The workflow extension now provides `predictionId`, `mealId`, `baselineAt`, result issuance `computedAt` and an input-snapshot fingerprint in `journal`. This binds a saved prediction to its original inputs; later readings cannot move the meal baseline. Snapshot export time, actual result issuance time and synthetic observation/replay time are displayed separately. Older/legacy API snapshots without a saved ID retain an explicit timestamp/baseline-linkage limitation. `computedAt` is the Spring result issuance time, not a timestamp measured inside the model pipeline. See [Workflow Guide](WORKFLOW_GUIDE.md).

No predicted future glucose curve is drawn. Contributions are model associations in contribution units, not percentages, causal effects, or measured organ function. The public report remains a synthetic research snapshot, not a clinical record.

## Code and dependencies

- `frontend/dashboard/src/anatomy/BodyTwinPanel.tsx`: six manual tour stops and navigation state.
- `frontend/dashboard/src/types.ts`: shared dashboard response types.
- `frontend/dashboard/src/reports/ResearchExport.tsx`: snapshot, progress/error feedback and download handling.
- `frontend/dashboard/src/reports/researchSummary.ts`: paginated text, vector chart, trace and safeguards.
- `frontend/dashboard/tests/enhancements.spec.ts`: browser and extracted-PDF checks.

jsPDF 4.2.1 is pinned in package.json and the npm lockfile. Export code is loaded on demand. Existing Three.js loading remains separate. Browser download support and standard JavaScript APIs are required; no account, API key, MQTT broker or external PDF service is needed.

## Inspiration and attribution

The user-requested review of [Harshit99090/FRA-analysis](https://github.com/Harshit99090/FRA-analysis) suggested two useful product patterns: a guided visual explanation and a result report. This extension implements those ideas in GlucoTwin's own React/Three.js architecture. No source files, model weights, diagrams, helper scripts or assets were copied from that repository. Its transformer-analysis domain and fallback/generated values do not supply medical evidence or model outputs here.

Implementation reference: [official jsPDF API documentation](https://parallax.github.io/jsPDF/docs/jsPDF.html). Anatomy references are linked in the existing organ guide and Anatomy View document. No external source changes the research model's evidence or validation status.

## Independent verification

From `D:\3Nov\frontend\dashboard`:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run test:anatomy
```

Tests require installed Chrome, Python with pypdf, and free ports **5183 / 18083**. They start and stop their own native preview services. The ordinary preview on 5173 / 18081 can remain open. Existing rendering tests use software WebGL. PDF tests also inspect extracted PDF content, including an explicitly labelled available-score **test fixture**, which is not evidence of live inference. The shareable sample at `output/pdf/glucotwin_research_snapshot_example.pdf` uses actual unavailable-score preview data.

Saved history and meal/baseline binding are now implemented by the research workflow. Deferred: full-stack fitted-model/export acceptance, Docker image rebuild, actual-phone input and other GPU/browser combinations.
