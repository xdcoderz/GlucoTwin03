# GlucoTwin — 3D human anatomy model generation brief

Prepared from the implemented GlucoTwin viewer on 2 November 2026.

**How to use:** Give this entire Markdown file to your 3D-generation AI or a Blender-capable AI assistant. Ask for the actual editable model and exported `.glb`, not only an image or video. The copy-ready request is in section 12.

**Purpose:** Create a full human body for an interactive browser experience. Users begin at the whole body, zoom toward the abdomen, then inspect the pancreas and other structures involved in glucose regulation.

**Important distinction:** Sections 1–2 describe the existing implementation. The named asset hierarchy, export package and performance budgets below are specifications for a proposed replacement. They are not features already implemented in the app. The current viewer generates geometry in TypeScript and does not yet load a GLB.

## 1. What the current 3D viewer contains

| Component | Current representation | Purpose |
| --- | --- | --- |
| Full-body envelope | Procedural torso, head, neck, ears/nose landmarks, shoulders, arms, hands/fingers, legs and feet | A translucent body outline for orientation |
| Bone landmarks | Simplified collarbone curve and spinal line | Spatial context; not a complete skeleton |
| Pancreas | Curved tube plus 24 overlapping lobule shapes | Main organ of interest and close-up focus |
| Liver | Bevelled, extruded outline | One selectable glucose-related organ |
| Digestive tract | Stomach ellipsoid, upper connecting tube and four rows of intestinal loops | One selectable `gut` group |
| Skeletal muscle | Representative patches in both upper arms and thighs | One selectable `muscle` group; not complete muscle anatomy |
| Adipose tissue | Two representative lower-torso patches | One selectable `fat` group; not measured fat distribution |
| Glucose overlay | Five schematic paths, five particles per path, one elliptical ring near the pancreas | A separate data graphic, not vessels or organ function |
| Stage | Floor grid and circular pedestal | Presentation context |
| Viewer | Perspective camera, neutral lights, orbit controls and raycast selection | Rotate, zoom, select and focus |
| HTML interface | Labels, controls, organ descriptions, guided tour and timeline | Interface elements outside the 3D asset |

The existing procedural shapes are approximate. **Do not reproduce their inaccuracies just to match a screenshot.** In particular, improve organ geometry and depth relationships using anatomical references.

The current body does not contain a complete skeleton, heart, lungs, kidneys, blood-vessel tree, nervous system or microscopic pancreatic anatomy.

## 2. Application components and behavior

These are software components, not meshes to bake into the asset:

| File under `frontend/dashboard/src/` | Responsibility |
| --- | --- |
| `anatomy/scene.ts` | Three.js geometry, materials, lighting, picking, overlay, camera and cleanup |
| `anatomy/organs.ts` | Five organ IDs, colors, descriptions and camera presets |
| `anatomy/BodyTwinPanel.tsx` | Viewer controls, organ navigation, labels, guided tour and WebGL retry |
| `anatomy/TwinExperience.tsx` | Recorded/future modes, timeline, sample selection and replay |
| `anatomy/twinSignals.ts` | Sample alignment, fictional scenarios and overlay display bands |
| `motion/gsap.ts` | GSAP setup and camera-transition easing |

Current integration stack: React 19, TypeScript, Three.js 0.187.0, OrbitControls and GSAP. The model is displayed in a WebGL canvas and must remain usable on a narrow mobile layout.

Existing controls:

- Drag to rotate; wheel/pinch or buttons to zoom.
- Start with the entire body; zoom progressively toward the abdomen and pancreas.
- Select pancreas, liver, digestive tract, skeletal muscle or adipose tissue.
- Keep the selected organ opaque while fading surrounding anatomy.
- Body opacity slider: 5–45%, initially 20%; the shell fades further as the camera approaches.
- Reset to the whole body.
- Six-stop tour: body → digestive tract → pancreas → liver → muscle → fat.
- GSAP camera transition around 0.5 seconds; immediate camera changes for reduced motion.
- Optional glucose-particle motion; no automatic idle rotation.

