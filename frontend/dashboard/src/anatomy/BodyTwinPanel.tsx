import { FEATURES } from '../site/features';
import { useEffect, useRef, useState } from 'react';
import { ORGAN_IDS, ORGANS, type OrganId, type ViewId } from './organs';
import type { AnatomyScene } from './scene';
import type { TwinSignal } from './twinSignals';
import './anatomy.css';

type Props = {
  patientId: string;
  glucose: number | null;
  modelScore: number | null;
  medications?: string[];
  signal?: TwinSignal;
  phase?: 'recorded' | 'vision';
  instanceKey?: string;
  displayMode?: 'glucose'|'meal_score';
  children?: React.ReactNode;
  playbackControls?: React.ReactNode;
};

const TOUR: { id: ViewId; title: string; explanation: string }[] = [
  { id: 'body', title: 'Start with the whole person', explanation: 'A health record, meal details, and glucose readings describe one virtual patient. The 3D body helps explain the biology; it does not calculate the score.' },
  { id: 'gut', title: 'Follow the meal', explanation: ORGANS.gut.description },
  { id: 'pancreas', title: 'Meet the insulin signal', explanation: ORGANS.pancreas.description },
  { id: 'liver', title: 'Store energy for later', explanation: ORGANS.liver.description },
  { id: 'muscle', title: 'Use glucose for energy', explanation: ORGANS.muscle.description },
  { id: 'fat', title: 'Connect the background context', explanation: `${ORGANS.fat.description} GlucoTwin scores one defined glucose event over the next 120 minutes. It does not simulate these organs.` },
];

