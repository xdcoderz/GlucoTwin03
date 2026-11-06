# Workspace scenarios and glucose-driven body glow

Open **Glucose scenarios · 3D twin & falling-glucose countdown** below the main history/score area in Patient workspace. It contains the same five fictional stories as Future lab:

- Rise and settle.
- Larger excursion.
- Dip and return.
- Falling trend demo.
- Unusual reading demo.

Selecting a story or sample updates the scenario's chart, glucose overlay, soft body glow and trend projection. Its 3D sample slider is the single playback selection for that module. The recorded timeline and saved score remain separate.

For DEMO-001, selecting the falling-trend demo starts at the fictional 112 mg/dL sample with a slope of −1 mg/dL/min. The illustrated time to 70 is 42 minutes. The clock supports run, pause and reset. Changing the selected sample resets the clock; closing the module disposes it. Existing projection checks withhold unsuitable slopes, gaps, abrupt changes, already-low samples and crossings beyond the demonstration horizon.

## Body glow rules

These are project illustration settings, not clinical classifications:

| Body glow | Display rule |
| --- | --- |
| Soft red | Below 70 or at least 180 mg/dL; also falling at/below 100, or rising at/above 140 |
| Soft green | In-band and steady (absolute rate below 0.5 mg/dL/min), or improving (falling above 100, or rising below 100) |
| Soft blue | Other in-band samples, including unavailable sample trend |
| No glow | Missing/invalid glucose, or overlay switched off |

Trend conditions apply from ±0.5 mg/dL/min. These are visualization choices, not validated health or forecast rules. Red takes precedence at the outer band edges even if the sample is moving back toward the band. No future samples or model score enter these rules.

The earlier organ tint has been removed. All organ materials retain their natural tissue colors and zero status-driven emissive light. Separate translucent Fresnel layers follow the body shell and add a soft outline/surface glow. Both Three.js renderers blend color and strength over 0.5 seconds with GSAP. A new sample interrupts and retargets the current blend. Reduced-motion mode applies the state immediately. Overlay-off and missing samples clear the aura. Paths use the same status color to avoid competing legends.

The shared body presentation code clips shell triangles at y=0.53 and y=1.49 in the supplied asset's coordinates, removing the head and the lower legs. It preserves the neck, torso, arms and thighs. Both cameras frame this smaller region more closely; organ focus/rotation/zoom are retained, and narrow canvases adjust the overview distance to fit. The source GLB is unchanged.

## Landing page

The fictional-day/scripted-curve sample selector drives the same body glow rules as the workspace. A visible text label explains the current glow. Missing samples clear it. Organ colors do not change on hover, selection or glucose updates; surrounding organs may still fade to reveal the selected structure.

## Isolation and implementation

- `WorkspaceScenarios.tsx` mounts the scenario module on demand.
- `visualStates.ts` owns the shared body glow rules.
- `bodyPresentation.ts` owns shell cropping and the separate aura layers.
- The existing `TwinExperience`, `ProjectionPanel` and Three.js scenes are reused.
- Workspace-demo controls have unique IDs, so opening Future lab later does not create duplicate input labels or projection headings.
- Scenario interactions do not call the model, change patient readings, append follow-up records or enter PDFs.
- The guided anatomy tour remains disabled by its existing feature flag.

Tests exercise all five stories, synchronized state, countdown controls, invalid data, overlay removal, responsive layout, distinct labels and unchanged journals/model scores. Real-stack verification uses read-only requests.

Correction verification (3 November): TypeScript and the Docker production build passed. All 14 targeted anatomy, tissue-appearance, scenario and projection assertions passed; the Playwright runner subsequently reported browser-worker shutdown timeouts, so that runner invocation is not recorded as a clean pass. Its log is `tmp/body-glow-tests.log`.

The separate live Docker browser check completed successfully with no browser/shader errors, no POSTs and unchanged journals for both patients. It covered green/red/blue/off states, rapid state changes, reduced motion, neck-to-knees framing, organ focus, mobile layout, the shared workspace aura and the 42-minute fictional projection. Evidence: `docs/research/body_aura_live_2026-11-03.json`. Screenshots: `docs/screenshots/body_aura_green.png`, `body_aura_red.png`, `body_aura_blue.png`, `body_aura_mobile.png` and `workspace_body_aura.png`. Earlier organ-tint screenshots are historical and do not describe the current rendering.
