import {sampleGlow} from '../anatomy/visualStates';
import {createBodyAura,cropBodyShell,BODY_CENTER} from '../anatomy/bodyPresentation';
import { gsap } from 'gsap';
import { createElement, ArrowLeft, Plus, Minus, ChevronRight, RotateCcw, RotateCw, Orbit } from 'lucide';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  organs,
  organOrder,
  daySamples,
  scenarioSamples,
  type OrganId
} from './content';

export function mountLanding(app: HTMLDivElement, onRetry: () => void) {
const lifetime = new AbortController();
function listen<T extends EventTarget>(target: T, type: string, handler: EventListener) {
  target.addEventListener(type, handler, { signal: lifetime.signal });
}


app.innerHTML = `
  <section class="experience" aria-label="GlucoTwin interactive anatomy">
    <div class="atmosphere" aria-hidden="true"><div class="aura aura-one"></div><div class="aura aura-two"></div><div class="aura aura-three"></div><div class="grain"></div></div>
    <div class="anatomy-workbench" data-testid="landing-workbench">
      <section class="landing-model-column" aria-label="Interactive body and view controls">
        <div class="landing-stage" data-testid="landing-stage">
          <div class="landing-stage-caption"><span>INTERACTIVE ANATOMY</span><span>Select a circle to explore an organ</span></div>
          <button id="back-to-body" class="back-to-body" hidden><i data-lucide="arrow-left"></i><span>Whole body</span></button>
          <span id="focused-organ-name" class="focused-organ-name" hidden></span>
          <div id="scene" aria-label="Interactive 3D human anatomy. Drag to rotate; use the controls to zoom."></div>
          <div id="scene-tooltip" class="scene-tooltip" aria-hidden="true"></div>
          <div id="hotspots-layer" class="hotspots-layer" aria-label="Anatomical landmarks"></div>
    <!-- Scene Loading & Error Overlays -->
    <div class="scene-loading" id="scene-loading" role="status">
      <div class="loading-spinner"></div>
      <span>Initializing 3D Anatomy<span class="loading-dots">…</span></span>
    </div>

    <div class="scene-error" id="scene-error" hidden>
      <h2>Scene Initialization Paused</h2>
      <p id="error-text">Your browser paused WebGL rendering.</p>
      <button id="retry-scene">Restore Scene</button>
    </div>


        </div>
        <section id="organ-info-bar" class="organ-info-bar" aria-labelledby="organ-info-title" hidden>
          <header class="organ-info-heading"><h2 id="organ-info-title" tabindex="-1"></h2><span id="organ-info-role"></span></header>
          <div class="organ-info-grid">
            <div><h3>Glucose role</h3><p id="organ-info-glucose"></p></div>
            <div><h3>Diabetes connection</h3><p id="organ-info-diabetes"></p></div>
            <div><h3>Why it’s in GlucoTwin</h3><p id="organ-info-project"></p></div>
          </div>
          <footer class="organ-info-footer"><span>Educational anatomy · organ function is not measured.</span><a id="organ-info-source" target="_blank" rel="noreferrer">Biology reference · NIDDK</a></footer>
        </section>
        <p id="organ-focus-status" class="sr-only" role="status" aria-live="polite"></p>
        <div class="scene-tools" aria-label="Model and visual controls">
          <div class="camera-control-group"><span class="control-group-label">Camera</span>
      <div class="camera-buttons">
        <button id="zoom-out" aria-label="Zoom out" title="Zoom Out"><i data-lucide="minus"></i></button>
        <button id="zoom-in" aria-label="Zoom in" title="Zoom In"><i data-lucide="plus"></i></button>
        <span></span>
        <button id="reset-camera" title="Reset View">Reset 3D</button>
      </div>
          <div class="rotation-controls" aria-label="Model rotation">
            <button id="rotate-left" aria-label="Rotate model left" title="Rotate left"><i data-lucide="rotate-ccw"></i></button>
            <button id="auto-rotate" class="rotation-toggle" aria-label="Auto-rotate model" title="Toggle slow auto-rotation" aria-pressed="true"><i data-lucide="orbit"></i></button>
            <button id="rotate-right" aria-label="Rotate model right" title="Rotate right"><i data-lucide="rotate-cw"></i></button>
          </div>
          </div>
      <div class="view-settings">
        <div class="setting-row">
          <label for="opacity">Shell Opacity</label>
          <output id="opacity-value" for="opacity">25%</output>
        </div>
        <input type="range" id="opacity" min="5" max="50" value="25" aria-label="Adjust body shell opacity">

        <div class="setting-row toggle-row">
          <span>Glucose overlay</span>
          <button id="overlay-toggle" class="switch" role="switch" aria-checked="true" aria-label="Toggle illustrative glucose overlay"><span></span></button>
        </div>
        <div class="setting-row toggle-row">
          <span>Ambient particles</span>
          <button id="motion-toggle" class="switch" role="switch" aria-checked="true" aria-label="Toggle ambient bio-dust particles"><span></span></button>
        </div>
      </div>


          <p class="camera-help">Drag to rotate. Focus the model to zoom with the scroll wheel.</p>
        </div>
      </section>
    <aside class="editorial-container" aria-label="Organ explorer">
      <nav class="organ-list" aria-label="Choose an organ">
        <ul>
          ${organOrder.filter(id => id !== 'body').map(id => `
            <li><button class="organ-button" data-organ="${id}" aria-pressed="false" aria-controls="organ-info-bar">
              <span>${organs[id].name}</span><i data-lucide="chevron-right" aria-hidden="true"></i>
            </button></li>
          `).join('')}
        </ul>
      </nav>
    </aside>


    </div>
    <section class="insight" aria-label="Fictional glucose panel">
      <div class="sample-summary">
      <div class="sample-label">
        <span class="sample-dot"></span>
        <span>FICTIONAL GLUCOSE SAMPLES</span>
      </div>

      <div class="glucose-reading">
        <span id="glucose-value">112</span>
        <span class="reading-unit">mg/dL<span>ILLUSTRATION ONLY</span></span>
      </div>

      <div class="sample-meta">
        <span id="sample-time">08:00</span>
        <span class="data-divider"></span>
        <span id="sample-band">70–179 display band</span>
      </div>


        <p id="body-glow-label" class="sample-note body-glow-status" role="status"></p><p class="sample-note">Fictional samples, not patient readings or predictions. A soft glow surrounds the body: green for in-band and steady or improving, red for concerning samples, blue for neutral. Organs keep their natural colors. These are demo display rules, not measured organ health.</p>
      </div>
      <div class="sample-playback">
      <svg id="mini-chart" class="mini-chart" viewBox="0 0 240 52" preserveAspectRatio="none" role="img" aria-label="Fictional glucose samples, not a model forecast">
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--signal)" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="var(--signal)" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path class="chart-area"/>
        <path class="chart-line"/>
        <circle class="chart-point" r="4"/>
      </svg>

      <div class="sample-timeline">
        <button id="play-samples" class="text-play" aria-label="Play timeline animation" aria-pressed="false">Play</button>
        <input type="range" min="0" max="17" value="2" id="timeline" aria-label="Select sample reading">
        <span id="timeline-end">23:00</span>
      </div>

      <div class="sample-tabs" aria-label="Telemetry scenario">
        <button id="day-mode" class="active" aria-pressed="true">Fictional day</button>
        <button id="scenario-mode" aria-pressed="false">Scripted curve</button>
      </div>


      </div>
    </section>

  </section>
`;
const refreshIcons = () => {
    const icons = { ArrowLeft, Plus, Minus, ChevronRight, RotateCcw, RotateCw, Orbit };
    app.querySelectorAll<HTMLElement>('[data-lucide]').forEach(element => {
      const key = (element.dataset.lucide || '').replace(/(^|-)([a-z])/g, (_match, _separator, letter: string) => letter.toUpperCase());
      const icon = icons[key as keyof typeof icons];
      if (icon) element.replaceWith(createElement([icon[0], { ...icon[1], class: 'lucide', 'stroke-width': '1.6', 'aria-hidden': 'true' }, icon[2]]));
    });
};

refreshIcons();

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => app.querySelector<T>(selector)!;

// State Variables
let selected: OrganId = 'body';
let sampleIndex = 2;
let scenario = false;
let overlayVisible = true;
let particleMotion = true;
let opacity = 0.25;
let playing = false;
let sampleTimer: ReturnType<typeof setInterval> | undefined;
let loaded = false;
let contextLost = false;
let sceneVisible = true;
let disposed = false;
let frameId = 0;
let lastRenderedAt = 0;
let needsRender = true;
let autoRotation = true;
let pointerInsideStage = false;
let cameraTween: gsap.core.Timeline | undefined;
let cameraDeadline: ReturnType<typeof setTimeout> | undefined;
let bodyAura: ReturnType<typeof createBodyAura> | undefined;
let bodyGlow=sampleGlow(null);


// Mouse & Parallax State
const pointer = new THREE.Vector2();
const mouseNormalized = new THREE.Vector2();
const targetParallax = new THREE.Vector2();
const currentParallax = new THREE.Vector2();
let hoveredMesh: THREE.Mesh | null = null;

// Three.js Instances
let renderer: THREE.WebGLRenderer;
let softwareGraphics = false;
let controls: OrbitControls;
const host = $('#scene');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 35);
const anatomyRoot = new THREE.Group();
const overlays = new THREE.Group();
const reticleGroup = new THREE.Group();

