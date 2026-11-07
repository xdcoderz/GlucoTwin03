# Demo stabilization, 7 November 2026

Branch: `codex/stabilize-public-demo`.

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

Local verification: production TypeScript/Vite build passed; all 15 Python tests and seven static module checks passed; three selected browser checks passed (same-origin persistence, unavailable meal output, independent mobile review). Browser preview logs still show aborted-client connections during reloads. The full browser suite and the 20-second 3D fallback have not been acceptance-tested in this change. The existing large-bundle build warning remains.

- Run the updated Nginx image and real Spring/model stack together. Docker and Maven are unavailable in the current review environment.
- Resolve remaining full-browser-suite failures and exercise 3D startup on supported hardware and software-rendering environments.
- Verify the fixed-baseline recorded-meal flow and custom meal flow with actual model responses, journal persistence and bound PDFs.
- Configure visitor/session isolation, write protection and request limits before unrestricted public access. Same-origin routing does not add authentication.
- Choose hosting, configure HTTPS, and verify from a separate device/network.
- Reduce large JavaScript bundles and test performance on a slower phone.
- Reconcile older status documents, package a current release, and rehearse the demo.

This change prepares routing for deployment. It does not deploy the application, establish medical accuracy or complete the full acceptance checklist.
