# Dark theme and 3D interaction

The visual direction is inspired by [Specify](https://specifyapp.com/): a charcoal canvas, quiet neutral surfaces, fine borders and lilac/violet accents. The reference was opened in a browser; a screenshot and style inventory are saved under `research/specify-reference-*`. No Specify illustrations, product copy or brand assets were copied into GlucoTwin.

## Theme behavior

- Dark is the default for a new visitor.
- The header button switches between light and dark. The choice persists in browser storage and applies across Overview, Patient workspace, Evidence and Future lab.
- The initial theme is read before React starts, with an early background style to avoid a bright flash.
- If storage is unavailable, the theme can still be changed for the current page.
- `frontend/dashboard/src/site/theme.css` owns the palette and semantic tokens. Existing CSS now uses these tokens for surfaces, text, borders, forms and status states. Charts use theme-aware labels, grids and tooltip surfaces.
- Anatomical tissue colors and glucose signal categories are separate from the interface palette. Dark mode does not turn organs violet or change the meaning of high/low glucose.

## Three.js behavior

Three.js was already installed, pinned at `0.187.0`; the existing renderer, local GLB and OrbitControls are extended rather than installing a second renderer.

- Slow auto-rotation is enabled in the whole-body view when motion is allowed.
- Rotation pauses while the pointer or keyboard focus is inside the model, when the model is outside the viewport, when the tab is hidden, and during organ close-ups.
- Dragging or using manual rotation turns auto-rotation off. The Orbit button can turn it on again in the whole-body view.
- Left/right turn buttons rotate the current camera around its target. New turns, direct manipulation, zooms and organ selections interrupt earlier camera movement.
- Organ nodes and list entries retain the focused camera views and information bar. Surrounding structures fade for visibility; hover and selection highlights help identify a structure.
- Ambient particles and overlay particles remain presentation effects with a separate control. They do not represent measured blood flow or organ activity.
- Reduced-motion mode disables auto-rotation and ambient animation. Keyboard camera actions are immediate. Organ dimensions are unchanged.

The camera uses Three.js/GSAP interpolation for spatial context. Normal organ focus takes one second; a manual turn takes half a second. Existing ambient motion remains inside the canvas. No automatic text entrances were added.

## Source map

| File | Purpose |
| --- | --- |
| `frontend/dashboard/index.html` | Theme bootstrap before React |
| `frontend/dashboard/src/site/theme.css` | Shared palette and component theme rules |
| `frontend/dashboard/src/site/theme.ts` | Apply and persist a theme |
| `frontend/dashboard/src/site/ThemeToggle.tsx` | Accessible header control |
| `frontend/dashboard/src/landing/experience.ts` | Rotation, interruption and model interaction |
| `frontend/dashboard/src/anatomy/TwinExperience.tsx` | Theme-aware chart elements |
| `frontend/dashboard/tests/themeAndMotion.spec.ts` | Theme, persistence, layouts, contrast and motion checks |

## Design checks

The migration inventory is saved in `research/theme-token-migration.json`. Across the 11 existing UI stylesheets, the literal-color search dropped from 700 matches to 21; the remaining matches are words in comments or non-color CSS vocabulary. Literal UI colors are centralized in the theme file. The neutral ramp, spacing, radii and named layers are declared there; existing layout geometry is preserved rather than replaced with a second layout scale. Three.js material and signal colors are intentionally outside this UI color census.

The browser checks render all four destinations in both themes at desktop and 400px widths, exercise the theme toggle and reload persistence, measure key landing text/button contrast, and check auto-rotation pause behavior. Screenshots are saved under `docs/screenshots/theme_*`. Physical touch gestures are not verified on a phone.

The existing model, APIs, H2 data, scoring records and prediction target are unchanged.

The complete 35-test browser suite passed after the theme and camera changes, including scoring, replay, recovery, reviews and PDF exports. The production Docker image also passed read-only browser checks against both real patient records: no browser errors, POST requests or journal changes. Build and verification logs are under `tmp/dark-theme-*`; live evidence is in `docs/research/ui_integration_live_2026-11-03.json`.

Final production contrast measurements for the introduction, primary action and sample note are recorded in `research/theme-visual-verification.json`: 9.83:1, 9.10:1 and 9.36:1 in dark mode; 7.58:1, 4.95:1 and 7.91:1 in light mode. These use computed colors flattened against painted ancestor backgrounds. Desktop and phone renders were inspected in both themes; the final mobile heading spacing and API status indicator were also checked in production.