const groupMeshes = new Map<OrganId, THREE.Mesh[]>();
const shellMeshes: THREE.Mesh[] = [];
const targets = new Map<OrganId, THREE.Vector3>();
const pickables: THREE.Mesh[] = [];

// Overlay Paths and Dynamic Particles
const particlePaths: THREE.CatmullRomCurve3[] = [];
const particleMeshes: THREE.Mesh[] = [];

// Ambient Bio-Dust Particle System
let ambientParticlesMesh: THREE.Points;
const ambientParticleCount = 80;

const raycaster = new THREE.Raycaster();
const timer = new THREE.Timer();
timer.connect(document);
let resizeObserver: ResizeObserver | undefined;
let visibilityObserver: IntersectionObserver | undefined;

// Reduced Motion Detection
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = reducedQuery.matches;

// Create 3D Scene
function createScene() {
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    const gl = renderer.getContext();
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererName = String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    softwareGraphics = /swiftshader|llvmpipe|software rasterizer/i.test(rendererName);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, softwareGraphics ? .75 : 2));
    app.dataset.graphicsQuality = softwareGraphics ? 'reduced' : 'standard';
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    host.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.autoRotateSpeed = 0.22;
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('aria-label', 'Interactive body. Drag to rotate; plus and minus buttons zoom.');
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.addEventListener('focus', () => { controls.enableZoom = true; });
    renderer.domElement.addEventListener('blur', () => { controls.enableZoom = false; });
    controls.minDistance = 0.25;
    controls.maxDistance = 4.8;
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = Math.PI - 0.25;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.7;
    controls.addEventListener('change', () => { needsRender = true; });

    controls.addEventListener('start', () => {
      cameraTween?.kill();
      gsap.killTweensOf(camera.position);
      autoRotation = false;
      syncRotation();
    });

    // WebGL Context Management
    renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      contextLost = true;
      stopPlayback();
      showError('WebGL rendering context paused by browser. Click below to restore.');
    });

    renderer.domElement.addEventListener('webglcontextrestored', () => {
      contextLost = false;
      $('#scene-error').hidden = true;
    });

    // Studio Lighting Rig (Vibrant Medical-Tech Palette)
    const hemiLight = new THREE.HemisphereLight('#f0f9ff', '#94a3b8', 1.8);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#fffbf2', 2.2);
    keyLight.position.set(-2.5, 4.2, 3.8);
    scene.add(keyLight);

    const rimCyan = new THREE.DirectionalLight('#ffffff', 1.4);
    rimCyan.position.set(3.5, 2.8, -2.5);
    scene.add(rimCyan);

    const rimViolet = new THREE.DirectionalLight('#ffffff', 1.2);
    rimViolet.position.set(-3.2, 1.8, -2.0);
    scene.add(rimViolet);

    const fillLight = new THREE.DirectionalLight('#ffffff', 1.1);
    fillLight.position.set(0, -1.5, 2.5);
    scene.add(fillLight);

    // Ground Studio Pedestal & Concentric Rings
    createStudioFloor();

    // Ambient Floating Bio-Dust Particles
    createAmbientBioDust();

    // 3D Holographic Reticle / Scan Ring
    createHolographicReticle();

    scene.add(anatomyRoot, overlays, reticleGroup);

    // Initial Camera Position
    camera.position.set(0, BODY_CENTER, 2.05);
    controls.target.set(0, BODY_CENTER, 0);
    controls.update();

    // Pointer Interactivity (Hover & Raycasting)
    let pointerDownPos = { x: 0, y: 0 };
    renderer.domElement.addEventListener('pointerdown', (e) => {
      renderer.domElement.focus({ preventScroll: true });
      pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    renderer.domElement.addEventListener('pointermove', onPointerMove);

    renderer.domElement.addEventListener('pointerup', (e) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 6 || !loaded) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pickables, false);
      const hit = hits.find(
        (h) => h.object.visible && ((h.object as THREE.Mesh).material as THREE.Material).opacity > 0.12
      );

      if (hit && hit.object.userData.organ) {
        selectOrgan(hit.object.userData.organ as OrganId);
      }
    });

    renderer.domElement.addEventListener('pointerleave', () => {
      hideTooltip();
      clearMeshHover();
    });

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    visibilityObserver = new IntersectionObserver(
      (entries) => {
        sceneVisible = entries[0].isIntersecting;
        if (!sceneVisible) stopPlayback();
      },
      { rootMargin: '100px' }
    );
    visibilityObserver.observe(host);

    loadAnatomy();
    render();
  } catch (err) {
    console.error(err);
    showError('WebGL is not available in this environment.');
  }
}