export default function BodyTwinPanel({ patientId, glucose, modelScore, medications = [], signal, phase = 'recorded', instanceKey, displayMode='glucose', children, playbackControls }: Props) {
  const idPrefix = `anatomy-${instanceKey || phase}`;
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<AnatomyScene | null>(null);
  const markerRefs = useRef<Partial<Record<OrganId, HTMLButtonElement | null>>>({});
  const [selected, setSelected] = useState<ViewId>('body');
  const [stage, setStage] = useState<'body' | 'abdomen' | 'detail'>('body');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [opacity, setOpacity] = useState(20);
  const [showOverlay, setShowOverlay] = useState(true);
  const [medicationContext,setMedicationContext]=useState(false);
  const contextRef=useRef({modelScore,medicationContext});
  contextRef.current={modelScore,medicationContext};
  const recordedMedications=medications.filter(value=>value.trim());
  const overlayRef = useRef(showOverlay);
  overlayRef.current = showOverlay;
  const [tourIndex, setTourIndex] = useState<number | null>(null);
  const [tourNotice, setTourNotice] = useState('');
  const opacityRef = useRef(opacity);
  opacityRef.current = opacity;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const signalRef = useRef(signal);
  signalRef.current = signal;

  useEffect(() => { if (signal) engine.current?.setSignal(signal); }, [signal?.glucose, signal?.color, signal?.playing, signal?.bodyGlow?.tone]);
  useEffect(() => { engine.current?.setOverlayVisible(showOverlay); }, [showOverlay]);
  useEffect(()=>{engine.current?.setContext(modelScore,medicationContext&&recordedMedications.length>0);},[modelScore,medicationContext,recordedMedications.length]);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    // Slow or stalled GPU initialization must leave the text controls usable.
    const loadingDeadline = window.setTimeout(() => { if (!cancelled) setStatus('error'); }, 20000);
    import('./scene').then(async ({ createAnatomyScene }) => {
      if (cancelled || !host.current || !canvas.current) return;
      const created = await createAnatomyScene(host.current, canvas.current, {
        onPick: id => { setSelected(id); setTourIndex(null); setTourNotice(''); },
        onStage: setStage,
        onFailure: () => setStatus('error'),
        onMarkers: markers => markers.forEach(marker => {
          const element = markerRefs.current[marker.id];
          if (element) {
            element.style.left = `${marker.x}px`;
            element.style.top = `${marker.y}px`;
            element.hidden = !marker.visible;
          }
        }),
      });
      window.clearTimeout(loadingDeadline);
      if (cancelled) { created.dispose(); return; }
      engine.current = created;
      engine.current.setContext(contextRef.current.modelScore,contextRef.current.medicationContext);
      engine.current.transparency(opacityRef.current / 100);
      if (signalRef.current) engine.current.setSignal(signalRef.current);
      engine.current.setOverlayVisible(overlayRef.current);
      if (selectedRef.current !== 'body') engine.current.focus(selectedRef.current, true);
      setStatus('ready');
    }).catch(() => { window.clearTimeout(loadingDeadline); if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; window.clearTimeout(loadingDeadline); engine.current?.dispose(); engine.current = null; };
  }, [attempt]);

  function choose(id: ViewId, instant = false) {
    setTourIndex(null);
    setTourNotice('');
    setSelected(id);
    if (status === 'ready') engine.current?.focus(id, instant);
  }

  function tourStep(index: number, instant: boolean) {
    setTourIndex(index);
    setTourNotice('');
    setSelected(TOUR[index].id);
    if (status === 'ready') engine.current?.focus(TOUR[index].id, instant);
  }

  function endTour(completed: boolean) {
    setTourIndex(null);
    setTourNotice(completed ? 'Tour complete. Explore any structure, or restart the tour.' : 'Tour ended. You can explore freely or restart.');
  }

  const organ = selected === 'body' ? null : ORGANS[selected];
  const keyboardAction = (event: React.MouseEvent) => event.detail === 0;
  return <section className="anatomy" aria-labelledby={`${idPrefix}-title`}>
    <div className="anatomy-heading">
      <div><p className="eyebrow">THE VIRTUAL PATIENT</p><h2 id={`${idPrefix}-title`}>{displayMode==='meal_score'?'Your meal what-if twin':'Inside the glucose story'}</h2><p className="anatomy-subtitle">{displayMode==='meal_score'?'The aura shows model-score context, not predicted glucose. Explore the organs behind the meal response.':'Glucose drives the overlay. Zoom in to explore the pancreas and connected structures.'}</p></div>
      <div className="tour-entry"><span className="anatomy-mode">ILLUSTRATIVE 3D ANATOMY</span>{FEATURES.guidedAnatomyTour && <button className="button button-secondary" onClick={event => tourStep(0, keyboardAction(event))}>{tourIndex === null ? 'Start guided tour' : 'Restart tour'}</button>}</div>
    </div>
    {children}
    <div className="tour-announcement" role="status">{tourNotice}</div>
    {FEATURES.guidedAnatomyTour && tourIndex !== null && <div className="anatomy-tour" aria-label="Guided anatomy tour">
      <div aria-live="polite" aria-atomic="true"><p className="eyebrow">STEP {tourIndex + 1} OF {TOUR.length} · EDUCATIONAL TOUR</p><h3>{TOUR[tourIndex].title}</h3><p>{TOUR[tourIndex].explanation}</p></div>
      <div className="tour-actions"><button className="button button-secondary" disabled={tourIndex === 0} onClick={event => tourStep(tourIndex - 1, keyboardAction(event))}>Previous step</button><button className="button button-primary" onClick={event => tourIndex === TOUR.length - 1 ? endTour(true) : tourStep(tourIndex + 1, keyboardAction(event))}>{tourIndex === TOUR.length - 1 ? 'Finish tour' : 'Next step'}</button><button className="tour-exit" onClick={() => endTour(false)}>Exit tour</button></div>
    </div>}
    <div className="anatomy-layout">
      <div className="twin-viewer">
        <div className="twin-stage" ref={host} data-testid="anatomy-stage" data-view={selected} data-stage={stage} data-status={status} data-glucose={signal?.glucose ?? 'none'} data-signal-color={signal?.color} data-body-tone={showOverlay ? signal?.bodyGlow?.tone || 'unavailable' : 'off'} data-body-glow={showOverlay ? signal?.bodyGlow?.color : '#000000'} data-playing={signal?.playing ? 'true' : 'false'} data-score-context={modelScore ?? 'unavailable'} data-medication-context={medicationContext&&recordedMedications.length>0?'shown':'hidden'}>
          <canvas key={attempt} ref={canvas} tabIndex={status === 'ready' ? 0 : -1} aria-label="Interactive neck-to-knees anatomy. Drag to rotate. Click or focus the view, then scroll to zoom toward the pancreas. Plus and minus zoom, arrow keys rotate, R resets." aria-describedby={`${idPrefix}-instructions`} />
          <div className="twin-view-label" aria-hidden="true"><span>{stage === 'body' ? '01' : stage === 'abdomen' ? '02' : '03'}</span>{stage === 'body' ? 'BODY OVERVIEW' : stage === 'abdomen' ? 'ABDOMINAL SYSTEMS' : 'ORGAN DETAIL'}</div>
          <div className="twin-orientation" aria-hidden="true">ANTERIOR VIEW AT RESET<br/>SCHEMATIC / NOT TO SCALE</div>
          <div className="twin-signal-key"><strong style={{ color: showOverlay ? signal?.color : undefined }}>{!showOverlay ? 'ANATOMY COLORS / OVERLAY HIDDEN' : displayMode==='meal_score'?'MEAL WHAT-IF SCORE CONTEXT':phase === 'vision' ? 'SIMULATED GLUCOSE OVERLAY' : 'RECORDED GLUCOSE OVERLAY'}</strong><span>{showOverlay ? displayMode==='meal_score'?<>Score flag, not glucose forecast<br/>Natural organ tissue colors</>:<>Overlay brightness tracks glucose<br/>Paths are schematic, not blood vessels</> : <>Approximate natural tissue colors<br/>Body glow hidden</>}<br/>Organ colors do not indicate health</span></div>
          {ORGAN_IDS.map(id => <button hidden key={id} ref={element => { markerRefs.current[id] = element; }} tabIndex={-1} className={`twin-hotspot hotspot-${id}`} onClick={() => choose(id)} aria-label={`Focus ${ORGANS[id].name}`} style={{ '--organ-color': ORGANS[id].color } as React.CSSProperties}><span />{ORGANS[id].name}</button>)}
          {status === 'loading' && <div className="twin-overlay" role="status"><strong>Preparing the 3D patient</strong><p>Building the body and glucose-related structures.</p></div>}
          {status === 'error' && <div className="twin-overlay twin-error" role="status"><strong>3D view is unavailable</strong><p>This browser may not support WebGL, or the graphics context was interrupted. The organ guide and patient data still work below.</p><button className="twin-button" onClick={() => setAttempt(value => value + 1)}>Retry 3D view</button></div>}
          <div className="twin-scale" aria-hidden="true"><span />BODY OVERVIEW <i /> ORGAN DETAIL</div>
        </div>
        <div className="twin-controls" aria-label="3D view controls">
          <button className="twin-button" disabled={status !== 'ready'} onClick={event => engine.current?.zoom('in', keyboardAction(event))}>Zoom in</button>
          <button className="twin-button" disabled={status !== 'ready'} onClick={event => engine.current?.zoom('out', keyboardAction(event))}>Zoom out</button>
          <button className="twin-button" disabled={status !== 'ready'} onClick={() => engine.current?.rotate(-1)}>Rotate left</button>
          <button className="twin-button" disabled={status !== 'ready'} onClick={() => engine.current?.rotate(1)}>Rotate right</button>
          <button className="twin-button twin-reset" onClick={event => choose('body', keyboardAction(event))}>Body overview / reset</button>
        </div>
        <div className="twin-view-options"><p id={`${idPrefix}-instructions`}>Drag to rotate. Click the body, then scroll or pinch to move closer. Zooming in reveals the pancreas.</p><label htmlFor={`${idPrefix}-opacity`}>Body opacity <input id={`${idPrefix}-opacity`} type="range" min="5" max="45" step="5" value={opacity} disabled={status !== 'ready'} onChange={event => { const value = Number(event.target.value); setOpacity(value); engine.current?.transparency(value / 100); }} /><span>{opacity}%</span></label></div>
        <div className="twin-appearance">
          <label className="twin-overlay-toggle"><input type="checkbox" checked={showOverlay} onChange={event => setShowOverlay(event.target.checked)} />Show glucose overlay</label>
          <p className="body-glow-status" role="status">{showOverlay ? signal?.bodyGlow?.label : 'Organ tint off · base tissue colors'}</p>
          <p className="body-glow-legend">{displayMode==='meal_score'?'Meal-score mode: red at/above the 0.50 research threshold, blue below it. Blue does not establish a safe meal. This mode does not use green or invent future glucose readings.':'Body glow: green for in-band and steady or improving, red for concerning samples, blue for neutral.'} Organ tissue colors stay natural.</p>
          {displayMode!=='meal_score'&&<p className="visual-signal-legend">Demo rules: red below 70 or at/above 180, falling at/below 100, or rising at/above 140. Trend rules start at ±0.5 mg/dL/min. Missing samples switch the glow off; these are not clinical classifications.</p>}
          <label className="twin-overlay-toggle"><input type="checkbox" checked={medicationContext} disabled={!recordedMedications.length} onChange={event=>setMedicationContext(event.target.checked)} />Highlight medication context</label>
          <p>{recordedMedications.length?recordedMedications.join(', '):'No medication names recorded.'} The blue outline marks recorded context only. It does not simulate medication action, timing or dose.</p>
          <details><summary>About tissue colors and references</summary><p>Colors approximate natural tissue appearance. Lighting, blood supply and specimen preparation change what tissue looks like. The translucent body is a viewing aid, not a skin-tone estimate. Faded organs show context when another organ is selected.</p><ul>{ORGAN_IDS.map(id => <li key={id}><strong>{ORGANS[id].name}:</strong> {ORGANS[id].appearance} <a href={ORGANS[id].appearanceSource} target="_blank" rel="noreferrer">Reference for {ORGANS[id].name.toLowerCase()}</a></li>)}</ul><p>These colors and shapes are illustrative, not patient measurements or a validated anatomical atlas.</p></details>
        </div>
      </div>
      <aside className="twin-guide" aria-label="Anatomy explanation">
        {playbackControls}
        <p className="twin-guide-kicker">EXPLORE THE CONNECTIONS</p>
        <nav className="twin-organ-list" aria-label="Choose an organ or tissue">
          {ORGAN_IDS.map((id, index) => <button key={id} className={selected === id ? 'selected' : ''} aria-pressed={selected === id} onClick={event => choose(id, keyboardAction(event))} style={{ '--organ-color': ORGANS[id].color } as React.CSSProperties}><span className="organ-number">0{index + 1}</span><span>{ORGANS[id].name}</span><span className="organ-swatch" aria-hidden="true" /></button>)}
        </nav>
        <div className="twin-organ-detail" aria-live="polite" aria-atomic="true">
          <p className="twin-detail-kicker">{organ ? organ.role : 'FROM WHOLE BODY TO PANCREAS'}</p>
          <h3>{organ ? organ.name : 'One body. Connected systems.'}</h3>
          <p>{organ ? organ.description : 'Begin with the body overview. Zoom toward the abdomen to reveal the pancreas, or choose a structure above to explore its role in glucose regulation.'}</p>
          {organ ? <><div className="twin-model-connection"><strong>Connection to GlucoTwin</strong><p>{organ.connection}</p></div><p className="twin-not-measured">{organ.notMeasured}</p><a href={organ.source} target="_blank" rel="noreferrer">{organ.sourceTitle}</a></> : <button className="twin-button twin-primary" onClick={event => choose('pancreas', keyboardAction(event))}>Explore the pancreas</button>}
        </div>
        <div className="twin-patient-snapshot"><p>SAVED MODEL CONTEXT <strong>{patientId}</strong></p><div><span><b>{glucose === null ? '—' : glucose.toFixed(0)}</b><small>mg/dL at baseline</small></span><span><b>{modelScore === null ? '—' : modelScore.toFixed(3)}</b><small>uncalibrated score</small></span></div><div className="visual-score-track" aria-hidden="true"><span style={{transform:`scaleX(${modelScore??0})`}} /></div><p className="snapshot-note">{modelScore===null?'No saved score is available; the base ring is hidden.':'The base arc shows this saved score on a 0–1 scale. Purple marks the 0.50 research threshold flag; this is not a low-glucose forecast.'} {phase === 'vision' ? 'This context stays fixed while the fictional timeline plays. ' : ''}Organ shapes and colors do not indicate this patient's organ function.</p></div>
      </aside>
    </div>
    <div className="anatomy-footer"><strong>Educational anatomy, not a patient scan.</strong><span>Generic, approximate geometry. No organ simulation, organ diagnosis, or treatment guidance.</span></div>
  </section>;
}
