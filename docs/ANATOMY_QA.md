# Anatomy viewer verification - 1 November 2026

For the 2 November combined phase modes and dynamic glucose overlay, see [Dynamic Twin Verification](DYNAMIC_TWIN_QA.md). The notes below describe the earlier extension; shared anatomy screenshots were refreshed during the new regression checks.

Ground truth: current source under `frontend/dashboard/src/anatomy/`, compiled with the current npm lockfile. Browser tests ran that same source via Vite against `tools/preview_api.py` using synthetic fixtures, installed Chrome and software WebGL. No live-model or assembled-backend inference is implied.

## Observed checks

| Check | Result / evidence |
|---|---|
| TypeScript and production build | PASS. Latest extension build compiles 905 modules including lazy-loaded PDF support; the Three.js scene remains a separate lazy-loaded chunk. |
| Full-body view and organ selection | PASS. All five organ/tissue choices change the explanation and scene focus. |
| Pancreas drill-down | PASS through the explicit Explore button, repeated Zoom in controls, and focused-canvas wheel zoom. |
| Reset and rapid selections | PASS. Full-body reset no longer reactivates automatic pancreas focus during the outward camera transition. |
| Patient context | PASS. Switching to DEMO-002 shows its ID and 190 mg/dL baseline; no reference score is fabricated by preview. |
| Body-opacity control | PASS. Keyboard adjustment updates the range value. |
| Keyboard/reduced motion | PASS. Organ selection, camera zoom, rotation and reset work; keyboard/reduced-motion camera changes are immediate. |
| 400px layout | PASS. No horizontal document overflow; organ selection remains available. Screenshot below. This is viewport emulation, not an actual phone pinch test. |
| Missing WebGL and retry | PASS. Organ explanation and patient context remain accessible; restoring test WebGL availability and clicking Retry creates a new canvas and restores the selected pancreas view. |
| Browser suite | Original 9 scenarios pass after workflow integration; 2 added workflow scenarios also pass (11 total). `npm.cmd run test:anatomy`. |
| Existing Python suite/module checks | 15 tests passed and all module entry checks passed. No backend/model source was changed. |

## UX, motion and asset review

UX-check guided the labelled controls, keyboard equivalents, status feedback and dependency-failure recovery. Motion review covers the viewer's controls; the 3D camera is product content. Camera movement provides spatial continuity between body and organ, with interruptible requestAnimationFrame transitions and no idle rotation. Keyboard actions and reduced-motion settings skip camera interpolation. These camera behaviors were exercised in the browser suite.

Asset-check found no emoji controls, placeholder image hosts, missing image paths or invalid icon imports in the new component. The illustration is the actual procedural 3D anatomy requested for this feature; no unrelated decorative illustrations/icons were added to the dashboard. Source and generated dependency directories were excluded from third-party asset editing.

| Severity | Skill | Location | Finding | Fix | Evidence |
|---|---|---|---|---|---|
| Resolved | UX-check | Full-body reset | Automatic drill-down could retrigger during the outward transition. | Skip automatic selection during programmatic camera transitions. | Browser reset/drill-down test now passes. |

Verdict for the tested module flows: approve. Not verified: real touch/pinch on hardware, browser/GPU compatibility beyond tested Chrome software rendering, clinical/anatomical accuracy, and live Spring/ML integration. Broader existing dashboard loading/error states were not changed in this extension.

## Screenshots

- `docs/screenshots/anatomy_full_body.png`
- `docs/screenshots/anatomy_pancreas.png`
- `docs/screenshots/anatomy_mobile.png`
- `docs/screenshots/anatomy_webgl_fallback.png`

The production build still reports chunks over 500 kB. The scene chunk is approximately 597 kB uncompressed (152 kB gzip); the existing chart/application chunk is approximately 641 kB (186 kB gzip). No performance improvement is claimed from the successful build alone.

## Guided tour and research export extension

The extension suite exercises all six tour stops, backward navigation, Finish, Restart, Exit, manual organ selection, keyboard activation and a 400px reduced-motion layout. The WebGL-failure scenario also walks the text-based tour before recovering graphics.

PDF checks exercise unavailable preview output, an explicitly labelled available-score test fixture, patient switching while the export module loads, empty CGM, long title/meal text, stale factor suppression, generation failure and a successful retry. Browser-downloaded PDFs were read with pypdf and all six rendered pages across three two-page cases were visually inspected. Charts, wrapped content, margins and page footers are legible without overlap. The final example uses unavailable preview data; available-score QA values are not new model inference evidence.

The changed desktop/mobile UI screenshots are `guided_tour_desktop.png`, `guided_tour_mobile.png`, `research_export_desktop.png` and `research_export_retry_mobile.png` in `docs/screenshots`. Asset checks found no emoji controls, placeholder images or invalid icon imports. This data dashboard needs no additional decorative illustration. Runtime-dependency audit returned zero reported vulnerabilities at the time of this check; this is not a security guarantee.

The subsequent workflow extension provides saved result IDs, fixed meal/baseline linkage, server issuance times and H2 history. See [Workflow Guide](WORKFLOW_GUIDE.md) and [Workflow QA](WORKFLOW_QA.md). Remaining limitations include assembled fitted-model export acceptance, actual touch hardware and other GPU/browser combinations. Tour/PDF usage: [Tour and Research Export](TOUR_AND_RESEARCH_EXPORT.md).