// Studio Floor: Concentric Tech Rings & Soft Pedestal Shadow
function createStudioFloor() {
  const ringMat1 = new THREE.MeshBasicMaterial({
    color: '#60a5fa',
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide
  });
  const ring1 = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.484, 120), ringMat1);
  ring1.rotation.x = -Math.PI / 2;
  ring1.position.y = 0.002;
  scene.add(ring1);

  const ringMat2 = new THREE.MeshBasicMaterial({
    color: '#a78bfa',
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide
  });
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.68, 0.683, 120), ringMat2);
  ring2.rotation.x = -Math.PI / 2;
  ring2.position.y = 0.002;
  scene.add(ring2);

  // Soft Radial Drop Shadow
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const ctx = shadowCanvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, 'rgba(30, 41, 59, 0.32)');
  grad.addColorStop(0.6, 'rgba(56, 189, 248, 0.08)');
  grad.addColorStop(1, 'rgba(30, 41, 59, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.2),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.5, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.001;
  scene.add(shadow);
}

// Ambient Floating Bio-Dust / Micro-Particles
function createAmbientBioDust() {
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(ambientParticleCount * 3);
  const scales = new Float32Array(ambientParticleCount);

  for (let i = 0; i < ambientParticleCount; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 1.8;
    positions[i * 3 + 1] = Math.random() * 1.8;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
    scales[i] = Math.random() * 0.5 + 0.5;
  }

  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

  // Particle Dot Canvas Texture
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const radGrad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  radGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  radGrad.addColorStop(0.3, 'rgba(125, 211, 252, 0.8)');
  radGrad.addColorStop(1, 'rgba(125, 211, 252, 0)');
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);

  const mat = new THREE.PointsMaterial({
    map: tex,
    size: 0.045,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  ambientParticlesMesh = new THREE.Points(geom, mat);
  scene.add(ambientParticlesMesh);
}

// 3D Holographic Reticle / Scan Ring
let reticleInnerRing: THREE.Mesh;
let reticleOuterPulse: THREE.Mesh;

function createHolographicReticle() {
  reticleGroup.visible = false;

  // Segmented inner ring
  const innerGeom = new THREE.RingGeometry(0.08, 0.084, 48);
  const innerMat = new THREE.MeshBasicMaterial({
    color: '#38bdf8',
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide
  });
  reticleInnerRing = new THREE.Mesh(innerGeom, innerMat);
  reticleGroup.add(reticleInnerRing);

  // Outer glowing pulse ring
  const outerGeom = new THREE.RingGeometry(0.12, 0.123, 48);
  const outerMat = new THREE.MeshBasicMaterial({
    color: '#818cf8',
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide
  });
  reticleOuterPulse = new THREE.Mesh(outerGeom, outerMat);
  reticleGroup.add(reticleOuterPulse);

  // Crosshair ticks
  const tickMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.7 });
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.003, 0.024), tickMat);
    tick.position.set(Math.cos(angle) * 0.105, Math.sin(angle) * 0.105, 0);
    tick.rotation.z = angle;
    reticleGroup.add(tick);
  }
}

function updateReticlePosition(id: OrganId) {
  if (!reticleInnerRing || !reticleOuterPulse) return;
  if (id === 'body') {
    gsap.to([reticleInnerRing.material, reticleOuterPulse.material], {
      opacity: 0,
      duration: 0.4,
      onComplete: () => {
        reticleGroup.visible = false;
      }
    });
    return;
  }

  const target = (targets.get(id) || new THREE.Vector3(...organs[id].focus)).clone();
  reticleGroup.position.copy(target);
  reticleGroup.visible = true;

  // Face the camera
  reticleGroup.quaternion.copy(camera.quaternion);

  const scale = id === 'pancreas' ? 0.75 : id === 'liver' ? 1.3 : id === 'gut' ? 1.1 : id === 'muscle' ? 1.5 : 0.9;
  reticleGroup.scale.setScalar(scale);

  gsap.fromTo(
    [reticleInnerRing.material, reticleOuterPulse.material],
    { opacity: 0 },
    { opacity: 0.75, duration: 0.6, ease: 'power2.out' }
  );
}

