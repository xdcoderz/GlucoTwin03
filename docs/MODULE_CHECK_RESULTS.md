# Module verification - 1 November 2026

## Subsequent Node 1 research-input extension

The input reader now accepts an explicit local research-validation mode as described in `research/README.md`. Seven new policy/CLI tests use fabricated records only. This change adds no measured real-data accuracy and does not enable real-data delivery to Spring/the public dashboard. The original eight Python tests below describe the earlier modularization checkpoint; the current combined Python suite is 15 tests.

Final integrated acceptance remains scheduled for 2 November. The following are observed independent checks; no full-stack assembly was started during this modularization work.

| Check | Observed result |
|---|---|
| `tools/Module.ps1` default checks | PASS for all seven module entry points; file-presence checks are explicitly distinguished from runtime verification |
| Python unittest suite | 8 tests passed: deterministic history, synthetic provenance, history offsets, invalid glucose, CLI dry run, preview patients, unavailable score responses, unknown routes |
| Replay CLI | Dry run produces 18 JSON events, nine per scenario, even with the target URL set to an unreachable local port; it performs no network delivery |
| Fixture agreement | Both publisher fixtures and Spring resource copies match semantically |
| Fitted model | SHA-256 matches metadata; frozen 43 feature names/order agree with FastAPI and feature dictionary |
| Java feature builder | 5 tests passed; 18 production source files and the test class compiled for Java 21 |
| React dashboard | TypeScript check and Vite production build passed; 648 modules transformed |
| PowerShell runner | Parser check passed |
| Original and module Compose files | Both `docker compose ... config --quiet` checks passed |
| Docker service execution | NOT RUN: Docker Desktop Linux engine is unavailable; Compose validation does not require it |
| November 2 assembly gates | OPEN: real HTTP replay, model execution through Spring, UI verification, outage/recovery, fresh offline archive load, event-machine check |

## Changes verified

- A pre-change source checkpoint preserves the original project at `deliverables/checkpoints/before_module_split_2026-11-01.zip`.
- Module Compose uses a separate project name, images, ports and H2 volume. The original assembly Compose remains available.
- Replay can prepare and validate its event output without Spring; no event values were changed.
- The second backend fixture now includes the same historical glucose section as the publisher fixture. The backend still receives actual readings through ingestion, not by loading that section into H2.
- Preview API serves synthetic fixtures and unavailable/null scores. It never reads the fitted model or returns the historical reference scores.
- Frontend dependencies are recorded in `package-lock.json`; its Dockerfile uses `npm ci`.
- Generated browser/presentation work files, checkpoints and temporary output are ignored by Git; bulky deliverables and temporary files are excluded from Docker build context.

## Environment notes and limits

The first native Maven attempt failed because Java's default certificate trust store could not validate the repository certificate. Using the Windows root certificate store for that process allowed dependency resolution and all five tests passed. Node similarly used `--use-system-ca` during installation. TLS verification remained enabled; the process environment options were restored afterward. Reproduction commands are in `MODULE_PLAN.md`.

The frontend build reports a bundle above 500 kB, and npm reports the existing Recharts 2.x line as deprecated. These do not fail the build. A chart-library migration or bundle optimization is separate work and was not included in this module split.

No Docker image was rebuilt or started today. The October 30 image archive, screenshots, PDF runbook and deck describe the historical baseline and need refreshing after final assembled acceptance. No current runtime availability is claimed. "90%" is the agreed readiness checkpoint, not a measured completion percentage.
