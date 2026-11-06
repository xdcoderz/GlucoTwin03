# Visual feature update - 3 November 2026

The viewer now includes separate saved-score and medication-context markers, red/blue glucose pathways, five fictional stories, unusual-reading rules and a clearly labelled local projection clock. See [Visual twin and projection](VISUAL_TWIN_AND_PROJECTION.md) for current controls, calculations, limits and verification. No low-glucose or drug-response prediction model has been added.

# Navigation update — 2 November 2026

The combined experience described below now lives in two destinations: **Patient workspace** for recorded samples and **Future lab** for fictional scenarios. Use the persistent site navigation instead of the former phase cards. See [Site redesign](SITE_REDESIGN.md) for current routes and controls.


# The combined 3D patient experience

Implemented on 2 November 2026. The 3D body is now the main dashboard feature, with two clearly identified data modes. This change is a frontend extension; it does not add a medical prediction model or complete full-stack acceptance.

## What to try

1. Open the running dashboard and select DEMO-001 or DEMO-002.
2. Start in **01 Working prototype**. The body follows the latest received synthetic glucose sample within the meal's two-hour-before/two-hour-after window.
3. Use **3D sample** to choose an earlier sample. The displayed glucose, time, change and body overlay follow that same sample. The chart shows the selected point.
4. Click **Play replay** to advance one sample each second. **Pause replay**, **Previous sample**, **Next sample**, and the sliders give manual control. This is accelerated replay, not real elapsed time.
5. Zoom in or click **Explore the pancreas**. Select liver, digestive tract, muscle or fat to read the existing educational explanation. The six-step guided tour still works.
6. Open **Future lab** and select one of five fictional glucose stories. **Open falling trend demo** starts the projection example; **Show unusual reading demo** starts a scripted jump. These are fictional values, not forecasts.
7. Return to **01 Working prototype** to follow recorded samples again. **Follow latest** resumes automatic selection after manually exploring history.

After the Phase 1 integration on 2 November, use the assembled dashboard at `http://localhost:3000`. The development view at `http://127.0.0.1:5175` now connects to the same Spring API on port 8080 and receives actual fitted-model responses. Docker Desktop and these services must be running. The older isolated native backend on 18085 and the Python module preview are separate from this assembled path. See [Phase 1 Strengthening](PHASE1_STRENGTHENING.md).

## What changes on the body

| Visual | Meaning |
|---|---|
| Teal overlay | Other samples after applying the display bands and trend rules; not a safety category |
| Red overlay | At least 180 mg/dL, or rising at least 0.5 mg/dL/min outside the low display band |
| Blue overlay | Below 70 mg/dL, or falling at least 0.5 mg/dL/min outside the high display band |
| Overlay brightness | Higher displayed glucose produces a brighter overlay; the rendering scale is clipped between 40 and 300 mg/dL |
| Moving dots during replay | The replay is playing; speed is fixed and has no physiological meaning |
| Lines between structures | Schematic explanatory connections, not blood vessels or measured glucose transport |
| Ring at the pancreas | An orientation marker for the primary exploration target, not pancreatic stress or insulin output |
| Arc at the base | Saved uncalibrated composite-event score; not a low-glucose probability |
| Optional blue body outline | Recorded medication context only; not a simulated medication effect |
| Original organ colors and shapes | Identify generic anatomy; they do not change with glucose and do not describe organ health |

These display bands are not patient risk categories. Teal does not mean a patient is safe. No organ dysfunction, hormone output, blood flow or treatment response is inferred. The actual model still produces just one uncalibrated score for its existing composite event.

## Phase 1: received data

```text
Synthetic replay -> Spring /api/patients/{id}/cgm
                          |
                    read every 2.5 seconds
                          |
                validate, sort, select sample
                          |
                  +-------+-------+
                  |       |       |
               3D layer  numbers  timeline
```