// Load Anatomy Asset and Set Up Glass & Jewel Materials
function loadAnatomy() {
  $('#scene-loading').hidden = false;
  $('#scene-error').hidden = true;

  new GLTFLoader().load(
    '/models/glucotwin_anatomy.glb',
    (gltf) => {
      if (disposed) { disposeTree(gltf.scene); return; }
      anatomyRoot.add(gltf.scene);

      gltf.scene.traverse((node) => {
        if (node.name.startsWith('anchor_')) {
          const id = node.name.replace('anchor_', '') as OrganId;
          node.updateWorldMatrix(true, false);
          targets.set(id, node.getWorldPosition(new THREE.Vector3()));
        }

        if (!(node instanceof THREE.Mesh)) return;
        const mesh = node;
        const organ = findOrgan(mesh);

        let isShell = false;
        let p: THREE.Object3D | null = mesh;
        while (p) {
          if (p.name === 'body_shell') isShell = true;
          p = p.parent;
        }

        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((m) => m.clone())
          : mesh.material.clone();
        if (Array.isArray(mesh.material)) return;

        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.metalness = 0.05;
        mat.transparent = true;
        mat.depthWrite = true;
        mat.opacity = 1;

        if (isShell) {
          const originalGeometry=mesh.geometry;
          mesh.geometry=cropBodyShell(originalGeometry);originalGeometry.dispose();
          // Neutral translucent shell; the separate aura carries sample status.
          mat.color.set('#f1f5f9');
          mat.roughness = 0.18;
          mat.opacity = opacity;
          mat.depthWrite = false;
          mat.side = THREE.FrontSide;
          mesh.renderOrder = 4;

          shellMeshes.push(mesh);
        }

        if (organ) {
          // Radiant, Organic Jewel PBR Materials for Internal Organs
          const info = organs[organ];
          mat.color.set(info.color);
          mat.emissive.set(0x000000);
          mat.emissiveIntensity = 0;
          mat.roughness = 0.35;
          mat.metalness = 0.08;

          mesh.userData.organ = organ;
          mesh.userData.defaultColor = info.color;
          mesh.userData.glowColor = info.glowColor;
          pickables.push(mesh);

          const list = groupMeshes.get(organ) || [];
          list.push(mesh);
          groupMeshes.set(organ, list);
        }
      });

      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((n) => {
        if (n.name.startsWith('anchor_')) {
          targets.set(n.name.replace('anchor_', '') as OrganId, n.getWorldPosition(new THREE.Vector3()));
        }
      });

      bodyAura=createBodyAura(shellMeshes,()=>{needsRender=true;});
      app.dataset.bodyFraming='neck-to-knees';
      app.dataset.organPalette='natural';
      loaded = true;
      app.dataset.sceneStatus = 'ready';
      $('#scene-loading').hidden = true;

      createOverlay();
      applyOrganMaterials();
      createSpatialHotspots();
      selectOrgan(selected, false);
    },
    undefined,
    (error) => {
      console.error(error);
      showError('Failed to load 3D anatomy asset. Please verify file integrity.');
    }
  );
}

function findOrgan(node: THREE.Object3D): OrganId | undefined {
  let p: THREE.Object3D | null = node;
  while (p) {
    if (organOrder.includes(p.name as OrganId) && p.name !== 'body') {
      return p.name as OrganId;
    }
    p = p.parent;
  }
  return undefined;
}

// Metabolic Flow Conduits & Energy Pulses
function createOverlay() {
  const paths = [
    [[-0.14, 1.11, 0.14], [-0.06, 1.18, 0.16], [0.1, 1.14, 0.17], [0.17, 1.05, 0.11]],
    [[0.1, 1.12, 0.13], [0.21, 0.99, 0.14], [0.12, 0.85, 0.15], [-0.06, 0.94, 0.13]],
    [[-0.08, 1.08, 0.15], [-0.24, 0.99, 0.11], [-0.24, 0.79, 0.11], [-0.22, 0.57, 0.08]],
    [[0.08, 1.08, 0.15], [0.24, 1.02, 0.11], [0.24, 0.81, 0.12], [0.22, 0.59, 0.08]],
    [[0, 1.04, 0.14], [-0.08, 0.94, 0.15], [0, 0.85, 0.15], [0.11, 0.95, 0.14]]
  ];

  const material = new THREE.MeshBasicMaterial({
    color: '#0ea5e9',
    transparent: true,
    opacity: 0.75,
    depthWrite: false
  });

  paths.forEach((p) => {
    const curve = new THREE.CatmullRomCurve3(p.map((v) => new THREE.Vector3(...(v as [number, number, number]))));
    particlePaths.push(curve);

    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)),
      new THREE.LineBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.22, depthWrite: false })
    );
    overlays.add(line);

    for (let i = 0; i < 5; i++) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0036, 8, 6), material);
      dot.userData.path = particlePaths.length - 1;
      dot.userData.offset = i / 5;
      dot.renderOrder = 6;
      particleMeshes.push(dot);
      overlays.add(dot);
    }
  });

  overlays.userData.material = material;
  updateSample();
}

// Spatial Hotspots Layer (HTML Elements Projected in 3D Space)
interface SpatialHotspotItem {
  id: OrganId;
  el: HTMLElement;
  pos: THREE.Vector3;
}

const spatialHotspots: SpatialHotspotItem[] = [];