The replacement asset must support these behaviors without requiring them to be baked into the mesh.

## 3. Required replacement model

Create one generic adult human in a relaxed anatomical stance:

- Entire body visible: head, neck, torso, arms, hands, legs and feet.
- Arms slightly away from the torso; palms generally forward; feet separated enough to read clearly.
- Natural proportions and a clean silhouette. A subtle A-pose is acceptable.
- Neutral anatomical presentation, without unnecessary explicit surface detail.
- Separate body shell and internal anatomy. Internal organs must actually exist as meshes.
- Pancreas must look convincing when the camera approaches it; its quality is the highest priority.
- Major tissues must remain separately selectable and independently hideable.

This is a generic educational body. Do not infer anatomy, sex-specific physiology, organ damage, fat distribution or organ function from the selected patient's glucose, BMI, age or model score.

### Required organ/tissue groups

| App ID | Required content | Generation priorities |
| --- | --- | --- |
| `pancreas` | Head, neck, body and tail, preferably as one continuous surface | Elongated, tapered, finely lobulated appearance; broad head and narrower tail; preserve detail in close-up |
| `liver` | A coherent liver surface with recognizable lobes | Natural curved volume and underside; avoid a flat extruded leaf |
| `gut` | Lower esophagus, stomach, duodenum and small-intestinal loops | Separate submeshes for stomach and duodenum so they can fade independently during pancreas inspection |
| `muscle` | Representative bilateral upper-arm and thigh muscles | Convincing muscle volumes and subtle longitudinal fiber appearance; clearly an illustrative subset |
| `fat` | Representative bilateral abdominal/subcutaneous adipose regions | Soft yellow lobulated tissue; keep separately selectable from skin and muscle |

### Optional context, only after required groups are correct

- Spleen, kidneys, gallbladder, colon or fuller skeletal landmarks.
- Additional muscle groups and more complete fat layers.
- An optional pancreas cutaway, as a separate hidden object.

Optional context is not an additional clinical prediction capability. Do not sacrifice the pancreas or the required groups to build an entire organ catalogue.

## 4. Anatomical arrangement and reveal strategy

Use anatomical patient-left and patient-right, not the viewer's left and right.

- The liver belongs primarily on the patient's right, which appears on the viewer's left in a front view.
- The pancreas lies behind the stomach. Its broad head is on the patient's right within the duodenal curve; the body extends across toward the patient's left and the tail approaches the spleen region.
- The stomach must not be placed behind the pancreas simply to make the pancreas visible.
- The duodenum should form a plausible C-shaped relation around the pancreatic head rather than appear as an arbitrary detached tube.
- Small-intestinal loops belong below the upper abdominal organs. Avoid obvious self-intersections and disconnected floating pieces.
- Muscle and adipose are tissue regions rather than isolated abdominal organs.

**To reveal the pancreas:** let the application fade the body envelope, stomach and surrounding context. Keep the anatomy in place. Do not pull the pancreas forward through the abdominal wall or permanently explode the organs apart.

The pancreatic duct is internal. If created, keep it in a separate hidden cutaway layer. Do not paint a bright external duct along the pancreas surface. Do not add giant visible islets of Langerhans as normal exterior features.

The relationships above are generation requirements, not an assertion that the current schematic geometry already satisfies them accurately. Final anatomy still needs expert review.

## 5. Proposed object hierarchy and selection mapping

Use stable names. The five lowercase group names are the application IDs; the other names below are proposed asset names.

