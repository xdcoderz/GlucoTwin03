# Demo stabilization and connected runtime

Branch: `codex/stabilize-public-demo`.

## Dashboard loading and 3D recovery, 11 November 2026

The production JavaScript entry dropped from 816.00 KB to 348.04 KB before compression, and from 244.85 KB to 114.73 KB with gzip. The Overview defers workspace code and its readiness, worklist and meal polling until the workspace is opened. Direct workspace links scroll after the deferred content mounts. If a workspace or scenario module fails to load, the navigation stays available and the section offers a reload.

On detected software graphics, the Overview uses a smaller drawing buffer and starts with rotation and particle motion off. Users can turn them on. Idle views skip GPU draws, and instant camera resets update the organ markers directly. A stalled Overview module shows a fallback after 20 seconds. The workspace and evidence remain reachable.

The connected local services restarted with the existing demo database. A browser check opened the score section directly and confirmed the saved 0.368 result and the ready model. The production build passed. The separate 669 KB 3D bundle still triggers a build warning. Rapid switching and the focused reset passed on software WebGL. The longer Overview walkthrough exceeded its 120-second test budget after completing the organ-marker round trips. Full graphics and Docker verification remain open.

Nine of the ten focused browser checks passed together. The remaining cockpit fixture raced with browser teardown during a routed background poll. The fixture now reuses one prepared response, and the individual rerun passed. The checks cover deferred downloads, direct score links, failed workspace download and reload, stalled Overview fallback, software graphics idle and reset, and the core cockpit and preview flows.

## Connected runtime, 9 November 2026

The visible localhost cockpit now runs against the actual native Spring Boot/FastAPI stack, not the unavailable-only preview adapter. Java 21 and a cached Maven 3.9.14 installation were found outside PATH; the existing Python environment provides scikit-learn 1.9.1. No machine-wide installation or retraining was needed. Startup/restart instructions are in [Connected local demo](CONNECTED_LOCAL_DEMO.md).

Verified: 27 backend tests, 44 real runtime acceptance checks (baseline, workflow, actual model outage/recovery and backend-restart persistence), six actual-browser check groups, saved PDF content and the production TypeScript/Vite build. After the proxy/UI changes, all six targeted preview regression cases also passed. Aggregate evidence is [connected local run](research/connected_local_2026-11-09.json).

The first actual browser custom-meal POST exposed a 403 CORS failure missed by preview-only checks: the proxy replaced the frontend Host. Vite now preserves it, and the browser rerun passed while an unrelated Origin remained rejected. Nginx was updated to preserve `$http_host` as well, but its container path is still unverified. This local success does not close Docker/Nginx, broader graphics/browser, public hosting or model-validity gates.

The test database on port 18086 was isolated from the visible demo. Its temporary backend/frontend have been stopped. The visible route is `127.0.0.1:5173` -> `127.0.0.1:8080` -> `127.0.0.1:8000`; durable demo records use `runtime-data/local-demo.mv.db`. A real score was saved through the visible UI. The old preview adapter still intentionally returns unavailable when run separately.

## Historical position, 8 November 2026

The patient cockpit and shared history are described in [Patient cockpit](PATIENT_COCKPIT.md). The main patient representation is lightweight educational geometry, with the existing WebGL explorer optional. Observation selection does not recalculate the saved meal result. The workspace distinguishes preview data, API connection and model readiness.

The current production frontend build passed with the existing large-bundle warning. All 19 Python tests passed. The full browser suite has **not** passed: earlier broad runs stopped with graphics/time-budget failures, and the later 31-check run was interrupted after further landing-graphics failures. Targeted checks are not a replacement for those open gates.

The final cockpit verification group passed **10 browser checks**: three patient-cockpit checks, two same-origin/unavailable-result checks, three custom-meal checks and two saved-workflow checks. They verify shared selection, fixed meal-result context, synthetic follow-up, patient isolation, stream failure, meal request handling and saved review/export behaviour using the preview API and explicit UI fixtures. They do not run the actual fitted-model stack. The new cockpit tests initially exposed a test comparison mismatch between rendered inner text and DOM text; the comparison was corrected and all three then passed without weakening the state checks.

After the final accessibility labels and partial-event wording changes, all **four cockpit checks** passed, including an additional numeric-score/partial-event UI fixture. A subsequent TypeScript check passed before the wording-only change. Manual layout inspection captured the implemented cockpit; scripted layout checks found no horizontal overflow at 320, 400 and 1440 pixels in light/dark themes, and no page errors. These checks leave the broader graphics and assembled-runtime gates open.

Test-only reset is opt-in and restricted to loopback binding. Browser cases now start from fresh preview state. A separate assembled-demo GitHub Actions workflow was prepared for real-stack inference, outage/recovery and persistence; it has not been executed here. Docker/Maven remain unavailable locally. No public deployment or clinical readiness is claimed.

## Changes

