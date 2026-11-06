# Interactive 3D patient anatomy

Added to the existing React dashboard on 1 November 2026. This is a frontend extension; it does not change features, predictions, clinical scope or the Spring/FastAPI interfaces. Module assembly and final full-stack acceptance remain scheduled for 2 November.

Updated on 2 November: the viewer is now part of the [combined 3D patient experience](DYNAMIC_TWIN_GUIDE.md), with received-sample and fictional-story modes. A separate color/brightness overlay responds to displayed glucose; the underlying organ shapes, colors and explanatory role remain generic. Replay does not estimate organ function.

## Viewer behavior

- Starts at a full-body view with a transparent schematic body, internal organs and representative tissue regions.
- Drag the body to rotate. Click/focus the canvas and scroll, or pinch, to zoom. Zoom progressively shifts the target toward the abdomen; passing the close-view threshold selects the pancreas. Visible Zoom in/Zoom out buttons provide the same route without a gesture.
- Select the pancreas, liver, digestive tract, skeletal muscle or adipose tissue using the labelled navigation or projected hotspots. Each selection centers the camera on its region and opens an explanation.
- Full body / reset returns to the starting view. Zoom and rotation controls, plus a body-opacity slider, remain visible.
- Keyboard: Tab to the canvas or buttons; Enter/Space activates buttons. On the canvas, plus/minus zoom, left/right arrows rotate, and R/Escape reset. Keyboard camera jumps and reduced-motion settings avoid the animated transition.
- The selected patient's actual available baseline glucose and model score are displayed separately as context. Null/unavailable scores remain blank; the viewer never generates or hard-codes a score.
- Geometry, colors and organ positions are generic and illustrative. They do not represent a patient scan, organ damage, secretion, absorption, measured insulin sensitivity, or a physiological simulation. Color identifies structures; it does not encode risk.

## Implementation

`frontend/dashboard/src/anatomy/BodyTwinPanel.tsx` is the React shell and accessible explanation/navigation. `organs.ts` holds educational content, sources and camera presets. `scene.ts` lazily loads Three.js and creates procedural meshes locally, OrbitControls, raycast selection, lighting and camera transitions. `anatomy.css` handles desktop and narrow layouts.

Three.js and its type definitions are pinned to 0.187.0 in package.json and the npm lockfile. No external model downloads, textures, hosted viewers, accounts or keys are needed at runtime. The geometry is original code under the project's code license; dependency licenses still apply. This is approximate teaching geometry, not an anatomical reference atlas.

The full-body silhouette uses surface-of-revolution geometry for torso/limbs and ellipsoids for landmarks. The liver uses a bevelled extruded contour; the pancreas uses a curved tube and lobules; digestive loops are tubular. Skeletal muscle/adipose highlights are representative regions, not complete tissue segmentations.

Rendering is requested when controls, camera, opacity or viewport change; there is no idle spin. Meshes, materials, controls, listeners and renderer resources are disposed on unmount. A graphics-context failure offers Retry and preserves the text-based organ guide. A retry creates a new canvas. The main dashboard still works when WebGL cannot render.

The nearby source links support only the educational text. They are not evidence for GlucoTwin's model performance. The model contains no organ-specific measurements and was not modified by this extension.

## Run and test independently

The standard module preview includes the anatomy view:

```powershell
.\tools\Module.ps1 -Part dashboard -Action Start
# http://localhost:13000
```

This requires Docker Desktop. The preview API returns unavailable scores as before.

For native development, use two terminals:

```powershell
# Terminal 1, from D:\3Nov
python tools/preview_api.py

# Terminal 2, from D:\3Nov\frontend\dashboard
$env:VITE_API_BASE_URL = 'http://127.0.0.1:18081'
npm.cmd run dev -- --host 127.0.0.1
```

Native browser tests use the installed Chrome browser, start their own preview API and Vite server, and stop those servers afterward. Keep ports 18083 and 5183 free when testing. The ordinary native preview can stay on 18081 and 5173:

```powershell
cd D:\3Nov\frontend\dashboard
npm.cmd ci
npm.cmd run build
npm.cmd run test:anatomy
```

Tests use synthetic preview fixtures. No actual ML availability or full-stack integration is claimed from these tests. Hardware-dependent WebGL behavior, actual phone pinch interaction and exact clinical anatomy require separate review. See `ANATOMY_QA.md` for observed results.

## References

The viewer now includes a six-step manual tour. The dashboard also exports a research-summary PDF; see [Tour and Research Export](TOUR_AND_RESEARCH_EXPORT.md) for instructions, snapshot semantics and limitations.

- [Three.js documentation](https://threejs.org/docs/)
- [Three.js OrbitControls source](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/controls/OrbitControls.js)
- [NIDDK: What is diabetes?](https://www.niddk.nih.gov/health-information/diabetes/overview/what-is-diabetes)
- [CDC: Insulin resistance and type 2 diabetes](https://www.cdc.gov/diabetes/about/insulin-resistance-type-2-diabetes.html)
- [NIDDK: Insulin resistance](https://www.niddk.nih.gov/health-information/diabetes/overview/what-is-diabetes/prediabetes-Insulin-resistance)
- [NIDDK: Digestive system](https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works)
