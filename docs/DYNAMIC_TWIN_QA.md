# Combined 3D experience: verification

Verified 2 November 2026 against the current local React source and installed Chrome. These checks cover the visual experience; they do not establish clinical accuracy or full Docker/FastAPI assembly.

## Results

| Check | Evidence |
|---|---|
| TypeScript and production build | PASS: 910 modules; scene remains lazy loaded. |
| Received-sample integration | PASS: new API samples update the 3D signal, displayed value and chart; scrubbing keeps its selected timestamp across polling. Follow latest resumes tracking. |
| Fixed meal baseline | PASS: a displayed future sample does not overwrite the meal baseline. |
| Phase 2 isolation | PASS: choosing, scrubbing and playing fictional stories issues no API writes and leaves the Phase 1 score unchanged. |
| Color and sample agreement | PASS: larger-rise fixture shows 209 mg/dL at +60 for baseline 142; dip fixture shows 65 and the violet overlay. |
| Playback | PASS: start, advance, pause, resume and stop at the final sample. A controlled test clock avoids racing one-second samples with slow software-WebGL clicks. |
| Patient switching | PASS: switching to DEMO-002 resets mode/playback; baseline is 190 and its larger-rise mock is 257 at +60. |
| Dependency and data failures | PASS: disconnected sample API clears the overlay; retry restores it. Empty, malformed and conflicting records do not produce invented samples. |
| Keyboard/reduced motion | PASS: native phase controls and sliders work from keyboard; reduced-motion playback is disabled and manual selection works. |
| Mobile | PASS: both modes at 400px without horizontal document overflow. Screenshots visually reviewed. |
| Existing anatomy | PASS: all five earlier anatomy cases, including organ selection, wheel/keyboard zoom, reset, opacity and WebGL failure/retry. |
| Existing guided tour | PASS: six stops, back, finish, restart and manual exit. |

Twelve distinct browser scenarios passed in the targeted runs: five anatomy cases, six new twin cases and one tour case. Existing PDF-generating tests were not rerun or used to overwrite the saved report examples for this frontend-only change.

Run the relevant browser checks from `frontend/dashboard`:

```powershell
npm.cmd run build
npx.cmd playwright test tests/anatomy.spec.ts tests/twin.spec.ts
npx.cmd playwright test tests/enhancements.spec.ts --grep "guided tour: ordered"
```

The test configuration starts an isolated synthetic preview API on 18083 and Vite on 5183. It does not require or start the fitted ML service.

## Native Spring/H2 check

The running Vite preview at port 5175 was also checked against the actual Spring/H2 instance on 18085, without mocked network routes or API writes:

- DEMO-001's saved meal baseline remained **142 mg/dL**.
- Its latest received follow-up sample was **146 mg/dL**, displayed at **+120 minutes**.
- Switching to Phase 2 and +60 minutes showed the separately labelled **209 mg/dL fictional value**.
- Canvas screenshots differed during playback and were byte-identical after pausing, confirming the rendered motion actually starts and stops.
- No browser page errors or POST requests occurred during this visual check.
- The 400px native page had no horizontal overflow.

The native preview's ML endpoint remains intentionally offline. The score stayed unavailable. No assembled model acceptance or new predictive capability is implied.

## Visual, motion and asset review

Verdict: approve the tested visual slice.

- Motion gate: opt-in explanatory canvas content. Glucose numbers change only at sample boundaries. Particles use a fixed path speed, capped at 30 rendered frames/second, with static alternatives and pause. No new decorative CSS animation was added.
- Source review and browser checks cover disposal, reduced motion, WebGL retry, sample switching and playback. Native canvas comparisons verify moving versus paused output.
- Assets are clean: no emoji controls, placeholder image hosts, missing new image references or new icon imports. The primary illustration is the existing procedural anatomy, extended with a separate data overlay. No external model/image download or dependency was introduced.
- The Phase 2 source labels stay visible in the combined screen; the anatomy itself also labels simulated glucose. Organ explanations continue to state what is not measured.

Not verified: actual phone pinch gestures, other browser/GPU combinations, sustained hardware frame-rate performance, anatomical fidelity, clinical accuracy or complete Docker/ML assembly. The production build retains its bundle-size warning: application/chart chunk about 670 kB (195 kB gzip), scene about 600 kB (152 kB gzip). A successful build is not a performance benchmark.

## Screenshots

- [Recorded desktop](screenshots/twin_recorded_desktop.png)
- [Future pancreas close-up](screenshots/twin_vision_pancreas.png)
- [Recorded mobile](screenshots/twin_recorded_mobile.png)
- [Future mobile](screenshots/twin_vision_mobile.png)
- [Native Spring recording](screenshots/twin_native_recorded.png)
- [Native simulated pancreas view](screenshots/twin_native_vision.png)

Usage and interpretation: [Dynamic Twin Guide](DYNAMIC_TWIN_GUIDE.md).