function createSpatialHotspots() {
  const container = $('#hotspots-layer');
  container.innerHTML = '';
  spatialHotspots.length = 0;

  const targetOrgans: OrganId[] = ['pancreas', 'liver', 'gut', 'muscle', 'fat'];

  targetOrgans.forEach((id) => {
    const info = organs[id];
    const targetPos = (targets.get(id) || new THREE.Vector3(...info.focus)).clone();

    const el = document.createElement('button');
    el.type = 'button';
    el.setAttribute('aria-label', `Focus ${info.name}`);
    el.className = 'spatial-hotspot';
    el.setAttribute('data-organ-hotspot', id);
    el.setAttribute('aria-controls', 'organ-info-bar');
    el.setAttribute('aria-describedby', `landmark-label-${id}`);
    el.innerHTML = `
      <span class="hotspot-beacon-dot" aria-hidden="true"></span>
      <span class="hotspot-pill" id="landmark-label-${id}" role="tooltip">
        <span class="hotspot-pill-name">${info.name}</span>
      </span>
    `;

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      selectOrgan(id, e.detail !== 0, e.detail === 0);
    });
    el.addEventListener('pointerenter',()=>{el.dataset.dismissed='false';});
    el.addEventListener('focus',()=>{el.dataset.dismissed='false';});

    container.appendChild(el);
    spatialHotspots.push({ id, el, pos: targetPos });
  });

  refreshIcons();
}

function dismissHotspots() {
  spatialHotspots.forEach(({el})=>{el.dataset.dismissed='true';});
}

function updateSpatialHotspots() {
  if (!loaded) return;
  const isWholeBody = selected === 'body';
  const rect = host.getBoundingClientRect();
  const layer = $('#hotspots-layer').getBoundingClientRect();

  spatialHotspots.forEach(({ el, pos }) => {
    if (!isWholeBody) {
      el.hidden = true; el.tabIndex=-1;
      return;
    }

    const projected = pos.clone().project(camera);

    // Behind camera or off-screen
    if (projected.z > 1.0 || projected.z < -1.0 || Math.abs(projected.x)>.95 || Math.abs(projected.y)>.95) {
      el.hidden = true;el.tabIndex=-1;
      return;
    }

    const screenX = (projected.x * 0.5 + 0.5) * rect.width + rect.left - layer.left;
    const screenY = (-(projected.y * 0.5) + 0.5) * rect.height + rect.top - layer.top;

    el.hidden = false;el.tabIndex=0;
    el.style.left = `${screenX}px`;
    el.style.top = `${screenY}px`;
    el.style.opacity = '1';
    el.classList.toggle('label-left',screenX>layer.width*.68);
  });
}

// Organ Material State Transitions (Active vs Ghosting)
function applyOrganMaterials(animate = true) {
  if (!loaded) return;
  const duration = reducedMotion || !animate ? 0 : 0.7;

  for (const [id, meshes] of groupMeshes) {
    const isFocused = selected === 'body' || id === selected;
    let targetAlpha = isFocused ? 1.0 : 0.14;

    // When viewing pancreas, fade gut to almost clear so pancreas is completely visible
    if (selected === 'pancreas' && id === 'gut') {
      targetAlpha = 0.04;
    }

    meshes.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.depthWrite = targetAlpha > 0.5;
      mesh.renderOrder = targetAlpha > 0.5 ? 2 : 1;

      gsap.killTweensOf(mat);
      gsap.to(mat, {
        opacity: targetAlpha,
        duration,
        ease: 'power2.inOut'
      });


    });
  }
  applyBodyGlow();
}

function applyBodyGlow() {
  const shown=overlayVisible && bodyGlow.tone!=='unavailable';
  app.dataset.bodyTone=shown?bodyGlow.tone:'off';
  app.dataset.bodyGlow=shown?bodyGlow.color:'#000000';
  $('#body-glow-label').textContent=overlayVisible?bodyGlow.label:'Body glow off · natural tissue colors';
  bodyAura?.set(bodyGlow,shown,reducedMotion);
}

function overviewDistance() {
  return Math.max(2.05,.46/(Math.tan(THREE.MathUtils.degToRad(16))*Math.max(.4,camera.aspect)));
}

// Select Organ with Cinematic 3/4 Camera Angles
function selectOrgan(id: OrganId, animate = true, focusDetails = false) {
  if (!organs[id]) return;
  clearTimeout(cameraDeadline);
  needsRender = true;
  selected = id;
  syncRotation();
  dismissHotspots();
  const info = organs[id];

  // Keep the organ list synchronized with direct node and mesh selection.
  app.querySelectorAll<HTMLButtonElement>('[data-organ]').forEach((btn) => {
    const isActive = btn.dataset.organ === id;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });

  app.dataset.focusedOrgan = id;
  app.dataset.focusState = id === 'body' ? 'body' : 'moving';
  $('#organ-info-bar').hidden = true;
  $('#back-to-body').hidden = id === 'body';
  $('#focused-organ-name').hidden = id === 'body';
  $('#focused-organ-name').textContent = info.name;
  $('#organ-focus-status').textContent = id === 'body' ? 'Whole-body view.' : `Focusing ${info.name}.`;
  hideTooltip();
  clearMeshHover();
  updateOrganInformation(info);

  // Apply Materials & Reticle
  applyOrganMaterials(animate);
  updateReticlePosition(id);

  // Cinematic Camera Fly-Through
  if (loaded && controls) {
    const isMobile = window.innerWidth < 768;
    const target = (targets.get(id) || new THREE.Vector3(...info.focus)).clone();
    const camPos = new THREE.Vector3(...info.cameraPos);

    if (id === 'body') {
      target.set(0, BODY_CENTER, 0);
      camPos.set(0, BODY_CENTER, overviewDistance());
    } else {
      if (isMobile) {
        // Position camera slightly further out on small screens
        camPos.z += 0.2;
      }
    }

    cameraTween?.kill();
    gsap.killTweensOf(camera.position);
    controls.enabled = false;

    const duration = animate && !reducedMotion ? 1 : 0;

    cameraTween = gsap.timeline({
      defaults: { duration, ease: 'power3.inOut' },
      onComplete: () => {
        clearTimeout(cameraDeadline);
        controls.enabled = true;
        controls.target.copy(target);
        controls.update();
        finishOrganFocus();
        if(focusDetails) $('#organ-info-title').focus({preventScroll:true});
      }
    });

    cameraTween
      .to(camera.position, { x: camPos.x, y: camPos.y, z: camPos.z }, 0)
      .to(controls.target, { x: target.x, y: target.y, z: target.z }, 0);
    // Software rendering can make GSAP's lag smoothing prolong a one-second
    // transition. Settle the current selection without leaving controls locked.
    if (softwareGraphics && duration > 0) cameraDeadline = setTimeout(() => {
      if (!disposed && selected === id) cameraTween?.progress(1);
    }, 1500);
  }

  if (!loaded) finishOrganFocus();
  refreshIcons();

}

