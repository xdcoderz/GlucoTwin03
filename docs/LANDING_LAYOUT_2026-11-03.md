# Landing page layout

## Reading order

1. Shared header and navigation.
2. Full-width introduction with links to Patient workspace and Evidence.
3. Two-column anatomy section: 70% interactive body, 30% organ-name list, excluding the gap.
4. Full-width fictional glucose panel with playback controls.
5. Existing problem statement, workflow and evidence summary.

The research-notice bar is removed from Overview. Notices on the other destinations and the fictional-data descriptions remain in their existing contexts.

## Anatomy interaction

- Five circular markers identify the metabolic structures. Names stay hidden at rest.
- Hover or keyboard focus reveals a name. Clicking or tapping the circle zooms into that structure. The matching list item is selected.
- The right panel contains five organ names in a vertical list: Pancreas, Liver, Digestive Tract, Skeletal Muscle and Adipose Tissue. The former header, tabs, repeated descriptions, workflow highlights and call-to-action card have been removed.
- The same zoom can be triggered from the list or by clicking an organ mesh. Surrounding structures fade for visibility.
- Once the camera settles, an information bar appears directly below the model, above the view controls. It explains the glucose role, the diabetes connection and why the organ is displayed in GlucoTwin. Its biology reference opens a NIDDK page.
- Whole body, Reset 3D or Escape returns to the full-body view and hides the information bar. Keyboard selection and reduced-motion mode skip the camera flight.
- Rapid organ selections cancel the previous camera transition and show information for the latest selection.
- Camera zoom/reset, shell opacity, glucose overlay and ambient particles share one toolbar under the model.
- Explore Anatomy, Guided Journey and About Experience controls are hidden for now.
- Below 900px the model and organ list stack. At phone widths the information bar, glucose summary and chart also stack.

## Implementation

- `frontend/dashboard/src/App.tsx`: Overview notice visibility.
- `frontend/dashboard/src/landing/LandingExperience.tsx`: static introduction and anatomy lifecycle.
- `frontend/dashboard/src/landing/experience.ts`: model, marker labels, organ panel and fictional playback.
- `frontend/dashboard/src/landing/landingLayout.css`: responsive composition.

The patient APIs, model service, database and saved scoring results are unaffected by this layout change.

## Verification

TypeScript checking and seven focused Playwright tests passed. The browser tests cover layout geometry, responsive stacking, each of the five node-driven organ views, information disclosure after camera completion, keyboard selection, reduced motion, rapid switching, model-loading recovery, sample isolation and navigation between destinations.

Desktop and phone renders were inspected. The live Docker verification is recorded in `docs/research/ui_integration_live_2026-11-03.json`; it checks the real services without submitting scores or altering patient journals.

To rebuild only the dashboard from `D:\3Nov`:

```powershell
docker compose build dashboard
docker compose up -d --no-deps dashboard
```

Open `http://localhost:3000`.

## Educational references

- [NIDDK: Insulin resistance and prediabetes](https://www.niddk.nih.gov/health-information/diabetes/overview/what-is-diabetes/prediabetes-Insulin-resistance): pancreas, insulin and tissue response in muscle, liver and fat.
- [NIDDK: Your digestive system and how it works](https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works): digestion and nutrient absorption.

The GlucoTwin connection text describes this project's inputs and boundaries; it is not a biological claim that the viewer measures the selected organ.

Camera motion is occasional and preserves spatial context. The existing GSAP camera/target interpolation lasts one second with `power3.inOut`; reduced motion and keyboard selection use zero duration. This is explanatory 3D canvas motion, rather than a decorative text entrance. Browser checks verified normal/reduced motion and rapid interruption. Physical touch gestures were not tested on a phone.
