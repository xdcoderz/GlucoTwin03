import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { cameraStage, ORGAN_IDS, ORGANS, type OrganId, type ViewId } from "./organs";
import type { TwinSignal } from './twinSignals';
import { sampleGlow } from './visualStates';
import {createBodyAura,cropBodyShell,BODY_CENTER,BODY_BOTTOM} from './bodyPresentation';
import { gsap, easeSpatial } from '../motion/gsap';

type Callbacks = {
  onPick: (id: ViewId) => void;
  onStage: (stage: ReturnType<typeof cameraStage>) => void;
  onMarkers: (markers: { id: OrganId; x: number; y: number; visible: boolean }[]) => void;
  onFailure: () => void;
};

export type AnatomyScene = {
  focus: (id: ViewId, instant?: boolean) => void;
  zoom: (direction: "in" | "out", instant?: boolean) => void;
  rotate: (direction: number) => void;
  transparency: (value: number) => void;
  setSignal: (signal: TwinSignal) => void;
  setOverlayVisible: (visible: boolean) => void;
  setContext: (score: number | null, medication: boolean) => void;
  dispose: () => void;
};

/** User-supplied procedural GLB, with separate recorded/fictional glucose overlays. */
export async function createAnatomyScene(host: HTMLDivElement, canvas: HTMLCanvasElement, callbacks: Callbacks): Promise<AnatomyScene> {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
  camera.position.set(0, BODY_CENTER*3.1-2.73, 6.5);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, BODY_CENTER*3.1-2.73, 0);
  controls.enablePan = false;
  controls.enableDamping = false;
  controls.enableZoom = false;
  controls.minDistance = 1.85;
  controls.maxDistance = 13;
  controls.minPolarAngle = Math.PI * 0.22;
  controls.maxPolarAngle = Math.PI * 0.78;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.8;
  // Neutral illumination preserves the tissue palette; teal light would shift its hue.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x727272, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 6, 7); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.3);
  rim.position.set(-4, 2, -4); scene.add(rim);

  const body = new THREE.Group();
  scene.add(body);
  // A neutral translucent locator, not a representation of this patient's skin tone.
  const shell = new THREE.MeshStandardMaterial({ color: 0xd2e3f2, transparent: true, opacity: 0.2, roughness: 0.65, metalness: 0, side: THREE.FrontSide, depthWrite: false });
  const shellMeshes: THREE.Mesh[] = [];
  const pickables: THREE.Mesh[] = [];
  const organMeshes = new Map<OrganId, THREE.Mesh[]>();
  const organMaterials = new Map<OrganId, THREE.MeshStandardMaterial>();
  ORGAN_IDS.forEach(id => {
    organMeshes.set(id, []);
    organMaterials.set(id, new THREE.MeshStandardMaterial({ color: ORGANS[id].color, roughness: ORGANS[id].roughness, metalness: 0, transparent: true, opacity: 1, emissive: 0x000000, emissiveIntensity: 0 }));
  });

  function add(geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Group = body, organ?: OrganId): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    parent.add(mesh);
    if (organ) {
      mesh.userData.organ = organ;
      mesh.renderOrder = 2;
      pickables.push(mesh);
      organMeshes.get(organ)!.push(mesh);
    }
    return mesh;
  }

  // Match the established workspace camera scale while sharing the landing-page mesh.
  const centers = Object.fromEntries(ORGAN_IDS.map(id => [id, [...ORGANS[id].center]])) as Record<OrganId, [number, number, number]>;
  let gltf;
  try { gltf = await new GLTFLoader().loadAsync('/models/glucotwin_anatomy.glb'); }
  catch (error) { controls.dispose(); renderer.dispose(); shell.dispose(); organMaterials.forEach(material => material.dispose()); throw error; }
  gltf.scene.scale.setScalar(3.1);
  gltf.scene.position.y = -2.73;
  body.add(gltf.scene);
  body.updateMatrixWorld(true);
  const replacedMaterials = new Set<THREE.Material>();
  gltf.scene.traverse(node => {
    if (node.name.startsWith('anchor_')) {
      const id = node.name.slice(7) as OrganId;
      if (ORGAN_IDS.includes(id)) centers[id] = node.getWorldPosition(new THREE.Vector3()).toArray();
    }
    if (!(node instanceof THREE.Mesh)) return;
    const original = Array.isArray(node.material) ? node.material : [node.material];
    let parent: THREE.Object3D | null = node;
    let id: OrganId | undefined;
    let isShell = false;
    while (parent) {
      if (ORGAN_IDS.includes(parent.name as OrganId)) id = parent.name as OrganId;
      if (parent.name === 'body_shell') isShell = true;
      parent = parent.parent;
    }
    if (isShell) { const originalGeometry=node.geometry; node.geometry=cropBodyShell(originalGeometry); originalGeometry.dispose(); node.material = shell; shellMeshes.push(node); }
    else if (id) {
      node.material = organMaterials.get(id)!;
      node.userData.organ = id;
      node.renderOrder = 2;
      pickables.push(node);
      organMeshes.get(id)!.push(node);
    }
    if (isShell || id) original.forEach(material => replacedMaterials.add(material));
  });
  replacedMaterials.forEach(material => material.dispose());
  const bodyAura=createBodyAura(shellMeshes,()=>render());
  host.dataset.bodyFraming="neck-to-knees";
  host.dataset.organPalette="natural";

  // Separate data overlay. Its paths, speed, and density carry no physiological meaning.
  // Anatomy materials are never changed by glucose or model score.
  const overlay = new THREE.Group();
  body.add(overlay);
  const signalMaterial = new THREE.MeshBasicMaterial({ color: 0x75ddd3, transparent: true, opacity: .65, depthWrite: false });
  const pathMaterial = new THREE.MeshBasicMaterial({ color: 0x75ddd3, transparent: true, opacity: .26, depthWrite: false });
  const haloMaterial = new THREE.MeshBasicMaterial({ color: 0x75ddd3, transparent: true, opacity: .5, depthWrite: false, side: THREE.DoubleSide });
  const paths = [
    [[0, -.2, .38], [-.2, .28, .39], [.08, .68, .39], [-.25, 1.1, .40], [0, 1.7, .38]],
    [[.08, .68, .39], [.44, 1.16, .39], [.78, 1.47, .3], [1.02, .92, .26]],
    [[.08, .68, .39], [-.44, 1.16, .39], [-.78, 1.47, .3], [-1.02, .92, .26]],
    [[.08, .68, .39], [.32, .05, .35], [.35, -.6, .32], [.38, -1.0, .23]],
    [[.08, .68, .39], [-.32, .05, .35], [-.35, -.6, .32], [-.38, -1.0, .23]],
  ].map(points => new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p as [number, number, number]))));
  const particles: { mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3; offset: number }[] = [];
  const dotGeometry = new THREE.SphereGeometry(.024, 10, 8);
  paths.forEach(curve => {
    const ribbon = new THREE.Mesh(new THREE.TubeGeometry(curve, 56, .009, 6, false), pathMaterial);
    ribbon.renderOrder = 4; overlay.add(ribbon);
    for (let i = 0; i < 5; i++) {
      const dot = new THREE.Mesh(dotGeometry, signalMaterial);
      dot.renderOrder = 5; overlay.add(dot); particles.push({ mesh: dot, curve, offset: i / 5 });
    }
  });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(.19, .009, 8, 64), haloMaterial);
  halo.position.set(.08, .68, .42); halo.scale.x = 1.7; halo.renderOrder = 5; overlay.add(halo);
  overlay.visible = false;

  const grid = new THREE.GridHelper(8, 24, 0x24505a, 0x16313d);
  grid.position.y = BODY_BOTTOM*3.1-2.73-.08;
  grid.material = new THREE.LineBasicMaterial({ color: 0x9db7cf, transparent: true, opacity: .16 });
  scene.add(grid);
  const pedestal = add(new THREE.CylinderGeometry(.84, .91, .035, 64), new THREE.MeshStandardMaterial({ color: 0xc7daeb, transparent: true, opacity: .35 }));
  pedestal.position.set(0, BODY_BOTTOM*3.1-2.73-.08, 0);
  // These graphic markers describe stored context, never organ activity or drug response.
  const scoreMaterial=new THREE.MeshBasicMaterial({color:0x7456aa,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false});
  const scoreGeometry=new THREE.RingGeometry(1.03,1.10,100);
  const scoreRing=new THREE.Mesh(scoreGeometry,scoreMaterial);
  scoreRing.rotation.x=-Math.PI/2;scoreRing.position.y=BODY_BOTTOM*3.1-2.73-.04;scoreRing.visible=false;scene.add(scoreRing);
  const contextMaterial=new THREE.MeshBasicMaterial({color:0x608dbb,transparent:true,opacity:.35,depthWrite:false});
  const contextHalo=new THREE.Mesh(new THREE.TorusGeometry(1.15,.012,8,80),contextMaterial);
  contextHalo.position.set(0,.05,-.38);contextHalo.scale.y=2.2;contextHalo.visible=false;scene.add(contextHalo);

  let disposed = false;
  let active: ViewId = 'body';
  let shellOpacity = .20;
  let cameraTween: gsap.core.Tween | null = null;
  let signalFrame = 0;
  let signalMoving = false;
  let overlayEnabled = true;
  let hasSignal = false;
  let contextOnly = false;
  let bodyGlow=sampleGlow(null);

  let inViewport = true;
  let flowOffset = 0;
  let lastFlowTime = 0;
  let lastStage = '';
  let automaticAbdomen = true;
  let transitioning = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const goalPosition = camera.position.clone();
  const goalTarget = controls.target.clone();

  function updateDots() {
    particles.forEach(({ mesh, curve, offset }) => mesh.position.copy(curve.getPoint((offset + flowOffset) % 1)));
  }
  function flowTick(now: number) {
    if (disposed || !signalMoving || !overlayEnabled || reducedMotion.matches || document.hidden || !inViewport) return;
    // Bound GPU work to 30 fps. Playback timestamps remain independent of draw rate.
    if (!lastFlowTime || now - lastFlowTime >= 1000 / 30) {
      if (lastFlowTime) flowOffset = (flowOffset + Math.min(now - lastFlowTime, 100) / 8000) % 1;
      lastFlowTime = now;
      updateDots(); render();
    }
    signalFrame = requestAnimationFrame(flowTick);
  }
  function syncFlow() {
    if (reducedMotion.matches && cameraTween?.isActive()) cameraTween.progress(1);
    if (reducedMotion.matches) bodyAura.finish();
    cancelAnimationFrame(signalFrame); lastFlowTime = 0;
    if (signalMoving && overlayEnabled && !reducedMotion.matches && !document.hidden && inViewport) signalFrame = requestAnimationFrame(flowTick);
  }
  const visibilityObserver = new IntersectionObserver(entries => { inViewport = entries[0].isIntersecting; syncFlow(); });
  visibilityObserver.observe(host);
  document.addEventListener('visibilitychange', syncFlow);
  reducedMotion.addEventListener('change', syncFlow);
  updateDots();

  function render() {
    if (disposed) return;
    const distance = camera.position.distanceTo(controls.target);
    const stage = active === 'body' ? 'body' : cameraStage(distance);
    if (stage !== lastStage) { lastStage = stage; callbacks.onStage(stage); }
    const near = THREE.MathUtils.clamp((8.5 - distance) / 5, 0, 1);
    shell.opacity = shellOpacity * (1 - near * .87);
    shellMeshes.forEach(mesh => { mesh.visible = shell.opacity > .035; });
    organMaterials.forEach((material, id) => {
      const selected = active === id;
      // Reveal the pancreas through the schematic surrounding context in close view.
      material.opacity = active === 'body' ? 1 : selected ? 1 : (id === 'gut' && active === 'pancreas' ? .12 : .22);
      material.depthWrite = material.opacity > .8;
      // Tissue colors stay fixed; sample light belongs to the body silhouette only.
    });
    renderer.render(scene, camera);
    callbacks.onMarkers(ORGAN_IDS.map(id => {
      const projected = new THREE.Vector3(...centers[id]).project(camera);
      return { id, x: (projected.x + 1) / 2 * host.clientWidth, y: (1 - projected.y) / 2 * host.clientHeight,
        visible: projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < .85 && Math.abs(projected.y) < .9 && (active === 'body' || active === id) };
    }));
  }

  function applyBodyGlow() {
    bodyAura.set(bodyGlow,overlayEnabled && hasSignal && bodyGlow.tone!=='unavailable',reducedMotion.matches);
  }

  function animateTo(position: THREE.Vector3, target: THREE.Vector3, instant = false) {
    cameraTween?.kill();
    transitioning = true;
    goalPosition.copy(position); goalTarget.copy(target);
    if (instant || reducedMotion.matches) {
      camera.position.copy(position); controls.target.copy(target); controls.update(); transitioning = false; render();
      return;
    }
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const progress = { value: 0 };
    cameraTween = gsap.to(progress, { value: 1, duration: .5, ease: easeSpatial,
      onUpdate: () => {
        if (disposed) return;
        camera.position.lerpVectors(startPosition, goalPosition, progress.value);
        controls.target.lerpVectors(startTarget, goalTarget, progress.value);
        controls.update();
      }, onComplete: () => { transitioning = false; },
    });
  }

  function focus(id: ViewId, instant = false) {
    active = id;
    automaticAbdomen = id === 'body';
    const target = id === 'body' ? new THREE.Vector3(0, BODY_CENTER*3.1-2.73, 0) : new THREE.Vector3(...centers[id]);
    const distance = id === 'body' ? overviewDistance() : ORGANS[id].distance;
    animateTo(target.clone().add(new THREE.Vector3(.08, .10, distance)), target, instant);
  }

  function zoom(direction: 'in' | 'out', instant = false) {
    const currentDistance = camera.position.distanceTo(controls.target);
    const next = THREE.MathUtils.clamp(currentDistance * (direction === 'in' ? .75 : 1.4), controls.minDistance, controls.maxDistance);
    if (active === 'body' && next < 4.8) {
      active = 'pancreas'; automaticAbdomen = false; callbacks.onPick('pancreas');
    }
    const target = active === 'body' ? new THREE.Vector3(0, BODY_CENTER*3.1-2.73, 0) : new THREE.Vector3(...centers[active]);
    const directionVector = camera.position.clone().sub(controls.target).normalize();
    animateTo(target.clone().addScaledVector(directionVector, next), target, instant);
  }

  let pointerStart = { x: 0, y: 0 };
  const raycaster = new THREE.Raycaster();
  function pointerDown(event: PointerEvent) {
    cameraTween?.kill();
    transitioning = false;
    canvas.focus({ preventScroll: true });
    controls.enableZoom = true;
    pointerStart = { x: event.clientX, y: event.clientY };
  }
  function pointerUp(event: PointerEvent) {
    if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6) return;
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
    const hit = raycaster.intersectObjects(pickables, false).find(result => result.object.userData.organ);
    if (hit) { const id = hit.object.userData.organ as OrganId; callbacks.onPick(id); focus(id); }
  }
  function changed() {
    // Wheel/pinch dolly starts at the whole body and progressively centers the abdomen.
    const distance = camera.position.distanceTo(controls.target);
    if (!transitioning && automaticAbdomen && active === 'body') {
      const t = THREE.MathUtils.clamp((overviewDistance() - distance) / 3.5, 0, 1);
      controls.target.lerpVectors(new THREE.Vector3(0, BODY_CENTER*3.1-2.73, 0), new THREE.Vector3(...centers.pancreas), t);
      if (distance < 4.8) {
        active = 'pancreas'; automaticAbdomen = false; callbacks.onPick('pancreas');
        const direction = camera.position.clone().sub(controls.target).normalize();
        controls.target.set(...centers.pancreas);
        camera.position.copy(controls.target).addScaledVector(direction, distance);
      }
      camera.lookAt(controls.target);
    }
    render();
  }
  function keyboard(event: KeyboardEvent) {
    if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom('in', true); }
    if (event.key === '-') { event.preventDefault(); zoom('out', true); }
    if (event.key.toLowerCase() === 'r' || event.key === 'Escape') { event.preventDefault(); callbacks.onPick('body'); focus('body', true); }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); rotate(event.key === 'ArrowLeft' ? -1 : 1); }
  }
  function rotate(direction: number) {
    cameraTween?.kill(); transitioning = false;
    const offset = camera.position.clone().sub(controls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), direction * .24);
    camera.position.copy(controls.target).add(offset); controls.update(); render();
  }
  function allowZoom() { controls.enableZoom = true; }
  function stopZoom() { controls.enableZoom = false; }
  function interrupt() { cameraTween?.kill(); transitioning = false; }
  function contextLost(event: Event) { event.preventDefault(); signalMoving = false; cancelAnimationFrame(signalFrame); cameraTween?.kill(); callbacks.onFailure(); }
  function overviewDistance() {
    // Keep the larger neck-to-knees silhouette inside narrow as well as wide canvases.
    return Math.max(6.0, 1.35 / (Math.tan(THREE.MathUtils.degToRad(18))*Math.max(.4,camera.aspect)));
  }
  function resize() {
    const width = host.clientWidth; const height = host.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
    if(active==='body')focus('body',true);else render();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  controls.addEventListener('change', changed);
  controls.addEventListener('start', interrupt);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('keydown', keyboard);
  canvas.addEventListener('focus', allowZoom);
  canvas.addEventListener('blur', stopZoom);
  canvas.addEventListener('webglcontextlost', contextLost);
  controls.update(); resize();

  return {
    focus, zoom, rotate,
    setContext(score,medication) {
      const valid=score!==null&&Number.isFinite(score)&&score>=0&&score<=1;
      scoreRing.visible=valid;
      if(valid) {
        scoreGeometry.setDrawRange(0,Math.floor(score!*100)*6);
        scoreMaterial.color.set(score!>=.5?'#7456aa':'#347c87');
        scoreMaterial.opacity=.25+.6*score!;
      }
      contextHalo.visible=medication;
      render();
    },
    transparency(value) { shellOpacity = value; render(); },
    setOverlayVisible(visible) {
      overlayEnabled = visible; overlay.visible = visible && hasSignal && !contextOnly;
      applyBodyGlow();
      syncFlow(); render();
    },
    setSignal(signal) {
      hasSignal = signal.glucose !== null;
      contextOnly = signal.contextOnly === true;
      bodyGlow=signal.bodyGlow || sampleGlow(signal.glucose);
      applyBodyGlow();
      overlay.visible = overlayEnabled && hasSignal && !contextOnly;
      signalMaterial.color.set(signal.color); pathMaterial.color.set(signal.color); haloMaterial.color.set(signal.color);
      const level = THREE.MathUtils.clamp(((signal.glucose ?? 40) - 40) / 260, 0, 1);
      signalMaterial.opacity = .35 + .65 * level;
      pathMaterial.opacity = .12 + .4 * level;
      haloMaterial.opacity = .2 + .6 * level;
      signalMoving = signal.playing && signal.glucose !== null;
      // Fixed particle speed and fixed organ geometry avoid implying measured organ activity.
      syncFlow(); render();
    },
    dispose() {
      disposed = true; cameraTween?.kill(); bodyAura.dispose(); cancelAnimationFrame(signalFrame); observer.disconnect(); visibilityObserver.disconnect();
      document.removeEventListener('visibilitychange', syncFlow); reducedMotion.removeEventListener('change', syncFlow);
      controls.removeEventListener('change', changed); controls.removeEventListener('start', interrupt); controls.dispose();
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('keydown', keyboard); canvas.removeEventListener('focus', allowZoom); canvas.removeEventListener('blur', stopZoom);
      canvas.removeEventListener('webglcontextlost', contextLost);
      const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>();
      scene.traverse(object => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) geometries.add(mesh.geometry);
        if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => materials.add(material));
      });
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
      renderer.dispose();
    },
  };
}
