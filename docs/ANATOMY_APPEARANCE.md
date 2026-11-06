# Anatomy appearance: research, implementation and limits

Updated 2 November 2026.

3 November correction: organ tissue colors now stay fixed in both viewers. Sample status drives a separate, soft whole-body silhouette glow: green, red or blue. The glow never changes organ material colors or emissive light. Both viewers trim the displayed shell at the neck and knees and use a closer overview camera. See `WORKSPACE_SCENARIOS_AND_TINTS.md` for the demonstration rules.

GlucoTwin now uses a naturalistic tissue palette instead of category colors. This is a researched **illustration**, not measured tissue color, patient imaging, an anatomical atlas or evidence of organ health. Improving its appearance does not improve the glucose model's accuracy.

## What the references support

| Structure | Evidence and source | Chosen sRGB base color |
| --- | --- | --- |
| Pancreas | WebPath's normal gross specimen description identifies tan tissue with a lobular structure. [WebPath, university-hosted teaching resource](https://www.tau.ac.il/medicine/tau-only/webpath/panchtml/panc189.htm). | `#c9a384` warm tan |
| Liver | Johns Hopkins describes the liver as dark reddish-brown. [Liver anatomy and functions](https://www.hopkinsmedicine.org/health/conditions-and-diseases/liver-anatomy-and-functions). | `#71382f` dark reddish-brown |
| Digestive tract | Cleveland Clinic describes light pink ileum, with redder jejunum. The viewer does not segment those regions and uses one simplified pale pink color. [Ileum anatomy](https://my.clevelandclinic.org/health/body/ileum). A UPMC surgical case describes pink-tan gastric serosa; this is a specimen observation, not a universal healthy-stomach color standard. [Gross description](https://path.upmc.edu/cases/case36/gross.html). | `#d59b94` pink-tan |
| Skeletal muscle | Heinrich Heine University's experimental cardiovascular research group explains the relationship between myoglobin and red muscle appearance; its illustrated experiments include animal tissue. It supplies the pigment rationale, not a calibrated human muscle swatch. [Myoglobin](https://www.nmr.hhu.de/main/mmyoglobin_e.html). | `#9d4944` muted red |
| Adipose | The University of Galway's Open Histology text describes yellow coloration of white adipose tissue associated with carotene and related pigments. Brown adipose is a different tissue category and is not represented by these patches. [Connective tissue](https://openpress.universityofgalway.ie/openhistology1/chapter/connective-tissue-supports-and-protects/). | `#e3c374` soft yellow |

The hex codes and material roughness values are implementation choices informed by these descriptions. **No source provides these exact numeric colors or validates our rendering.** Do not use stained histology colors, scan label maps or diagram colors as natural surface-color measurements. No source images, textures or models were copied into the app.

## Rendering changes

- `frontend/dashboard/src/anatomy/organs.ts` holds tissue colors, roughness and appearance references, shared with the legend.
- `scene.ts` uses white key/rim lights and neutral hemisphere illumination, reduced exposure, zero tissue metalness and no tissue emission. Gloss/roughness only supplies illustrative surface shading; no measured optical or subsurface-scattering model is implemented.
- Whole-body organs are opaque. Selecting an organ keeps it opaque and fades surrounding organs to reveal it. That transparency is a viewing tool, not natural translucency.
- The body envelope is a neutral translucent locator. It does not claim a universal skin color or infer this patient's pigmentation. Ivory-colored bone landmarks remain simplified illustration choices.
- Removed the bright exterior duct line: the pancreatic duct is internal, and this viewer has no anatomical cutaway model.
- The glucose paths remain a separate graphic. **Show glucose overlay** hides them without changing tissue materials, glucose readings or predictions. Hidden overlays stop their particle animation. This preference survives phase switches and renderer retry.
- Selection uses the label, camera and contextual fading instead of glowing tissue. Both phases use the same anatomical materials; neither a model score nor glucose changes them.
- The viewer includes an expandable explanation with references, available even if WebGL fails.

## Limits and next accuracy step

Real tissue appearance varies with perfusion, oxygenation, tissue composition, illumination, surface moisture, and specimen preparation. Screen tone mapping and display calibration also affect appearance. This palette is not spectrally calibrated.

The existing procedural geometry still approximates organ shapes, positions and proportions. It omits much of the anatomy; the stomach and bowel share one material, fat patches are representative, and muscle meshes are not individual segmented muscles. A realistic color pass cannot turn this into a patient-specific digital anatomical twin.

For higher anatomical fidelity, replace the procedural meshes with a licensed, professionally authored anatomical model, verify spatial relationships and tissue boundaries with an anatomist, and establish a calibrated photographic/material reference workflow. Medical review remains outstanding.

## Verification

`npm run build` and the Docker dashboard build passed. All five existing anatomy tests passed on rerun; the new appearance test passed after correcting its screenshot scope and expected explanatory text. An earlier run hit a five-second WebGL initialization timeout while the Docker build was also running; the unchanged wheel-zoom test subsequently passed. This is functional browser verification, not anatomical validation.

Desktop full-body and pancreas screenshots and the expanded reference section at 400px were visually inspected. No horizontal overflow was found. Screenshots are in `docs/screenshots/tissue_*.png`. The source asset sweep found no new image placeholders, emoji icons, external textures or icon imports. Hardware color calibration, different GPUs and clinical/anatomical expert review have not been verified.

The deployed dashboard at `http://localhost:3000` was checked against the real API after restarting Docker Desktop. Dashboard, Spring and ML containers are healthy. Organ selection, overlay hiding and reference links worked without browser page errors. Real Tab navigation produced a visible disclosure focus outline; 200% CSS zoom introduced no horizontal overflow. The 200% reference panel and live liver view were visually inspected (`tissue_references_200.png`, `tissue_live_liver.png`).

The appearance browser check compares canvas screenshots with the overlay on/off (excluding HTML labels), checks that the overlay stays hidden across a phase switch, exercises organ selection and the reference disclosure, and checks overflow at 400 pixels. Source review confirms glucose updates only overlay materials, not tissue colors.
