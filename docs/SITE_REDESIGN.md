# Organized GlucoTwin website

Implemented 2 November 2026, following the findings in `WEBSITE_ORGANIZATION_REVIEW.md`. The reference site's useful lessons were a clear introduction, persistent navigation and grouped content. Our copy, assets, colors and research scope remain specific to this prototype.

## Hero and clinical-flow refinement

The subsequent refinement opens with **“After the meal, what comes next?”** and explains the problem, doctor/research audience and demo outcome before the workspace controls. The hero pairs our own anatomy screenshot with a clearly labelled static DEMO-001 example and the model's input/event windows. Both the landing explanation and the workspace now follow **Patient → Meal → History readiness → Score → Follow-up**. The automated navigation check verifies these sections appear in that order.

History readiness now has a dedicated visible block before scoring, with the nine required slots, service status, retry, and expandable timing details. The baseline appears with the meal. One score result, one score-and-save action and its factors are grouped together. The full anatomy exploration remains available through the hero and direct link after the five-step research flow.

The primary timeline uses a fixed meal-relative window and labels the shaded follow-up region. Shading indicates time, not uncertainty. Blank future space is not a forecast. Factor bars compare the magnitudes of the actual returned logistic-model contributions within a result; they are not SHAP values, causal effects or confidence intervals. Score uncertainty is explicitly marked as not estimated. Evidence includes a downloadable copy of the project model card and a separate interface-reference disclosure.

### References inspected for this refinement