```text
GlucoTwin_Anatomy
├── body_shell
│   ├── shell_head_neck
│   ├── shell_torso
│   ├── shell_arm_right
│   ├── shell_arm_left
│   ├── shell_leg_right
│   └── shell_leg_left
├── bone_landmarks
│   ├── clavicles
│   └── spine_landmark
├── organs
│   ├── pancreas
│   │   └── pancreas_surface
│   ├── liver
│   │   └── liver_surface
│   └── gut
│       ├── esophagus_lower
│       ├── stomach
│       ├── duodenum
│       └── small_intestine
├── tissues
│   ├── muscle
│   │   ├── upper_arm_right
│   │   ├── upper_arm_left
│   │   ├── thigh_right
│   │   └── thigh_left
│   └── fat
│       ├── abdominal_fat_right
│       └── abdominal_fat_left
├── anchors
│   ├── anchor_body
│   ├── anchor_pancreas
│   ├── anchor_liver
│   ├── anchor_gut
│   ├── anchor_muscle
│   └── anchor_fat
└── optional_cutaway                 [hidden]
    └── pancreatic_duct              [optional, internal anatomy only]
```

The arm/leg shell objects can include their hands/feet, or those can be additional clearly named children. The split is for independent control, not a requirement to create visible seams.

Put each organ's anchor at a useful camera/label focus point within that organ. For muscle/fat, choose a representative visible region, not an empty midpoint between bilateral patches.

If the exporter supports custom properties, put this metadata on each selectable organ/tissue group:

```json
{
  "organId": "pancreas",
  "role": "anatomy",
  "selectable": true
}
```

Use the corresponding ID for the other four groups. This metadata is a proposed import contract. The existing raycaster currently expects `mesh.userData.organ`; a loader adapter must propagate the parent group ID to each pickable child mesh. Object names are the fallback if metadata is not preserved.

**Do not fuse skin, organs and tissues into one inseparable mesh or one material.** A single outer-body mesh with organs painted onto it will not work for our interactions.

## 6. Colors and materials

These sRGB hex colors and roughness values match the present viewer. They are illustration choices informed by anatomical descriptions, not measured tissue reflectance or universal medical color standards.

| Material | Base color | Roughness | Metallic | Appearance |
| --- | --- | ---: | ---: | --- |
| `mat_pancreas` | `#c9a384` | 0.53 | 0 | Warm tan, fine lobulation |
| `mat_liver` | `#71382f` | 0.38 | 0 | Dark reddish-brown, smooth soft sheen |
| `mat_gut` | `#d59b94` | 0.42 | 0 | Simplified pink-tan digestive tissue |
| `mat_muscle` | `#9d4944` | 0.62 | 0 | Muted red, subtle fiber direction |
| `mat_fat` | `#e3c374` | 0.65 | 0 | Soft yellow, gently lobulated |
| `mat_body_shell` | `#c4bcb1` | 0.65 | 0 | Neutral envelope, opacity controlled by app |
| `mat_bone_landmarks` | `#e4dac5` | 0.70 | 0 | Ivory illustration color |

Material rules:

- Use standard metallic/roughness PBR materials that can be rendered in Three.js.
- Tissue surfaces have **zero emission**. Do not bake selection glow or colored lighting into textures.
- Use modest surface variation; avoid plastic, chrome, wax, wet glitter or exaggerated pores.
- Keep color, normal and roughness information separate where textures are used. Do not put stained microscopy colors on gross anatomy.
- The shared gut color is deliberately simplified; a more detailed stomach/bowel material split is allowed if documented and referenced.
- Keep the body shell's material independent so the app can change its opacity without altering organs.
- Export clean anatomy materials, preferably opaque by default. The app will apply its x-ray transparency policy; that policy is not natural tissue transparency.
- Use neutral white lighting for previews. Real tissue appearance varies with lighting, blood supply, tissue composition and specimen preparation.

The shell is a neutral locator, not a universal skin tone or an estimate of a patient's pigmentation.

## 7. Coordinates, scale and anchors

### Recommended new asset convention