// The bar is disclosed only once the selected organ's camera view has settled.
function finishOrganFocus() {
  needsRender = true;
  app.dataset.focusState = selected === 'body' ? 'body' : 'ready';
  syncRotation();
  $('#organ-info-bar').hidden = selected === 'body';
  $('#organ-focus-status').textContent = selected === 'body' ? 'Whole-body view.' : `${organs[selected].name} focused. Organ information is available below the model.`;
}

function updateOrganInformation(info: typeof organs[OrganId]) {
  $('#organ-info-title').textContent = info.name;
  $('#organ-info-role').textContent = info.role;
  $('#organ-info-glucose').textContent = info.description;
  $('#organ-info-diabetes').textContent = info.diabetes;
  $('#organ-info-project').textContent = info.detail;
  $<HTMLAnchorElement>('#organ-info-source').href = info.source;
  $('#organ-info-source').textContent = info.sourceTitle;
}

// Pointer Move: Parallax & Raycast Hover
function onPointerMove(e: PointerEvent) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouseNormalized.set(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );

  // Smooth mouse parallax offset
  targetParallax.x = (e.clientX / window.innerWidth - 0.5) * 0.04;
  targetParallax.y = -(e.clientY / window.innerHeight - 0.5) * 0.025;

  // Raycast hover check
  if (!loaded) return;
  raycaster.setFromCamera(mouseNormalized, camera);
  const hits = raycaster.intersectObjects(pickables, false);
  const hit = hits.find(
    (h) => h.object.visible && ((h.object as THREE.Mesh).material as THREE.Material).opacity > 0.12
  );

  if (hit && hit.object.userData.organ) {
    const organId = hit.object.userData.organ as OrganId;
    setMeshHover(hit.object as THREE.Mesh);
    showTooltip(e.clientX, e.clientY, organs[organId].name);
    renderer.domElement.style.cursor = 'pointer';
  } else {
    clearMeshHover();
    hideTooltip();
    renderer.domElement.style.cursor = 'default';
  }
}

function setMeshHover(mesh: THREE.Mesh) {
  if (hoveredMesh === mesh) return;
  clearMeshHover();
  hoveredMesh = mesh;
  // Hover feedback uses the existing tooltip; natural tissue material stays unchanged.
}

function clearMeshHover() {
  if (!hoveredMesh) return;
  const mat = hoveredMesh.material as THREE.MeshStandardMaterial;
  mat.emissiveIntensity = 0;
  hoveredMesh = null;
}

function showTooltip(x: number, y: number, text: string) {
  const tooltip = $('#scene-tooltip');
  const rect = $('.landing-stage').getBoundingClientRect();
  tooltip.textContent = `${text} • Click to focus`;
  tooltip.style.left = `${x - rect.left}px`;
  tooltip.style.top = `${y - rect.top}px`;
  tooltip.classList.add('visible');
}

function hideTooltip() {
  $('#scene-tooltip').classList.remove('visible');
}

// Main Render Loop
let animationTime = 0;

function render() {
  if (disposed) return;
  frameId = requestAnimationFrame(render);
  const now = performance.now();
  if (now - lastRenderedAt < 1000 / (softwareGraphics ? 20 : 30)) return;
  lastRenderedAt = now;
  timer.update();
  const delta = Math.min(timer.getDelta(), 0.08);

  if (document.hidden || !sceneVisible || contextLost || !renderer) return;

  // Mouse Parallax Damping
  if (!reducedMotion) {
    currentParallax.x += (targetParallax.x - currentParallax.x) * 0.05;
    currentParallax.y += (targetParallax.y - currentParallax.y) * 0.05;
  }

  controls.autoRotate = autoRotation && selected === 'body' && !pointerInsideStage && !reducedMotion && app.dataset.focusState !== 'moving';
  app.dataset.rotationState = controls.autoRotate ? 'running' : 'paused';
  controls.update(delta);
  if (reducedMotion && !needsRender) return;

  if (loaded) {
    animationTime += delta;

    // Shell Opacity Modulation Based on Distance & Zoom State
    const dist = camera.position.distanceTo(controls.target);
    const dynamicFade = THREE.MathUtils.smoothstep(dist, 0.4, 2.0);
    const targetShellOpacity = selected === 'body' ? opacity : opacity * 0.35 * (0.15 + 0.85 * dynamicFade);

    shellMeshes.forEach((mesh) => {
      (mesh.material as THREE.Material).opacity = targetShellOpacity;
    });

    // Holographic Reticle Rotation & Halo Pulse
    if (reticleGroup.visible && particleMotion && !reducedMotion) {
      reticleInnerRing.rotation.z += delta * 0.45;
      const pulseScale = 1.0 + 0.12 * Math.sin(animationTime * 3.2);
      reticleOuterPulse.scale.setScalar(pulseScale);
      reticleGroup.quaternion.copy(camera.quaternion);
    }

    // Ambient Bio-Dust Gentle Drift
    if (ambientParticlesMesh && particleMotion && !reducedMotion) {
      const posAttr = ambientParticlesMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < ambientParticleCount; i++) {
        arr[i * 3 + 1] += Math.sin(animationTime + i) * 0.0004;
      }
      posAttr.needsUpdate = true;
    }

    // Glucose Conduit Particles Flow
    if (particleMotion && !reducedMotion) {
      particleMeshes.forEach((m) => {
        m.position.copy(
          particlePaths[m.userData.path].getPointAt((animationTime * 0.08 + m.userData.offset) % 1)
        );
      });
    }

  }

  renderer.render(scene, camera);
  // Rendering updates camera matrices. In reduced motion there may be no next
  // frame, so project landmarks only after the final camera transform is valid.
  if (loaded) updateSpatialHotspots();
  needsRender = false;
}