- [Dexcom Clarity provider page](https://provider.dexcom.com/products/dexcom-clarity): glucose reports and calm data presentation. Inspected text and browser rendering.
- [Tidepool patient-data views](https://www.tidepool.org/providers/viewing-patient-data): audience-led introduction and grouped data views. Inspected text and browser rendering; some remote imagery had not appeared at screenshot capture.
- [Unlearn](https://www.unlearn.ai/): scientific positioning, spacious hero and clear resource navigation. Inspected text and browser rendering.
- [Twin Health](https://www.twinhealth.com/): plain-language digital-twin introduction; text inspected. Its clinical claims are not adopted by our prototype.
- [Samimi et al., visual-conversational diabetes-risk explanation](https://arxiv.org/html/2507.02920v1): concise explanation near a model visualization. Different prediction target and system; no code or chatbot imported.
- [Gaurav, uncertainty dashboard design study](https://dx2905.github.io/FnuGauravWeb/assets/papers/paper-draft.pdf): motivation for making uncertainty visible. Our model has no estimated interval, so no interval was invented.

These are design references, not validation of GlucoTwin's model. No external site branding, screenshots, statistics or treatment capabilities were copied into the product.

The refinement passed the production build, Docker build and **12 targeted browser scenarios** across navigation/order, future isolation, missing history, outages, draft retention, replay, malformed/conflicting streams and unavailable inference. All four destinations were captured at desktop and 400px with no measured horizontal overflow. Mobile readiness and factor/score panels were visually inspected. PDF generation and clinical accuracy were not reevaluated by this visual pass.

The final deployed page was checked at `http://localhost:3000`: hero asset loaded, model-card download returned HTTP 200, the real model reported ready, DEMO-001 retained its `0.368` saved score, and five factor bars rendered without browser page errors. Section positions were in the required order. All four destinations also fit at 200% CSS zoom. Flat rendered-color contrast checks were 8.13:1 for the dark hero caption, 5.81:1 for factor detail text and 5.49:1 for hero body copy. The final hero preview is `docs/screenshots/refined_landing_live.png`.

## Destinations

| URL | Purpose |
| --- | --- |
| `http://localhost:3000/#overview` | Plain-language introduction, actual product screenshot, four-step explanation, entry points to workspace and anatomy |
| `http://localhost:3000/#workspace` | Patient/meal context, baseline, saved score, readiness, one scoring action, prominent anatomy and glucose timeline, factors and follow-up review |
| `http://localhost:3000/#evidence` | Target, held-out metrics and baseline comparison, confusion matrix, architecture, limits and anatomy sources |
| `http://localhost:3000/#future` | Clearly labelled fictional glucose scenarios in a separate destination |

Root `/` opens Overview. Add `?patient=DEMO-002` before the hash to open that patient. Existing section links `#patient-twin`, `#phase-one-flow`, `#prediction-section`, and `#workflow-section` open the workspace at the appropriate section. The history link opens its containing disclosure. Browser Back/Forward restores the destination and patient encoded in the URL.

## Workspace changes

- Patient demographics and the recorded meal now precede the score. Baseline labels consistently use UTC.
- Baseline, saved score and target appear near the top, with input/model readiness beside the score-and-save action.
- **Score & save meal / Score & save new attempt** owns scoring. Journal and detailed checks link back to this action instead of presenting separate names for the same API mutation.
- The duplicate pre-meal chart was removed from the main page. The anatomy experience's timeline remains the primary chart. Exact required pre-meal slots remain available in history checks.
- Full patient context and detailed workflow checks are expandable. Leading factors, saved versions, exports and follow-up review remain available.
- Future scenarios have their own destination. Phase selection cards and repeated nested introductions were removed from the workspace.
- Realistic tissue materials, GSAP camera transitions, tours, replay, overlay controls and reduced-motion support remain in the body viewer. New destination entrances use GSAP with reduced-motion handling.

## Navigation and state

`src/site/location.ts` reads hash and query state and responds to both `hashchange` and `popstate`. The active destination is identified in persistent navigation. Navigation fits four labelled links on mobile. A keyboard skip link reaches the current heading.

Workspace components stay mounted when another destination is selected so a review draft or selected result is preserved. The body renderer initializes after its destination is first visited. Hidden destinations pause replay and overlay animation; anatomy's existing visibility handling also stops hidden particle rendering. Future and working viewers have distinct form/control IDs.

Overview and Evidence render independently of API availability. The workspace supplies loading, retry and connection-loss states. Previously loaded records remain visible during an outage and writes are disabled. Readiness still controls the only score action, including missing/conflicting samples and explicit unavailable model attempts.

The overview image is a local screenshot of our own viewer: `frontend/dashboard/public/images/patient-twin-preview.png`. No third-party product screenshots, branding or feature claims were copied.

## Verification

- Production TypeScript/Vite build and Docker dashboard build passed. The deployed dashboard was checked with the real Spring/ML services.
- Nine targeted browser checks passed: five anatomy checks, the tissue-overlay check, and three new site checks covering destinations, deep links, browser history, API failure/recovery, draft retention, unavailable scoring, mobile layout and future-mode isolation.
- Nine further checks passed across recorded/future replay, sample selection, malformed/conflicting streams, playback, readiness and outage recovery. The older workflow screenshot check needed to open the newly collapsed history disclosure; it passed after that test migration. In total, 18 targeted browser scenarios passed. Tests that referenced the old phase buttons and score actions were updated to the new routes and action names; the entire PDF-producing suite was not rerun.
- Both real demo scores remained available in the deployed workspace: DEMO-001 `0.368`, DEMO-002 `0.989`; model and history readiness were displayed. This read-only live check did not save a new scoring attempt.
- All four destinations were captured at desktop and 400px widths. No horizontal overflow was measured at 400px or 200% CSS zoom. An initial mobile header overlap was corrected and measured again: header ends at 110px, banner starts at 126px.
- Desktop overview/workspace/evidence, mobile overview and 200% future layout were visually inspected. Real keyboard activation and selected navigation states were exercised. Text contrast computed from rendered flat colors: body/secondary copy 5.49:1, section label 5.98:1, primary button 4.96:1.
- Asset sweep found no placeholder images, emoji icons or new icon-library imports. The product screenshot renders locally.

Evidence screenshots use `docs/screenshots/site_*.png`, including `site_deployed_overview.png` and `site_deployed_workspace.png`.

This is a structural frontend change. The fitted model and backend event definition did not change. Full PDF-export regression, screen-reader testing, real mobile hardware, hardware GPU performance and clinical validation were not performed in this pass. The existing bundle-size warning remains.