- Units: meters.
- Standing height: approximately 1.75 m, a generic scale reference rather than a patient measurement.
- Root transform: identity after export; scale `(1, 1, 1)`.
- Ground at the soles of the feet: `Y = 0`.
- `+Y`: up toward the head.
- `+Z`: front/anterior, toward the initial viewer.
- `+X`: patient's left; therefore patient's right is negative X.
- Center the body around `X = 0`. Keep a consistent torso depth origin.
- Initial camera is on positive Z looking toward the body.
- Apply authoring-tool transforms and verify orientation in the exported asset; do not rely solely on Blender's viewport axes.

Do not export a floor, pedestal, cameras, lights or HTML-style labels as part of the anatomy GLB. The application supplies the scene and interface.

### Existing viewer coordinates: compatibility information only

The current procedural model uses arbitrary scene units, not meters. The floor is near `Y = -2.73`; the top of the head is near `Y = 2.88`. The whole-body camera is approximately `(0, 0.25, 11.6)` with target `(0, 0.2, 0)`.

| App ID | Existing focus point `[x, y, z]` | Existing camera distance |
| --- | --- | ---: |
| `pancreas` | `[0.08, 0.68, 0.16]` | 2.65 |
| `liver` | `[-0.23, 1.02, 0.08]` | 3.30 |
| `gut` | `[0.08, 0.30, 0.12]` | 3.60 |
| `muscle` | `[-0.40, -1.10, 0.05]` | 4.00 |
| `fat` | `[0.20, 0.10, 0.04]` | 3.60 |

These are **schematic camera presets, not anatomical coordinates**. Do not force an accurate replacement organ into an inaccurate legacy position. Prefer deriving new camera targets from the exported anchors and each group's bounding box. The existing stage thresholds and zoom limits will also need adjustment to the chosen model scale.

## 8. Keep glucose visualization outside the asset

The anatomy does not calculate a glucose prediction or simulate organ physiology.

Current data path:

```text
Received synthetic samples OR explicitly fictional future scenario
                         ↓
                  Selected timeline sample
                         ↓
             glucose value + display color + playing state
                         ↓
                 Separate graphic overlay

Anatomy geometry and natural tissue colors remain fixed.
```

Existing overlay display colors:

| Displayed glucose | Overlay color | Meaning |
| --- | --- | --- |
| No reading | No visible overlay | Data is absent/unavailable |
| Below 70 mg/dL | `#b9a7ff` | Display band |
| 70 to below 180 mg/dL | `#75ddd3` | Display band |
| At or above 180 mg/dL | `#ffb66f` | Display band |

These are display bands, not organ-health categories. Overlay brightness also varies with the displayed glucose value. Motion is optional, uses a fixed decorative speed, and pauses for reduced motion, hidden views and unavailable samples.

Do not generate glowing pancreas tissue, insulin secretion animations, changing liver shape, organ damage, blood-flow speed changes or actual vascular routes from this signal. No such physiological measurements exist in the MVP. Keep data paths and particles in a separate runtime group; do not permanently embed them in anatomy textures.

## 9. Export requirements and proposed delivery package

Deliver actual assets:

```text
glucotwin-anatomy/
├── glucotwin_anatomy.glb
├── glucotwin_anatomy.blend             # or equivalent editable source
├── anatomy_manifest.json
├── README.md                          # units, hierarchy, counts, texture list
├── ATTRIBUTION.md                     # sources, generation tool, reuse terms
├── previews/
│   ├── front.png
│   ├── side.png
│   ├── back.png
│   ├── abdomen.png
│   └── pancreas_closeup.png
└── textures/                          # source textures, if used
```

- Primary runtime format: **glTF 2.0 binary (`.glb`)**, with geometry, materials and any textures embedded.
- Preserve object names, organ separation and anchors on export.
- No mandatory external texture URLs, paid viewer, API key, remote service or proprietary runtime plugin.
- Prefer ordinary uncompressed GLB for the first integration. Do not require Draco, Meshopt or KTX2 unless an appropriate decoder is deliberately added to the app.
- Rigging and skeletal animation are not required. A static, well-separated asset is sufficient for current interactions.
- Export preview renders under neutral light so the geometry can be reviewed.
- A PNG, video, `.stl`, flattened single mesh or `.obj` alone is not a complete delivery. If the tool cannot export the requested asset, say what it can actually provide.