- The existing patient overview stays anchored to the meal baseline. Future received samples change the visual replay, not the model's input baseline or saved prediction.
- The visual timeline includes samples from -120 to +120 minutes relative to the configured meal. Timestamps are shown in UTC. It does not pretend replay timestamps are current wall-clock measurements.
- Values advance only when a new sample is selected or received. A straight chart line joins points for readability; values between them are unknown.
- Equal duplicates at the same instant collapse. Conflicting values at the same instant, invalid timestamps and nonpositive/nonfinite values withhold the replay instead of guessing.
- With no samples or meal baseline, the UI shows an empty state. With a disconnected sample endpoint, the body overlay clears and the chart is explicitly retained history. Retry and background polling can recover.
- A post-meal sample can meet the existing >=180 OR rise >=40 event rule. A single sample below both thresholds does not rule out an event elsewhere. This display is not a new model prediction.
- Changing patients resets the mode, timeline and playback. Pending requests are cancelled; one patient's response must not be displayed for the other.

To demonstrate newly arriving follow-up, use the existing research workflow below the viewer: save a scoring attempt, then run a fictional follow-up stage. **Follow latest** will pick up the received data through the same Spring read endpoint. This is still synthetic demonstration data.

## Phase 2: local storyboard

The three scripts live in `frontend/dashboard/src/anatomy/twinSignals.ts`:

- **A - Rise and settle:** fixed offsets from the recorded baseline.
- **B - Larger excursion:** larger fixed offsets, useful for seeing the amber overlay and event example.
- **C - Dip and return:** a deliberately invented dip to 65 mg/dL. No low-glucose predictor is running.

The selected patient's recorded meal baseline and timestamp start each story. There is no personal response estimation: two patients get the same scripted offsets for A/B. The point of this prototype is to demonstrate the interface.

Mocks are local frontend fixtures; a separate mock server is unnecessary for this visual slice. Entering, playing or editing a fictional story makes no API writes. It cannot modify the model score, saved journal, review notes or exported PDF. The Phase 1 baseline and score displayed in the anatomy sidebar are explicitly labelled as separate context.

Phase 2 screens carry **Simulated future vision** and **not a model prediction** labels. Existing PDFs continue to export Phase 1 research records only. Meal/activity comparisons, treatment scenarios and advanced care-team screens remain unbuilt.

## Motion and access

- Replay is opt-in and pausable. Numbers never interpolate toward invented intermediate readings.
- Dots move at a fixed eight-second path cycle only while playing. Motion is explanatory canvas content, not a physiological simulation.
- The scene stops particle animation when offscreen or the tab is hidden. Geometry/materials, timers, observers and listeners are disposed when the view is replaced.
- Reduced-motion users get manual sample controls and static overlays; automatic playback is disabled. Existing keyboard camera controls jump directly.
- Organ navigation and readings remain available if WebGL fails. Retry rebuilds the scene and reapplies its current signal.
- Buttons, native selects and sliders are keyboard accessible. Both phases have a 400px layout.

## Implementation map

| File | Responsibility |
|---|---|
| `frontend/dashboard/src/anatomy/TwinExperience.tsx` | Phase selection, sample polling, play/pause/scrub and timeline |
| `frontend/dashboard/src/anatomy/twinSignals.ts` | Recording validation, display bands and isolated mock scripts |
| `frontend/dashboard/src/anatomy/BodyTwinPanel.tsx` | 3D controls, selected sample, organ guide and tour |
| `frontend/dashboard/src/anatomy/scene.ts` | Procedural anatomy, camera, glucose overlay and particle lifecycle |
| `frontend/dashboard/src/anatomy/twinExperience.css` | Combined desktop/mobile layout |
| `frontend/dashboard/tests/twin.spec.ts` | Stream, mock isolation, playback, failure and accessibility checks |

See [Visual Verification](DYNAMIC_TWIN_QA.md), [Two Phases](PROJECT_PHASES.md), [Phase Checklist](PHASE_CHECKLIST.md), [Anatomy and Sources](ANATOMY_VIEW.md), and [Workflow Guide](WORKFLOW_GUIDE.md).

## Judge explanation

“This body helps us explore one synthetic patient's glucose timeline. The first mode uses the values received by our software. The second mode demonstrates a future interface with fictional curves. Both update the visual body, but neither measures the function of these organs. Our actual prediction remains the separately displayed two-hour event score.”
