# Integrated anatomy interface

The interface supplied in `glucotwin.zip` is now the landing-page experience for the existing GlucoTwin application. It is part of the React dashboard, with the existing Spring Boot and FastAPI contracts preserved.

The current visual theme is documented in [Dark theme and 3D interaction](DARK_THEME_AND_MOTION.md). Dark mode uses a Specify-inspired charcoal/violet palette, with a persistent light-mode option and additional model rotation controls.

The patient page now uses the [simplified five-block workspace](WORKSPACE_SIMPLIFICATION.md). Supporting tools are expandable, the chart and optional twin share one timeline, and the guided anatomy tour is hidden behind a feature flag.

The [simplified Evidence page](EVIDENCE_SIMPLIFICATION.md) retains the target, data split, metrics, mistakes and limitations. Longer technical/design notes are downloadable; the validation roadmap is expandable in Future lab.

## What changed

- Overview starts with a full-width introduction directly below the shared navigation. The research-notice bar is removed from Overview.
- The next row has a 70/30 split: the centred interactive body on the left and a simple organ-name list on the right. Smaller screens stack these sections.
- Organ circles reveal names on hover or keyboard focus. Clicking a circle, organ mesh or list item zooms into that structure. When the camera settles, an information bar beneath the model explains its glucose role, diabetes connection and relevance to GlucoTwin, with a NIDDK reference.
- Whole body, Reset 3D or Escape returns to the full-body view. The former dossier header, tabs, repeated highlights and action card have been removed from the right panel.
- Camera controls and visual settings share one toolbar beneath the model. The fictional glucose panel occupies its own full-width row below the model and organ list.
- Explore Anatomy, Guided Journey and About Experience controls remain absent from this simplified explorer. See [landing layout details](LANDING_LAYOUT_2026-11-03.md).
- The hero links directly to Patient workspace and Evidence. The former static hero has been removed.
- Overview retains the problem statement, the five-step workflow and the evaluation summary below the hero.
- Patient workspace, Evidence and Future lab share the new light-blue palette, rounded panels, typography and navigation treatment.
- The same imported procedural GLB is used in the patient and future viewers. Their existing patient context, timeline playback, source labels and controls are preserved.
- The workspace still follows Patient -> Meal -> History readiness -> Score and factors -> Follow-up and review.

## Working features retained

Patient switching, pre-meal history checks, one Score & save action, real-model service requests, contributing factors, immutable saved attempts, follow-up replay, append-only local review notes and browser PDF exports remain connected to their original APIs.

Navigation preserves existing deep links, the selected patient, saved-version selection and local review drafts. The application continues to show unavailable results rather than substitute a score.

## Meaning of the visualizations

The landing-page glucose samples are **fictional illustration data**. They are never sent to Spring, used for inference, added to the patient journal or included in saved research exports. Both landing sample sets are labelled accordingly.

The imported biomarker ranges and status badges were removed. The contextual information bar now explains the model connection and what is not measured. The educational organ descriptions and approximate tissue palette reuse the existing project's documented anatomy content.

The body is generic procedural geometry, not a patient scan or a validated anatomical atlas. Organ function is not measured. Glucose changes affect a separate overlay; organ size, tissue health and treatment response are not inferred.

## Source map

| File or folder | Responsibility |
| --- | --- |
| `frontend/dashboard/src/landing/LandingExperience.tsx` | React lifecycle and loading/failure handling |
| `frontend/dashboard/src/landing/experience.ts` | Adapted imported UI, Three.js renderer and interactions |
| `frontend/dashboard/src/landing/content.ts` | Camera presets and educational organ content |
| `frontend/dashboard/src/landing/experience.css` | Imported styling, scoped to the landing experience |
| `frontend/dashboard/src/landing/landingLayout.css` | Introduction, responsive 70/30 columns, combined toolbar and marker labels |
| `frontend/dashboard/src/site/integrated.css` | Shared design treatment across existing pages |
| `frontend/dashboard/src/anatomy/scene.ts` | Workspace/Future lab GLB loading and existing signal controls |
| `frontend/dashboard/public/models/` | Shared model, manifest and original asset attribution |
| `tools/generate_imported_anatomy.py` | Supplied editable procedural geometry generator |
| `frontend/dashboard/tests/landingIntegration.spec.ts` | Landing, navigation, keyboard, isolation and failure checks |

The GLB is approximately 3.6 MB and loads locally with the dashboard. The imported remote Google Fonts request was removed; the interface uses local font fallbacks. Lucide is pinned in the package lock for the supplied interface's icons. Three.js and GSAP remain on the existing application's versions.

## Build and run

From the project root with Docker Desktop running:

```powershell
docker compose up --build -d
```

Open `http://localhost:3000`. Existing database volumes are retained; do not use a volume-deleting reset to update the UI.

For frontend development:

```powershell
Set-Location D:\3Nov\frontend\dashboard
npm ci
npm run dev -- --host 127.0.0.1
```

The default development API is `http://localhost:8080`. The landing page and Evidence remain usable if the API is disconnected. Scoring requires the real backend and model service.

## Verification

The browser suite uses the existing explicitly labelled preview API for deterministic UI checks. This validates frontend behavior; its fixture responses are not fresh real-model inference evidence. The separately recorded real-stack acceptance run remains documented in `MVP_ACCEPTANCE.md`.

All 27 browser tests passed after integration. They cover both 3D viewers, keyboard controls, reduced motion, mobile layouts, scoring requests, missing history, outage/recovery states, version selection, follow-up, reviews and PDF export. The two workflow issues found during integration were corrected: an explicit new score now opens its latest saved version, and the tests use the single consolidated Score & save action.

The production-container browser check uses the real API and existing fitted-model results for both patients. It checks all four destinations at desktop and 400px widths and compares the complete journals before and after. Its evidence is recorded in `docs/research/ui_integration_live_2026-11-03.json`; the run makes no POST requests.

The asset check found no emoji icons, placeholder hosts or missing local model assets. Imported icons were checked against the installed Lucide exports, the deprecated check-circle alias was replaced and the workspace CTA uses the same icon set. The hero renders the product's actual interactive canvas. The model SHA-256 matches its supplied manifest. Desktop and mobile screenshots were inspected.

```powershell
Set-Location D:\3Nov\frontend\dashboard
npm run build
npx playwright test
```

Chrome uses its normal graphics backend by default. To explicitly exercise software WebGL:

```powershell
$env:GLUCOTWIN_SOFTWARE_WEBGL = '1'
npx playwright test tests/landingIntegration.spec.ts
Remove-Item Env:GLUCOTWIN_SOFTWARE_WEBGL
```

Desktop and mobile screenshots are stored under `docs/screenshots/integrated_*`. A frontend backup made before integration is stored under `output/backups/dashboard-before-interface-2026-11-03.zip`.

### Runtime environment

Docker Desktop initially failed with a local `dockerInference` socket/listener initialization error, then recovered. The dashboard image was rebuilt and its container replaced. The existing Spring and model services, H2 volume and saved patient results were retained. The normal application address is `http://localhost:3000`.
