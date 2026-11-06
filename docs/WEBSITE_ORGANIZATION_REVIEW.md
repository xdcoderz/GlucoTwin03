# Website organization review

Reviewed 2 November 2026. Reference: [glucotwin.com/en](https://glucotwin.com/en/). Our artifact: `http://localhost:3000`, compared with the source in `D:/3Nov/frontend/dashboard/src`.

## Main finding

We have substantial working functionality, but the page organizes it by the order features were added. A visitor encounters several introductions before the body, then scrolls past the entire anatomy experience to reach scoring. Presentation, operational research work and fictional future demonstrations compete for the same space.

The reference is primarily a product presentation site. Our current screen is primarily a research workspace. Its useful lessons are a clear opening explanation, persistent navigation, purpose-led section headings, grouped capabilities, and space around each section. Copying its product claims or adding its feature list would not solve our organization problem.

## Evidence from browser inspection

Chrome inspected both sites at 1440×1000 and 400×860. The built dashboard contains the latest tissue-color controls and matches the source reviewed. The reference was readable in Chrome, although the web extraction tool could not retrieve it.

At desktop width, our loaded page was about 5,246 CSS pixels tall with the current saved demo state. Section headings started around:

| Position from page top | Content |
| --- | --- |
| 245 px | Patient overview |
| 480 px | One patient. Two perspectives. |
| 746 px | Inside the glucose story |
| 2,439 px | Research workflow |
| 2,984 px | Glucose history and leading factors |
| 3,474 px | Research worklist |

These positions change with viewport, records and state; they demonstrate the hierarchy problem rather than a performance benchmark. On mobile, the first 860 pixels are largely headers, export controls, navigation and phase selection; the actual 3D body is below that opening screen. Neither site had horizontal overflow at the inspected widths.

Evidence images: `docs/screenshots/organization_reference_top.png`, `organization_reference_features.png`, `organization_current_top.png`, and `organization_current_mobile.png`.

## Findings, ranked

| Priority | Location / evidence | Missing organization or UX issue | Recommended change |
| --- | --- | --- | --- |
| 1 | `App.tsx:114`; opening screenshot | No concise introduction for a judge: who uses this, what question it answers and what the demo proves. “Patient overview” assumes prior knowledge. | Add a compact overview with the problem, intended user, one-sentence target, and two clear routes: open patient workspace / explore 3D. |
| 1 | `App.tsx:119–145`; measured heading positions | Scoring and patient context arrive after the entire anatomy experience. The information needed to understand a meal is spread across distant sections. | Put patient/meal context, history readiness, saved score and one next action together at the top of the workspace. Keep the body prominent alongside this summary or in its dedicated exploration view. |
| 1 | `TwinExperience.tsx:107–112`; mobile screenshot | Three nested introductions and large phase cards delay the actual experience. Working and future modes appear as peers inside the main working screen. | Give future scenarios their own clearly labelled Future lab destination. Use one workspace title and one concise context strip. |
| 2 | `App.tsx:119`; computed nav position `static` | The section navigation scrolls away and has no selected-location state. Links jump within a very long page. | Persistent compact navigation with an active destination; desktop sidebar or top bar and a labelled mobile menu. Preserve direct links and browser Back/Forward. |
| 2 | `PhaseOneFlow.tsx` next action; `App.tsx:176`; `ResearchWorkflow.tsx:57` | The same refresh endpoint is exposed as Request model score, Refresh model score and Save scoring attempt. “Save” also computes a new attempt. | One clearly owned score-and-save action. Other screens link to it; journal actions focus on choosing, reviewing and exporting an existing attempt. |
| 2 | `TwinExperience.tsx` timeline; `App.tsx:145`; `BodyTwinPanel.tsx:147` | Baseline, score and glucose graphs repeat across panels. A selected follow-up sample can sit near a meal-time score without enough visual separation. | One primary glucose timeline. Keep baseline/result metadata anchored and identify selected sample separately. Pre-meal-only inspection belongs in a history detail view. |
| 2 | `App.tsx:183` | Patient and meal context is last, after the journal, despite defining the question the model answers. | Compact patient header plus meal card before scoring. Full EHR fields in an expandable context panel. |
| 2 | `App.tsx:128`; UTC labels elsewhere | Baseline card uses browser-local time while the replay and journal use UTC. The same baseline appears as 17:30 and 12:00 UTC on this machine. | Use one explicit timezone throughout, or label both local and UTC deliberately. |
| 2 | Opening screenshot; repeated labels in anatomy/workflow | Small text, uppercase micro-labels and repeated disclaimers/technical detail compete with the main content. Polling intervals and backend terminology appear in the central product explanation. | Stronger readable body type, fewer heading levels, one consistent section style, one persistent research banner, and concise contextual caveats. Move operational detail into a status disclosure. |
| 2 | Live page vs README/model card | The app has no clear evidence destination showing what has been evaluated. Visitors see polished visuals without a compact explanation of the model's demonstrated limits. | Add Evidence & method: target, synthetic demo/training distinction, held-out metrics, baseline comparison, missed events, calibration limits and references. |

These are primarily medium-severity friction and comprehension findings. The observed layouts did not show a blocked interaction or lost draft. Structural redesign is recommended before adding further visual effects.

## Proposed navigation

```text
GlucoTwin
├── Overview
│   ├── Problem and intended user
│   ├── What the working demo delivers
│   ├── Health record + glucose + meal → score → follow-up review
│   └── Open workspace / Explore the body
├── Patient workspace
│   ├── Patient + meal header
│   ├── Readiness + saved score + next action
│   ├── Prominent 3D body and a single glucose timeline
│   ├── History / factors / patient-context details
│   └── Follow-up and saved-result review
├── Evidence & method
│   ├── Target and architecture
│   ├── Held-out evaluation and baseline
│   └── Limits and sources
└── Future lab — simulated
    └── Fictional timeline scenarios and aspirational workflow visuals
```

Overview serves judges and newcomers. Workspace serves the person actually using the demo. Future lab remains accessible without interrupting the real scoring workflow. The body stays a major visual feature, with a direct route and a prominent position in the workspace.

## Borrow selectively from the reference

- A confident, concise opening explanation.
- Persistent navigation and clearly named destinations.
- Features grouped by the user's purpose.
- A simple input-to-output diagram.
- Actual product visuals beside a short explanation.
- A dedicated explanation of evidence and operating scope.

The reference also has a long page, a crowded desktop navigation and extensive feature claims. Those are not patterns to duplicate automatically. Its insulin delivery, pump integration, chat, wearable and forecasting claims are descriptions on that site, not capabilities verified for our project or validated here. Its closed-loop controller and glucose trajectory forecasting differ from our 120-minute binary meal-event classifier. Their absence is not a missing implementation requirement for Phase 1.

Suggested opening copy for our project:

> Explore how patient context and glucose history can help anticipate a post-meal glucose event.
>
> GlucoTwin is a doctor-facing research prototype. Select a synthetic patient, inspect the meal and glucose history, request a 120-minute event score, and review the recorded follow-up.

Keep a visible synthetic-data and uncalibrated-score label nearby. Avoid implying patient-specific organ simulation, validated clinical benefit or a recommended treatment.

## Implementation order

1. Establish the navigation and separate the four destinations, preserving patient selection and unsaved review notes.
2. Reorder the workspace around patient/meal → readiness → score → follow-up; keep 3D prominent.
3. Consolidate score actions and duplicated data presentations. Make clock conventions consistent.
4. Apply a shared typography/spacing system and progressively disclose secondary controls, status details and long explanations.
5. Verify direct links, Back/Forward, keyboard navigation, reduced motion, mobile layouts, API/model failure states and draft retention after the structural change.

## Review boundaries

This pass inspected the sites and our source and saved evidence; it did not change application code. It did not submit anything on the external site or verify that site's medical, dosing, model-performance or device-integration claims. Existing local scoring/review records were read without creating new attempts. Failure-state regression, full keyboard walkthrough and browser-history behavior after a future redesign remain to be tested.
