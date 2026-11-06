# GSAP visual pass

Implemented 2 November 2026. Open **http://localhost:3000** or the development view at **http://127.0.0.1:5175**.

## What changed

- Installed GSAP 3.15.0 and its React integration 2.1.2, recorded in the npm lockfile.
- GSAP now moves the 3D camera between the whole body and selected organs. Camera transitions last 500 ms and can be interrupted by another selection, drag, rotation or reset.
- The heading, section navigation and phase controls enter together with a short stagger. This runs once per mounted patient view, rather than on background polling.
- Phase source labels fade during mode changes. Workflow completion rails animate when their underlying state changes.
- The visual finish includes a softer page background, stronger heading hierarchy, refined section navigation, inset phase selection, separated telemetry columns, a subtle viewer frame, clearer organ selection and more consistent surfaces.

The scene's existing glucose particles retain their opt-in controls. Readings update at sample boundaries; GSAP does not invent values between samples. Scores and inference behavior are unchanged.

## Motion and cleanup

The motion gate is occasional explanatory movement and workflow state feedback. DOM entrances use transform/opacity, 250 ms duration, 50 ms stagger and the shared ease-out curve. Phase-label fades last 200 ms. Rails use a 250 ms spatial curve. The camera uses the same spatial curve for its 500 ms movement.

`useGSAP` scopes DOM animations to their component. `gsap.matchMedia` disables entrances and phase fades for reduced motion and reverts them when preferences change. Keyboard camera controls and reduced motion jump directly to the target. Active camera movement completes immediately if reduced motion is enabled during it. Camera tweens are killed on interruption, context loss and disposal; React animation contexts are reverted on unmount.

Implementation:

- `frontend/dashboard/src/motion/gsap.ts`: shared GSAP registration and easing.
- `frontend/dashboard/src/motion/MotionDashboard.tsx`: scoped entrance sequence.
- `frontend/dashboard/src/motion/presentation.css`: visual refinements.
- `frontend/dashboard/src/anatomy/scene.ts`: GSAP camera movement.
- `frontend/dashboard/src/anatomy/TwinExperience.tsx`: phase-label fade.
- `frontend/dashboard/src/workflow/PhaseOneFlow.tsx`: state-driven workflow rails.

## Verification

- TypeScript/Vite production build and Docker dashboard build passed.
- Eight browser cases passed: five anatomy cases and three workflow-hardening cases.
- A separate browser check slowed the actual GSAP camera tween to one-tenth speed, captured its intermediate state, restored normal speed and confirmed the organ close-up.
- Rapid phase changes, switching patients, current real model output, reduced motion and 400px document overflow were checked with no browser page errors.
- Desktop and mobile screenshots were visually reviewed: [pancreas](screenshots/gsap_pancreas_desktop.png), [mobile](screenshots/gsap_mobile.png), [camera intermediate frame](screenshots/gsap_camera_intermediate.png).
- Asset check: existing procedural anatomy remains the primary visual. No emoji controls, new icon imports, placeholder images or remote image dependencies were introduced. Generated/vendor files were excluded.
- npm audit reported zero vulnerabilities when the two dependencies were installed.

The build retains its bundle warning: main application approximately 758 kB / 228 kB gzip; lazy scene approximately 599 kB / 152 kB gzip. No hardware frame-rate improvement is claimed. Actual phone gestures and other browser/GPU combinations remain unverified.

## References

- [GSAP React integration](https://github.com/greensock/react): scoped React animation lifecycle and cleanup.
- [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()): media conditions, reduced motion and reverting effects.
- [GSAP documentation](https://gsap.com/docs/v3/): tweens, timelines and easing.