Example manifest, a **new proposed format** rather than something the current app already reads:

```json
{
  "schemaVersion": 1,
  "asset": "glucotwin_anatomy.glb",
  "units": "meters",
  "standingHeight": 1.75,
  "axes": { "up": "+Y", "anterior": "+Z", "patientLeft": "+X" },
  "rootNode": "GlucoTwin_Anatomy",
  "shellNode": "body_shell",
  "organGroups": {
    "pancreas": { "node": "pancreas", "anchor": "anchor_pancreas" },
    "liver": { "node": "liver", "anchor": "anchor_liver" },
    "gut": { "node": "gut", "anchor": "anchor_gut" },
    "muscle": { "node": "muscle", "anchor": "anchor_muscle" },
    "fat": { "node": "fat", "anchor": "anchor_fat" }
  },
  "optionalContextNodes": [],
  "anatomicalReviewStatus": "not_expert_reviewed"
}
```

## 10. Browser performance targets

These are proposed asset budgets, not measurements of the existing model or guarantees of frame rate:

- Aim for roughly **60,000–150,000 triangles** for the primary asset; justify going above 250,000.
- If possible, provide a separate lighter version around 30,000–60,000 triangles.
- Prefer a primary GLB below 10 MB, ideally below 5 MB where visual quality permits.
- Keep texture dimensions around 1K–2K; use larger textures only for a demonstrated close-up requirement.
- Aim for a few dozen renderable meshes/material primitives rather than hundreds of tiny objects. Optimize within each organ group without merging different selectable organs.
- Use smooth normals, clean topology and sensible UVs. Spend detail on pancreatic shape and visible abdominal structures.
- Avoid dense full-body transparency layers, unnecessary interior faces and duplicate hidden geometry.

Report the actual exported triangle count, mesh count, materials, textures and file size. Test on the intended browser/device after integration.

## 11. Integration work after generation

The replacement will require frontend work; putting a GLB into a folder will not automatically replace the current scene.

1. Place the delivered asset under the dashboard's local public assets, for example `public/models/glucotwin_anatomy.glb`.
2. Add Three.js `GLTFLoader` loading to `scene.ts` with a loading/error path and the current procedural scene as a possible fallback.
3. Read the named organ groups, map their children to existing IDs, and register the correct raycast targets.
4. Keep independent materials so body opacity and contextual organ fading work correctly. Preserve original tissue colors when selection changes.
5. Derive focus targets and camera distances from anchors/bounds; update stage/zoom limits for the asset's actual scale.
6. Recreate or reposition the separate schematic glucose overlay in the new coordinate system.
7. Preserve keyboard controls, reduced motion, guided tour, reset, resize, WebGL recovery and resource disposal.
8. Check whole-body and pancreas detail views at desktop/mobile sizes, with the overlay both shown and hidden.

The model asset is a presentation layer. No backend, model-score or clinical-target change is required to replace the anatomy.

## 12. Copy-ready request for another AI tool

