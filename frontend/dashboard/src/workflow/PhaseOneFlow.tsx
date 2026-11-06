import { useEffect, useRef, useState } from 'react';
import type { Readiness } from '../types';
import './phaseOne.css';
import { gsap, useGSAP, easeSpatial } from '../motion/gsap';

type Props = { api: string; patientId: string; revision: string; connected: boolean; onReadiness: (value: Readiness | null) => void; onScore: () => void; scoring: boolean; linkToScore?: boolean; compact?: boolean; simplified?: boolean };
export default function PhaseOneFlow({ api, patientId, revision, connected, onReadiness, onScore, scoring, linkToScore = false, compact = false, simplified = false }: Props) {
  const [value, setValue] = useState<Readiness | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const panel = useRef<HTMLElement>(null);
  const callback = useRef(onReadiness); callback.current = onReadiness;
  useEffect(() => {
    let cancelled = false; let timer: number; let controller: AbortController;
    async function load() {
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 6000);
      try {
        const response = await fetch(`${api}/patients/${patientId}/readiness`, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('readiness');
        const body: Readiness = await response.json();
        if (body.patientId !== patientId || !Array.isArray(body.historySlots) || !body.model) throw new Error('readiness');
        if (!cancelled) { setValue(body); setError(false); callback.current(body); }
      } catch { if (!cancelled) { setError(true); callback.current(null); } }
      finally { clearTimeout(timeout); if (!cancelled) timer = window.setTimeout(() => void load(), 5000); }
    }
    void load();
    return () => { cancelled = true; clearTimeout(timer); controller?.abort(); };
  }, [api, patientId, revision, retry]);
  const disabled = !connected || error;
  const progressKey = `${value?.historyReady}-${value?.predictionStatus}-${value?.inputChanged}-${value?.followUpComplete}-${value?.reviewState}`;
  useGSAP(() => {
    const rails = panel.current?.querySelectorAll<HTMLElement>('.flow-connection');
    if (!rails) return;
    rails.forEach(rail => {
      const completed = rail.parentElement?.classList.contains('flow-done');
      gsap.to(rail, { scaleX: completed ? 1 : 0, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : .25, ease: easeSpatial, overwrite: true });
    });
  }, { scope: panel, dependencies: [progressKey] });
  const steps = [
    { name: 'Check history', target: 'patient-twin', detail: value ? `${value.receivedExpectedSamples}/9 expected samples` : 'Checking samples', done: value?.historyReady, current: value?.nextAction === 'history' },
    { name: 'Score this meal', target: 'prediction-section', detail: value?.predictionStatus === 'available' ? value.inputChanged ? 'Inputs changed · rescore' : 'Saved model result' : value?.predictionId ? 'Attempt saved · no score' : 'No attempt saved', done: value?.predictionStatus === 'available' && !value.inputChanged, current: value?.nextAction === 'score' },
    { name: 'Observe follow-up', target: 'workflow-section', detail: `${value?.followUpSamples ?? 0}/8 future sample times`, done: value?.followUpComplete, current: value?.nextAction === 'follow_up' },
    { name: 'Review & export', target: 'workflow-section', detail: value?.reviewState === 'reviewed' ? 'Local review recorded' : 'Review the saved result', done: value?.reviewState === 'reviewed', current: value?.nextAction === 'review' || value?.nextAction === 'complete' },
  ];
  if(simplified) return <section ref={panel} className="phase-one-flow readiness-gate workspace-readiness-gate" aria-label="Input history readiness" aria-busy={!value && !error}>
    <div className="history-quality-heading"><strong>{error ? 'Readiness check interrupted' : !value ? 'Checking input history…' : `${value.receivedExpectedSamples} of ${value.expectedSamples} required samples · ${value.historyReady ? 'History ready' : 'History needs attention'}`}</strong><span className={`service-state ${value?.model.status === 'ready' && !disabled ? 'service-ready' : ''}`}>{disabled ? 'Status unavailable' : !value ? 'Checking model…' : value.model.status === 'ready' ? 'Model ready' : 'Model unavailable'}</span></div>
    {error && <div className="phase-one-error" role="alert">Readiness unavailable. Scoring is paused. <button className="button button-secondary" onClick={()=>setRetry(i=>i+1)}>Retry readiness</button></div>}
    {!!value?.qualityIssues.length && <p className="phase-one-error" role="alert">History checks: {value.qualityIssues.map(issue=>issue.replaceAll('_',' ')).join(' · ')}</p>}
    <details className="workspace-disclosure readiness-technical"><summary>Reading checks and technical details</summary>
      <p>Model inputs: meal baseline and preceding two hours only.</p>
      {value && <div className="history-slots" role="list" aria-label="Required pre-meal samples">{value.historySlots.map(slot=><div role="listitem" key={slot.minutesBefore} className={`history-slot slot-${slot.status}`} title={`${slot.observedAt} · ${slot.status}`}><i/><span>{slot.minutesBefore ? `−${slot.minutesBefore}` : 'Meal'}</span><small>{slot.status==='received' ? `${slot.glucoseMgDl?.toFixed(0)}` : slot.status==='missing' ? 'Missing' : 'Conflict'}</small></div>)}</div>}
      <p>Meal baseline: {value?.baselineAt ?? 'Checking'} · UTC</p><p>Latest ingestion: {value?.latestReceivedAt ?? 'Not reported'}</p><p>Model check: {value?.model.checkedAt ?? 'Checking'} · Status refreshes every 5 seconds.</p>
    </details>
  </section>;
  if (compact) return <section ref={panel} className="phase-one-flow readiness-gate" aria-labelledby="phase-one-title" aria-busy={!value && !error}>
    <div className="readiness-gate-heading"><div><p className="section-label">03 / History readiness</p><h2 id="phase-one-title">{error ? 'Readiness check interrupted' : !value ? 'Checking the input window…' : value.historyReady ? 'The input history is complete' : 'Complete the history before scoring'}</h2></div><span className={`service-state ${value?.model.status === 'ready' && !disabled ? 'service-ready' : ''}`}>{disabled ? 'Status unavailable' : !value ? 'Checking model…' : value.model.status === 'ready' ? 'Model ready' : 'Model unavailable'}</span></div>
    <div className="history-quality-heading"><strong>{value ? `${value.receivedExpectedSamples} of ${value.expectedSamples} required samples` : 'Nine samples required'}</strong><span>−120 minutes to meal · 15-minute intervals</span></div>
    {value && <div className="history-slots" role="list" aria-label="Required pre-meal samples">{value.historySlots.map(slot=><div role="listitem" key={slot.minutesBefore} className={`history-slot slot-${slot.status}`} title={`${slot.observedAt} · ${slot.status}`}><i/><span>{slot.minutesBefore ? `−${slot.minutesBefore}` : 'Meal'}</span><small>{slot.status==='received' ? `${slot.glucoseMgDl?.toFixed(0)}` : slot.status==='missing' ? 'Missing' : 'Conflict'}</small></div>)}</div>}
    <p className="gate-note">Only the meal baseline and preceding history enter the model. Follow-up samples are reviewed separately.</p>
    {error && <div className="phase-one-error" role="alert">The last status may be out of date. Scoring is paused until readiness recovers. <button className="button button-secondary" onClick={()=>setRetry(i=>i+1)}>Retry readiness</button></div>}
    {!!value?.qualityIssues.length && <p className="phase-one-error" role="alert">History checks: {value.qualityIssues.map(issue=>issue.replaceAll('_',' ')).join(' · ')}</p>}
    <details className="readiness-technical"><summary>Timing and service details</summary><p>Meal baseline: {value?.baselineAt ?? 'Checking'} · UTC</p><p>{value?.latestReceivedAt ? `Latest ingestion: ${value.latestReceivedAt}` : 'No ingestion timestamp reported'}</p><p>Model check: {value?.model.checkedAt ?? 'Checking'} · Status refreshes every 5 seconds.</p></details>
  </section>;
  return <section ref={panel} className="phase-one-flow" aria-labelledby="phase-one-title" aria-busy={!value && !error}>
    <div className="phase-one-heading"><div><p className="eyebrow">PHASE 1 · RESEARCH WORKFLOW</p><h2 id="phase-one-title">From patient data to a reviewed result</h2></div><span className={`service-state ${value?.model.status === 'ready' && !disabled ? 'service-ready' : ''}`}>{disabled ? 'Status check unavailable' : !value ? 'Checking services…' : value.model.status === 'ready' ? 'Model ready' : 'Model offline · no substituted score'}</span></div>
    <nav className="flow-steps" aria-label="Phase 1 steps">{steps.map((step, i) => <a href={`#${step.target}`} key={step.name} className={`${step.done ? 'flow-done' : ''} ${step.current ? 'flow-current' : ''}`} aria-current={step.current ? 'step' : undefined}><span className="flow-number">{String(i + 1).padStart(2, '0')}</span><span><strong>{step.name}</strong><small>{step.detail}</small></span><span className="flow-connection" aria-hidden="true" /></a>)}</nav>
    {error && <div className="phase-one-error" role="alert">Readiness could not be checked. Any displayed status is from the last successful check. <button className="button button-secondary" onClick={() => setRetry(i => i + 1)}>Retry readiness</button></div>}
    {value && <div className="readiness-detail">
      <div className="history-quality"><div className="history-quality-heading"><strong>{value.historyReady ? 'Complete pre-meal history' : 'History needs attention'}</strong><span>{value.receivedExpectedSamples} of {value.expectedSamples} required times</span></div><div className="history-slots" role="list" aria-label="Required pre-meal samples">{value.historySlots.map(slot => <div role="listitem" key={slot.minutesBefore} className={`history-slot slot-${slot.status}`} title={`${slot.observedAt} · ${slot.status}${slot.glucoseMgDl !== null ? ` · ${slot.glucoseMgDl} mg/dL` : ''}`}><i /><span>{slot.minutesBefore ? `−${slot.minutesBefore}` : 'Meal'}</span><small>{slot.status === 'received' ? `${slot.glucoseMgDl?.toFixed(0)}` : slot.status === 'missing' ? 'Missing' : 'Conflict'}</small></div>)}</div><p>Every slot is 15 minutes apart. The model uses only the meal baseline and preceding two hours.</p></div>
      <div className="next-action"><p className="eyebrow">NEXT STEP</p><strong>{!value.historyReady ? 'Complete the input history' : value.inputChanged ? 'Current data differs from the saved result' : value.nextAction === 'score' ? 'Request and save a model result' : value.nextAction === 'follow_up' ? 'Follow the post-meal window' : value.nextAction === 'review' ? 'Record your review' : 'The research workflow is recorded'}</strong><p>{!value.historyReady ? 'Replay the missing synthetic inputs or resolve timestamp conflicts before scoring.' : value.model.status !== 'ready' && value.nextAction === 'score' ? 'The model health check failed. You can still save an explicit unavailable attempt; retry scoring after recovery.' : value.nextAction === 'follow_up' ? 'Replay fictional follow-up below, then compare it with the saved attempt. This is a workflow demonstration.' : 'Follow the numbered steps. Historical results and current inputs remain separate.'}</p>{value.nextAction === 'score' && linkToScore ? <a className="button button-secondary" href="#workspace">Go to score & save</a> : value.nextAction === 'score' ? <button className="button button-primary" disabled={disabled || scoring || !value.historyReady} onClick={onScore}>{scoring ? 'Requesting model result…' : 'Request model score'}</button> : <a className="button button-secondary" href={value.nextAction === 'history' ? '#patient-twin' : '#workflow-section'}>{value.nextAction === 'history' ? 'Inspect patient timeline' : 'Open follow-up & review'}</a>}</div>
    </div>}
    {value?.qualityIssues.length ? <p className="phase-one-error">History checks: {value.qualityIssues.map(issue => issue.replaceAll('_', ' ')).join(' · ')}</p> : null}
    <div className="readiness-foot"><span>Replay clock · {value ? new Date(value.baselineAt).toISOString().replace('T', ' ').slice(0, 16) + ' UTC meal' : 'Checking meal baseline'}</span><span>{value?.latestReceivedAt ? `Last ingestion ${new Date(value.latestReceivedAt).toISOString().replace('T', ' ').slice(0, 19)} UTC` : 'No ingestion timestamp reported'} · {disabled ? 'Connection needs attention' : 'Status checked every 5 seconds'}</span></div>
  </section>;
}