// Error & Resize Handlers
function showError(message: string) {
  if (disposed) return;
  app.dataset.sceneStatus = 'error';
  $('#scene-loading').hidden = true;
  $('#scene-error').hidden = false;
  $('#error-text').textContent = message;
}

function resize() {
  if (!renderer) return;
  needsRender = true;
  const w = host.clientWidth;
  const h = host.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if(loaded && selected==='body') {
    const direction=camera.position.clone().sub(controls.target).normalize();
    controls.target.set(0,BODY_CENTER,0);
    camera.position.copy(controls.target).addScaledVector(direction,overviewDistance());controls.update();
  }
}

// Telemetry & Glucose Curve Updates
function samples() {
  return scenario ? scenarioSamples : daySamples;
}

function updateSample() {
  needsRender = true;
  const data = samples();
  const s = data[sampleIndex];
  const value = s.value;
  const prev=data[sampleIndex-1];
  const minute=(time:string)=>Number(time.slice(0,2))*60+Number(time.slice(3));
  const elapsed=prev?minute(s.time)-minute(prev.time):0;
  const rate=value!==null && prev?.value!==null && prev?.value!==undefined && elapsed>0 ? (value-prev.value)/elapsed : null;
  bodyGlow=sampleGlow(value,rate);
  applyBodyGlow();

  $('#glucose-value').textContent = value === null ? '—' : String(value);
  $('#sample-time').textContent = s.time;
  $('#sample-band').textContent =
    value === null
      ? 'No reading recorded'
      : value < 70
        ? 'Below 70 · fictional sample'
        : value >= 180
          ? 'At least 180 · fictional sample'
          : '70–179 · display band only';

  const color = bodyGlow.tone==='unavailable'?'#9bb3bd':bodyGlow.color;

  app.style.setProperty('--signal', color);

  const mat = overlays.userData.material as THREE.MeshBasicMaterial | undefined;
  if (mat) {
    mat.color.set(color);
    mat.opacity = value === null ? 0 : THREE.MathUtils.clamp(0.4 + value / 380, 0.45, 0.9);
  }

  overlays.children.forEach((n) => {
    if (n instanceof THREE.Line) (n.material as THREE.LineBasicMaterial).color.set(color);
  });
  overlays.visible = overlayVisible && value !== null;

  // Render SVG Sparkline
  const points = data.map((v, i) =>
    v.value === null ? null : [i / (data.length - 1) * 234 + 3, 48 - ((v.value - 50) / 160) * 42]
  );

  const segments: number[][][] = [];
  let curSegment: number[][] = [];
  points.forEach((p) => {
    if (p) curSegment.push(p);
    else if (curSegment.length) {
      segments.push(curSegment);
      curSegment = [];
    }
  });
  if (curSegment.length) segments.push(curSegment);

  const linePath = (ps: number[][]) =>
    ps.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

  $('.chart-line').setAttribute('d', segments.map(linePath).join(' '));
  $('.chart-area').setAttribute(
    'd',
    segments.map((ps) => `${linePath(ps)} L${ps[ps.length - 1][0]},52 L${ps[0][0]},52 Z`).join(' ')
  );

  const activePt = points[sampleIndex];
  const chartPoint = $('.chart-point');
  chartPoint.style.display = activePt ? '' : 'none';
  if (activePt) {
    chartPoint.setAttribute('cx', String(activePt[0]));
    chartPoint.setAttribute('cy', String(activePt[1]));
  }
}

function stopPlayback() {
  playing = false;
  if (sampleTimer) clearInterval(sampleTimer);
  $('#play-samples').textContent = 'Play';
  $('#play-samples').setAttribute('aria-pressed', 'false');
}

// UI Event Listeners & Interactive Controls
app.querySelectorAll<HTMLButtonElement>('[data-organ]').forEach((btn) => {
  btn.addEventListener('click', event => selectOrgan(btn.dataset.organ as OrganId, event.detail !== 0, event.detail === 0));
});



$('#back-to-body').addEventListener('click', event => selectOrgan('body', event.detail !== 0));

function syncRotation() {
  const disabled=reducedMotion || selected !== 'body';
  $<HTMLButtonElement>('#auto-rotate').disabled=disabled;
  $('#auto-rotate').setAttribute('aria-pressed',String(autoRotation && !disabled));
  $('#auto-rotate').title=disabled ? 'Auto-rotation is paused in organ views and reduced-motion mode' : 'Toggle slow auto-rotation';
  needsRender=true;
}
function rotateModel(direction: number, animate: boolean) {
  if(!loaded || !controls)return;
  autoRotation=false;syncRotation();cameraTween?.kill();controls.enabled=true;
  finishOrganFocus();
  const offset=camera.position.clone().sub(controls.target).applyAxisAngle(new THREE.Vector3(0,1,0),direction*Math.PI/8);
  const position=controls.target.clone().add(offset);
  gsap.killTweensOf(camera.position);
  gsap.to(camera.position,{x:position.x,y:position.y,z:position.z,duration:animate && !reducedMotion ? .5 : 0,ease:'power2.inOut',onUpdate:()=>{needsRender=true;}});
}
$('#rotate-left').addEventListener('click',event=>rotateModel(-1,event.detail!==0));
$('#rotate-right').addEventListener('click',event=>rotateModel(1,event.detail!==0));
$('#auto-rotate').addEventListener('click',()=>{autoRotation=!autoRotation;syncRotation();});
listen($('.landing-stage'),'pointerenter',()=>{pointerInsideStage=true;});
listen($('.landing-stage'),'pointerleave',()=>{pointerInsideStage=false;});
listen($('.landing-stage'),'focusin',()=>{pointerInsideStage=true;});
listen($('.landing-stage'),'focusout',()=>{pointerInsideStage=false;});