```text
Create an actual editable 3D human anatomy asset for GlucoTwin, a browser-based
research prototype. Deliver the model files, not just an image or video.

Use the full specification in this document. Required result:

1. A complete generic adult body, standing in a relaxed anatomical/A-pose.
   Separate the outer body shell from all internal organs and tissues.
2. Five independently selectable groups named exactly:
   pancreas, liver, gut, muscle, fat.
3. Prioritize the pancreas: a coherent tapered organ with a broad head, neck,
   body and tail, subtle lobulation, and good close-up surface quality.
   Keep it behind the stomach, with its head related to the duodenal curve.
4. Gut must include independently controllable stomach, duodenum and small
   intestine submeshes. Include lower esophagus. Use plausible arrangement,
   not arbitrary floating loops or a pancreas moved in front for visibility.
5. Include representative bilateral upper-arm/thigh muscle regions and
   representative abdominal adipose regions. Keep their limits honest;
   these are not patient-specific measurements.
6. Match the naturalistic material palette: pancreas warm tan #c9a384;
   liver dark reddish-brown #71382f; gut pink-tan #d59b94;
   muscle muted red #9d4944; adipose soft yellow #e3c374.
   Use nonmetallic PBR materials and zero tissue emission. The neutral body
   envelope is a viewing aid and its opacity must be independently adjustable.
7. Create the named hierarchy and anchor empties described in section 5.
   Do not combine the five groups into one fused mesh or texture.
8. Use meters, approximately 1.75 m standing height, feet at Y=0, +Y up,
   +Z anterior, +X patient-left. Apply transforms and verify exported axes.
9. Do not bake UI labels, data particles, glucose colors, lights, floor,
   cameras, selection glow or organ-function animations into the asset.
10. Deliver a self-contained glTF 2.0 GLB, editable source, manifest,
    front/side/back/abdomen/pancreas previews, and attribution/reuse notes.
    Report actual mesh/triangle counts and file sizes. Aim for a browser-friendly
    asset around 60k-150k triangles and below 10 MB, without mandatory decoders.

The application reveals the pancreas by fading surrounding anatomy. Tissue
shapes and colors must not change with glucose. This is an educational generic
body, not a patient scan or a validated physiological simulator.

If you cannot deliver the object separation, file format or anatomical detail,
state the limitation explicitly and identify what needs manual work. Do not
claim a rendered image is an editable 3D model or that AI generation proves
anatomical accuracy.
```

## 13. Acceptance checklist for the generated asset

- [ ] GLB opens and renders, and the editable source is included.
- [ ] Head-to-feet body is complete and oriented correctly.
- [ ] All five named groups exist and can be hidden independently.
- [ ] Body shell transparency leaves internal anatomy intact.
- [ ] Pancreas is recognizable from front, side and posterior inspection.
- [ ] Stomach/pancreas/duodenum relationships are plausible.
- [ ] No exposed external pancreatic duct, giant islets, fused organs or obvious intersections.
- [ ] Organ colors remain naturalistic under white light, without emission.
- [ ] Group anchors sit inside useful visible regions.
- [ ] Pancreas detail remains convincing when zoomed in.
- [ ] No baked labels, fake glucose signals or patient-health effects.
- [ ] Actual asset counts, size, generation provenance and reuse terms are documented.
- [ ] Anatomical limitations and review status are stated honestly.

## 14. References and scope of evidence

Anatomy and appearance references:

- [Johns Hopkins — pancreas anatomy and position](https://www.hopkinsmedicine.org/health/conditions-and-diseases/the-pancreas).
- [WebPath — normal gross pancreatic appearance](https://www.tau.ac.il/medicine/tau-only/webpath/panchtml/panc189.htm).
- [Johns Hopkins — liver anatomy and appearance](https://www.hopkinsmedicine.org/health/conditions-and-diseases/liver-anatomy-and-functions).
- [Cleveland Clinic — ileum anatomy and appearance](https://my.clevelandclinic.org/health/body/ileum).
- [Heinrich Heine University — myoglobin and muscle color](https://www.nmr.hhu.de/main/mmyoglobin_e.html).
- [University of Galway Open Histology — connective/adipose tissue](https://openpress.universityofgalway.ie/openhistology1/chapter/connective-tissue-supports-and-protects/).

Technical references:

- [Khronos — glTF runtime asset format](https://www.khronos.org/gltf/).
- [Three.js documentation — GLTFLoader and scene APIs](https://threejs.org/docs/).

The appearance references support qualitative tissue descriptions, not our exact hex codes or roughness settings. They do not validate a generated mesh. The existing model's exact source and material settings are recorded in `scene.ts` and `organs.ts`; this brief does not assert new anatomical validation.