- The browser defaults to `/api` on the website's own origin. Nginx forwards those requests internally to Spring; a visitor no longer needs a backend on their own localhost.
- The module dashboard uses the same route with `API_UPSTREAM=mock-api:18081`. The ordinary dashboard defaults to `spring:8080`.
- Vite forwards `/api` to `VITE_PROXY_TARGET` (default `http://127.0.0.1:8080`) for local development. `VITE_API_BASE_URL` remains an optional explicit override for existing integrations.
- Slow 3D startup reaches the existing fallback after 20 seconds, keeping the written patient information available. A later successful initialization can recover the viewer.
- The workflow test checks the saved meal baseline in the current interface. The mobile review test creates its own initial record. The recovery test allows background polling to reconnect without racing a disappearing retry button.
- New browser checks cover same-origin requests, saving/reloading an unavailable attempt, and explicit unavailable custom-meal results against the synthetic preview API.
- GitHub Actions configuration runs Python integrity checks, Java tests, a production frontend build and the new browser smoke checks. Remote execution requires committing/pushing this branch and is not yet verified.

## Running locally

Full application: `docker compose up --build`, then open `http://localhost:3000`.

Frontend development: start the backend, then run `npm ci` and `npm run dev` in `frontend/dashboard`. To use a different local backend, set `VITE_PROXY_TARGET` before starting Vite.

Browser smoke checks: from `frontend/dashboard`, run `npx playwright test tests/publicDemo.spec.ts`. These start a synthetic preview server and deliberately verify unavailable model outputs; they do not exercise the fitted model.

## Remaining gates

### Second stabilization pass

- Added a 16-request burst regression check and increased the preview server's connection backlog. Cancelled browser reads no longer produce noisy response-write tracebacks.
- Coalesced 3D redraw requests into one frame and cancel the queued draw during disposal. This avoids repeated draws when context, signal and opacity update together; it is not a measured frame-rate benchmark.
- Inactive twin views suspend their glucose polling and resume when selected again.
- Organ controls expose their organ names to assistive technology without decorative numbering.
- The meal-twin startup assertion allows 15 seconds, still below the application fallback deadline of 20 seconds. Its eventual successful hardware rendering remains a separate verification gate.
- Python: all 16 tests passed, including the concurrent request test. Production build and a subsequent TypeScript check passed. The custom-meal persistence test passed after the preview fix. Two same-origin preview smoke checks passed in the subsequent run.
- The broad 46-test run was interrupted after graphics failures to investigate them. It did not complete and is not a passing full-suite result. The graphics-focused runs also did not establish that all actual GPU rendering tests pass. Remaining browser regressions and Docker acceptance stay open.
- The final stalled-import regression passed: after the 20-second deadline the fallback appears, Retry is available, the Liver guide works, and the meal form remains editable. GitHub Actions now includes this check alongside the same-origin preview checks. This verifies fallback behavior, not GPU rendering success.

### Third stabilization pass

- Known software graphics renderers (SwiftShader, llvmpipe and software rasterizer) use a smaller drawing buffer, a maximum drawing rate of 24 frames per second and immediate camera navigation. Hardware graphics retains its original resolution limit and animated navigation. This is an adaptive rendering policy, not a measured 24-FPS guarantee.
- All three custom-meal browser tests and both saved-workflow browser tests passed together. They cover exact input delivery, saved meal isolation, clearing stale scores, displayed 3D score context, invalid inputs, unavailable outputs, fictional follow-up coverage, review/reopen history, saved-result PDF contents, result identity and mobile outage recovery. These use the preview API and explicit UI fixtures, not the real fitted model.
- The keyboard/reduced-motion anatomy check passed. The long mouse-control walkthrough still needed investigation after reaching its original 40-second total timeout. It retains every assertion, omits two expensive full-panel screenshot captures and has a 90-second total budget for its two viewer initializations and multiple interactions. Screenshots on failure remain enabled.
- The production frontend build passed with the existing large-bundle warning; the subsequent TypeScript check passed. No full-browser-suite or hardware-wide performance pass is claimed.
- GitHub Actions now installs the PDF parser and runs the verified meal/workflow test group in a separate invocation, so it starts its own fresh preview state. Remote CI execution remains unverified until this branch is pushed.
- The final mouse-control walkthrough passed within its 90-second budget, preserving all original assertions for organ selection, zoom/reset, opacity and patient switching. Together with the five meal/workflow checks and keyboard check, seven targeted browser tests passed in this pass. The two anatomy checks are also included in CI in their own invocation. This does not close the remaining full-suite and Docker gates.

Historical first-pass verification: production TypeScript/Vite build passed; 15 Python tests and seven static module checks passed; three selected browser checks passed. At that point, the full suite and 20-second fallback had not been acceptance-tested. Subsequent targeted fallback verification is recorded above. Use the current-position section for the latest status.

- Run the updated Nginx image and real Spring/model stack together. Docker and Maven are unavailable in the current review environment.
- Resolve remaining full-browser-suite failures and exercise 3D startup on supported hardware and software-rendering environments.
- Verify the fixed-baseline recorded-meal flow and custom meal flow with actual model responses, journal persistence and bound PDFs.
- Configure visitor/session isolation, write protection and request limits before unrestricted public access. Same-origin routing does not add authentication.
- Choose hosting, configure HTTPS, and verify from a separate device/network.
- Reduce large JavaScript bundles and test performance on a slower phone.
- Reconcile older status documents, package a current release, and rehearse the demo.

This change prepares routing for deployment. It does not deploy the application, establish medical accuracy or complete the full acceptance checklist.
