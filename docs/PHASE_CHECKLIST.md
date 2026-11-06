# GlucoTwin: phase checklist

Status updated on 2 November 2026. Update this list when work is actually completed. Product scope: [Our Two Phases](PROJECT_PHASES.md).

## Phase 1 - Working research prototype

Prepared and independently checked:

- [x] Synthetic patient/meal files and pre-meal glucose replay.
- [x] Existing fitted event model and Spring/FastAPI inference code.
- [x] Dashboard, model factors and explicit unavailable state.
- [x] Fixed meal baseline, saved prediction versions and H2 persistence.
- [x] Review worklist, fictional follow-up coverage/outcomes and review notes.
- [x] Illustrative 3D body, guided tour and saved-result PDF.
- [x] 3D glucose overlay and sample timeline connected to received synthetic readings; see [Dynamic Twin Guide](DYNAMIC_TWIN_GUIDE.md).
- [x] Module tests/build checks and documented limitations.
- [x] Backend readiness guide, strict duplicate identity, model response checks, timeout handling and draft preservation.
- [x] Run all services together and verify actual fitted-model results for both patients (2 November).

Still required before claiming assembled completion:

- [x] Verify model outage/recovery and bound dashboard/PDF results in an isolated assembled stack using the real model.
- [x] Verify replay, review history and persistence after recreating Spring in that stack's H2 volume.
- [ ] Complete the remaining [assembly checks](ASSEMBLY_NOV_2.md), event-machine run and backups.

Current runtime evidence: [MVP Acceptance](MVP_ACCEPTANCE.md). The later isolated assembled run passed real ML stop/recovery, full journal persistence after Spring recreation, and matching available/unavailable PDFs. The regular demo database was preserved. Event-machine acceptance and packaging remain pending.

## Phase 2 - Simulated future vision

- [x] Choose the first visual slice: combined 3D body and fictional glucose timeline.
- [x] Create separate, repeatable frontend mock scenarios; no mock backend needed for this slice.
- [x] Build fictional future glucose/high-low visualisations with synchronized 3D overlays.
- [ ] Build the selected meal/activity comparison experience.
- [ ] Build any selected personalised care-team or clinician-selected scenario view.
- [x] Make controls and visuals agree with the selected mock scenario.
- [x] Show Phase 2/simulated labels on implemented screens; mock values are excluded from existing Phase 1 PDFs.
- [ ] Update future presentation slides/exports with the same labels if created.
- [ ] Rehearse explaining which Phase 1 features work and which Phase 2 results are mocked.

Phase 2 checkmarks mean the **simulated demonstration** is ready, not that its underlying medical predictions are implemented or validated.

## Before adding or claiming a feature

- [ ] Its phase and status are clear.
- [ ] Its displayed results have an identified source: observation, fitted model or mock.
- [ ] There is evidence for any claim that it works; a screenshot alone does not prove model performance.
- [ ] It does not quietly expand the current prediction target or replace an unavailable score.
- [ ] The README, relevant guide and presentation describe it consistently.