// Camera Zoom Controls
function zoomCamera(factor: number) {
  if (!controls || !loaded) return;
  cameraTween?.kill();
  gsap.killTweensOf(camera.position);
  controls.enabled = true;
  finishOrganFocus();
  const offset = camera.position.clone().sub(controls.target);
  const dist = THREE.MathUtils.clamp(
    offset.length() * factor,
    controls.minDistance,
    controls.maxDistance
  );
  const targetPos = controls.target.clone().add(offset.normalize().multiplyScalar(dist));
  gsap.to(camera.position, {
    x: targetPos.x,
    y: targetPos.y,
    z: targetPos.z,
    duration: reducedMotion ? 0 : 0.45,
    ease: 'power2.out'
  });
}

$('#zoom-in').addEventListener('click', () => zoomCamera(0.78));
$('#zoom-out').addEventListener('click', () => zoomCamera(1.28));
$('#reset-camera').addEventListener('click', event => selectOrgan('body', event.detail !== 0));

// View Settings
$('#opacity').addEventListener('input', (e) => {
  needsRender = true;
  opacity = Number((e.target as HTMLInputElement).value) / 100;
  $('#opacity-value').textContent = `${Math.round(opacity * 100)}%`;
});

$('#overlay-toggle').addEventListener('click', () => {
  needsRender = true;
  overlayVisible = !overlayVisible;
  $('#overlay-toggle').setAttribute('aria-checked', String(overlayVisible));
  updateSample();
});

$('#motion-toggle').addEventListener('click', () => {
  if (reducedMotion) return;
  particleMotion = !particleMotion;
  $('#motion-toggle').setAttribute('aria-checked', String(particleMotion));
});

$('#timeline').addEventListener('input', (e) => {
  sampleIndex = Number((e.target as HTMLInputElement).value);
  updateSample();
});

$('#play-samples').addEventListener('click', () => {
  if (playing) {
    stopPlayback();
    return;
  }
  playing = true;
  $('#play-samples').textContent = 'Pause';
  $('#play-samples').setAttribute('aria-pressed', 'true');
  sampleTimer = setInterval(() => {
    sampleIndex = (sampleIndex + 1) % samples().length;
    $<HTMLInputElement>('#timeline').value = String(sampleIndex);
    updateSample();
  }, 1600);
});

function setScenario(value: boolean) {
  scenario = value;
  $('#day-mode').classList.toggle('active', !value);
  $('#scenario-mode').classList.toggle('active', value);
  $('#day-mode').setAttribute('aria-pressed', String(!value));
  $('#scenario-mode').setAttribute('aria-pressed', String(value));
  updateSample();
}

$('#day-mode').addEventListener('click', () => setScenario(false));
$('#scenario-mode').addEventListener('click', () => setScenario(true));

$('#retry-scene').addEventListener('click', onRetry);

// Accessibility & Keyboard Shortcuts
listen(reducedQuery, 'change', () => {
  reducedMotion = reducedQuery.matches;
  if(reducedMotion)bodyAura?.finish();
  if (reducedMotion) {
    particleMotion = false;
    $('#motion-toggle').setAttribute('aria-checked', 'false');
  }
  syncRotation();
  ($('#motion-toggle') as HTMLButtonElement).disabled = reducedMotion;
});

listen(app, 'keydown', ((e: KeyboardEvent) => {
  if (
    (e.target as HTMLElement).matches('input, textarea, select')
  )
    return;

  if (e.key === 'Escape') {
    e.preventDefault();
    if(selected === 'body' && spatialHotspots.some(({el})=>el===document.activeElement||el.matches(':hover'))) {dismissHotspots();return;}
    selectOrgan('body', false);
    $('#scene canvas')?.focus({ preventScroll: true });
  }

  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault();
    const order = organOrder;
    const curIdx = order.indexOf(selected);
    const step = e.key === 'ArrowRight' ? 1 : -1;
    const nextIdx = (curIdx + step + order.length) % order.length;
    selectOrgan(order[nextIdx], false);
  }
}) as EventListener);

listen(app,'pointerdown',(event)=>{
  if(!(event.target instanceof Element)||event.target.closest('.spatial-hotspot'))return;
  dismissHotspots();
});

// Cleanup is owned by React, including pending asset loads.
function dispose() {
  disposed = true;
  clearTimeout(cameraDeadline);
  cancelAnimationFrame(frameId);
  timer.dispose();
  resizeObserver?.disconnect();
  visibilityObserver?.disconnect();
  stopPlayback();
  cameraTween?.kill();
  bodyAura?.dispose();
  controls?.dispose();

  lifetime.abort();
  gsap.killTweensOf(camera.position);
  gsap.killTweensOf(app.querySelectorAll('*'));
  scene.traverse(node => { gsap.killTweensOf(node.scale); });
  disposeTree(scene);
  renderer?.dispose();
  app.replaceChildren();
}
function disposeTree(tree: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  tree.traverse(node => {
    if (node instanceof THREE.Mesh || node instanceof THREE.Points || node instanceof THREE.Line) {
      geometries.add(node.geometry);
      (Array.isArray(node.material) ? node.material : [node.material]).forEach(material => {
        materials.add(material);
        Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); });
      });
    }
  });
  textures.forEach(value => value.dispose());
  materials.forEach(value => { gsap.killTweensOf(value); value.dispose(); });
  geometries.forEach(value => value.dispose());
}

// Initialization
app.dataset.sceneStatus = 'loading';
particleMotion = !reducedMotion;
($('#motion-toggle') as HTMLButtonElement).disabled = reducedMotion;
$('#motion-toggle').setAttribute('aria-checked', String(particleMotion));
app.dataset.focusedOrgan = 'body';
app.dataset.focusState = 'body';
autoRotation = !reducedMotion;
syncRotation();
updateSample();
createScene();


return { dispose };
}
