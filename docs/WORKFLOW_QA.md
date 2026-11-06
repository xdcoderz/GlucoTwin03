# Research workflow verification - 1 November 2026

Ground truth: current source under `backend/fusion-api`, `frontend/dashboard/src/workflow`, report code, `tools/preview_api.py` and `tools/preview_journal.py`. The original 43-feature model and horizon were not changed. This document records independent module evidence; it does not certify clinical use or the assembled fitted-model stack.

## Automated and runtime evidence

| Check | Result / evidence |
|---|---|
| Backend | 18 Maven tests pass: 5 existing feature-builder tests, 13 Spring/H2 workflow/CORS integration tests. Racing duplicate delivery commits one observation and returns accepted/duplicate without an outer rollback error. |
| History quality | Missing intermediate offset blocks inference with a specific reason. Conflicting baseline withholds current baseline/score. Equivalent duplicate timestamps preserve the original input hash and nine feature observations. |
| Frozen baseline | Adding +15 to +120 readings never moves the 142 baseline or enters a refreshed feature vector. Old snapshot, ID and computation time remain unchanged. |
| Partial/gapped outcomes | Partial nonpositive samples and a seven-sample window at the horizon remain unknown. Completing the eighth point establishes only a complete sampled outcome. |
| Positive partial outcome | One valid >=180 sample establishes an observed event with incomplete coverage. Other patients' timelines remain separate. |
| Conflict/outside-window handling | Conflicting future values are excluded/countable; a +121-minute reading does not enter the observed window or move the meal baseline. |
| Issuance/receipt timing | Follow-up arriving during inference causes a retrospective result; agreement is withheld. Unavailable model and inconsistent model response save null-score failure attempts. |
| Reviews | Append-only reviewed/reopened notes, required-note validation and reconstructing services from the same repositories preserve records. No clinical identity authentication is claimed. |
| Native persistence | Actual executable Spring backend at 18085 used `runtime-data/journal-preview` file H2. After stopping/restarting Java with that same database, stored ID, input hash, computation time, snapshot, notes and observed outcome matched the pre-restart checkpoint exactly. |
| Native browser | Chrome visited Vite 5175 against actual Spring/H2, displayed the persisted result and exported its PDF. No page errors; 400px document width did not overflow. |
| Browser suite | 11 scenarios pass: the original 9 anatomy/export scenarios and 2 workflow scenarios. Workflow covers saving, replay stages, notes/reopen, old-version selection, bound PDF, reload, patient switch, keyboard, long note, loading/empty/error states and recovery. These automated UI fixtures use the memory-only preview adapter. |
| Existing Python checks | 15 tests pass; all seven module-entry checks pass. |
| Packaging configuration | Both Compose configurations parse successfully. Clock environment setting is shared by publisher and backend. No new Docker startup/image archive is claimed. |
| Frontend | TypeScript/Vite production build passes; Three.js and PDF remain separate lazy-loaded chunks. Large-chunk warnings remain. |
| PDF | Text extraction verifies the selected result ID, fingerprint, original baseline, returned unavailable status, coverage and note. The three-page final example was exported from native Spring/H2 and visually inspected. |

## UX and asset review

| Location | State / flow | Rule / issue | Fix | Evidence | Severity |
|---|---|---|---|---|---|
| Native browser/API | Dependency access | Native preview origin was not in the original CORS allowlist. | Explicit local origins plus configured override; unlisted origin still rejected. | Integration preflight test and successful native Chrome session. | Resolved |
| Worklist | Narrow/keyboard layout | Several columns require horizontal scrolling. | Focusable scroll region, accessible name, visible instruction and focus ring. | 400px screenshots; native keyboard focus and no document overflow. | Resolved |
| Journal | Changing versions | A background update could otherwise move the selected result and clear a draft. | Keep an existing selected version during polls; explicit new save selects the newly created attempt. | Version-selection flow and source state guard. | Resolved |
| Outcome state | Missing observations | Empty/partial data must not appear as a negative result. | Nullable event/component/agreement fields with visible coverage and unknown state. | Backend and browser partial/gap checks. | Resolved |

Loading, empty and dependency-failure states have visible feedback/recovery. Save/replay/review actions expose busy feedback and disable repeat submission while pending. Failed actions keep the typed note. Tour and existing WebGL-fallback behavior remain tested separately. Buttons are semantic and keyboard-operable; no modal or URL history flow was introduced.

Asset checks: no emoji used as controls; no placeholder/dead image hosts; no added broken image paths; no missing icon imports. This dense research dashboard does not need decorative catalog illustrations. Existing procedural anatomy remains the requested visual content.

Evidence screenshots under `docs/screenshots`: `workflow_loading.png`, `workflow_empty.png`, `workflow_journal_desktop.png`, `workflow_journal_mobile.png`, `workflow_error_mobile.png`, `workflow_native_h2_desktop.png`, `workflow_native_h2_mobile.png`. The rendered example is `output/pdf/glucotwin_journal_example.pdf`.

Not verified here: actual phone touch/GPU combinations, clinical/anatomical validation, real-user workload benefit, staff authentication, real-patient deployment, independent glucose-model validation, or November 2's full fitted-model/Docker acceptance. The preview's saved unavailable result is not evidence of new model inference or accuracy.
