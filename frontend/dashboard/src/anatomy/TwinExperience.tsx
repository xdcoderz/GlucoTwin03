import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap, useGSAP, easeOut } from '../motion/gsap';
import { CartesianGrid, Line, LineChart, ReferenceLine, ReferenceArea, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DashboardData, Reading } from '../types';
import BodyTwinPanel from './BodyTwinPanel';
import ProjectionPanel from './ProjectionPanel';
import { inspectPattern } from './visualResearch';
import { glucoseSignal, mockTimeline, recordedTimeline, SCENARIOS, utcLabel, type ScenarioId } from './twinSignals';
import './twinExperience.css';
import './visualResearch.css';

type Props = { data: DashboardData; api: string; fixedPhase?: 'recorded' | 'vision'; active?: boolean; workspaceCompact?: boolean; instanceScope?: string };

/** Local mock mode never writes to the API, score, journal, or exports. */
export default function TwinExperience({ data, api, fixedPhase, active = true, workspaceCompact = false, instanceScope }: Props) {
  const controlScope=instanceScope || fixedPhase || 'recorded';
  const [phase, setPhase] = useState<'recorded' | 'vision'>(fixedPhase || 'recorded');
  const studio = useRef<HTMLElement>(null);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.experience-source', { opacity: .5, duration: .2, ease: easeOut, clearProps: 'opacity' });
    }, studio);
    return () => media.revert();
  }, { scope: studio, dependencies: [phase], revertOnUpdate: true });
  const [scenario, setScenario] = useState<ScenarioId>('surge');
  const [readings, setReadings] = useState<Reading[]>(data.cgmHistory);
  const [stream, setStream] = useState<'loading' | 'connected' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [following, setFollowing] = useState(true);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [animateSignal, setAnimateSignal] = useState(false);
  const [twinOpen,setTwinOpen] = useState(false);
  useEffect(() => { if (!active) { setPlaying(false); setAnimateSignal(false); } }, [active]);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { setReduced(media.matches); if (media.matches) { setPlaying(false); setAnimateSignal(false); } };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let timer: number;
    let controller: AbortController;
    async function poll() {
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 6000);
      try {
        const response = await fetch(`${api}/patients/${encodeURIComponent(data.patient.patientId)}/cgm`, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('stream');
        const rows: unknown = await response.json();
        if (!Array.isArray(rows) || rows.some(row => !row || typeof row.observedAt !== 'string' || typeof row.glucoseMgDl !== 'number')) throw new Error('shape');
        if (!stopped) {
          setReadings(previous => previous.length === rows.length && previous.every((row, i) => row.observedAt === rows[i].observedAt && row.glucoseMgDl === rows[i].glucoseMgDl) ? previous : rows);
          setStream('connected');
        }
      } catch { if (!stopped) { setStream('error'); setPlaying(false); } }
      finally {
        clearTimeout(timeout);
        if (!stopped) timer = window.setTimeout(() => void poll(), 2500);
      }
    }
    void poll();
    return () => { stopped = true; clearTimeout(timer); controller?.abort(); };
  }, [api, data.patient.patientId, retry, active]);

  const recorded = useMemo(() => recordedTimeline(readings, data.currentMeal.baselineAt), [readings, data.currentMeal.baselineAt]);
  const baseline = recorded.points.find(point => point.minutes === 0)?.glucose ?? null;
  const future = useMemo(() => mockTimeline(baseline, data.currentMeal.baselineAt, scenario), [baseline, data.currentMeal.baselineAt, scenario]);
  const points = phase === 'recorded' ? recorded.points : future;
  const selectedIndex = selectedTime ? points.findIndex(point => point.observedAt === selectedTime) : -1;
  const index = phase === 'recorded' && following ? points.length - 1 : Math.max(0, selectedIndex);
  const point = points[index];
  const sourceUnavailable = phase === 'recorded' && stream !== 'connected';
  const pattern = inspectPattern(points,index);
  const signal = glucoseSignal(sourceUnavailable ? null : point?.glucose ?? null, (playing || animateSignal) && !reduced,pattern.rate);
  const previous = points[index - 1];
  const delta = point && previous ? point.glucose - previous.glucose : null;
  const elapsed = point && previous ? point.minutes - previous.minutes : null;
  const rise = point && baseline !== null ? point.glucose - baseline : null;
  const isFutureWindow = point && point.minutes > 0 && point.minutes <= 120;
  const matchesTarget = isFutureWindow && (point.glucose >= 180 || (rise !== null && rise >= 40));

  useEffect(() => {
    if (points.length < 2 || sourceUnavailable) setPlaying(false);
  }, [points.length, sourceUnavailable]);

  useEffect(() => {
    if (!playing || reduced || points.length < 2 || sourceUnavailable) return;
    const timer = window.setTimeout(() => {
      if (index >= points.length - 1) { setPlaying(false); return; }
      setSelectedTime(points[index + 1].observedAt);
    }, 1000);
    return () => clearTimeout(timer);
  }, [playing, reduced, index, points, sourceUnavailable]);

  function switchPhase(next: 'recorded' | 'vision') {
    setPhase(next); setPlaying(false); setAnimateSignal(false); setSelectedTime(null); setFollowing(next === 'recorded');
  }
  function scrub(next: number) { setPlaying(false); setFollowing(false); setSelectedTime(points[next]?.observedAt ?? null); }
  function chooseScenario(next: ScenarioId, jump=false) {
    setScenario(next);setPlaying(false);setAnimateSignal(false);setFollowing(false);
    const nextPoints=mockTimeline(baseline,data.currentMeal.baselineAt,next);
    setSelectedTime(nextPoints[next==='countdown'?2:next==='artifact'?3:0]?.observedAt??null);
    if(jump)requestAnimationFrame(()=>studio.current?.querySelector<HTMLElement>(next==='artifact'?'.pattern-card':'.projection-card')?.scrollIntoView({block:'start',behavior:'instant'}));
  }
  function play() {
    if (playing) { setPlaying(false); return; }
    setFollowing(false);
    setSelectedTime(points[index >= points.length - 1 ? 0 : Math.max(0, index)]?.observedAt ?? null);
    setPlaying(true);
  }
  const score = data.prediction.status === 'available' ? data.prediction.model_score : null;

  const timeline = (
    <div className="twin-timeline">
      <div className="timeline-heading"><div><p className="eyebrow">{phase === 'vision' ? 'SCRIPTED NEXT 120 MINUTES' : 'RECEIVED SAMPLES / −120 TO +120 MINUTES'}</p><h3>{phase === 'vision' ? instanceScope ? 'Scenario glucose timeline' : 'Explore the possible interface' : workspaceCompact ? 'Received glucose samples' : 'Move through this patient’s timeline'}</h3></div><span className="stream-status">{phase === 'vision' ? 'Local storyboard · no API writes' : stream === 'connected' ? following ? 'Following latest received sample' : 'Viewing a recorded sample' : stream === 'error' ? 'Stream disconnected' : 'Connecting to sample stream'}</span></div>
      {stream === 'error' && <div className="timeline-warning" role="alert">Glucose stream unavailable. {phase === 'recorded' ? 'The body overlay is cleared; the chart retains the last received history.' : 'Only the previously loaded baseline is available for this mock.'} <button className="button button-secondary" onClick={() => setRetry(value => value + 1)}>Retry glucose stream</button></div>}
      {recorded.issue && <p className="timeline-warning" role="alert">{recorded.issue}</p>}
      {!points.length ? <p className="timeline-empty">{phase === 'vision' ? 'A valid recorded meal baseline is needed to start a fictional scenario.' : 'No valid samples in this meal window. Replay the patient’s synthetic data to begin.'}</p> : <>
        <div className="timeline-chart-labels"><span>Glucose · mg/dL</span><span>{phase === 'recorded' ? 'Shaded region: 120-minute follow-up window' : 'Fictional scenario · next 120 minutes'}</span></div>
        <div className="timeline-chart" role="img" aria-label={`${phase === 'vision' ? 'Fictional' : 'Recorded'} glucose timeline with ${points.length} samples. Selected ${point?.glucose} milligrams per deciliter at ${point?.minutes} minutes from meal.`}>
          <ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{ top: 20, right: 22, bottom: 6, left: -12 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="minutes" type="number" domain={phase === 'recorded' ? [-120,120] : [0,120]} ticks={phase === 'recorded' ? [-120,-60,0,60,120] : [0,30,60,90,120]} tickFormatter={value => value === 0 ? 'Meal' : `${value > 0 ? '+' : ''}${value}m`} tick={{ fontSize: 11 }} /><YAxis domain={[40, (max: number) => Math.max(240, Math.ceil(max / 20) * 20)]} tick={{ fontSize: 11 }} width={52} />
            {phase === 'recorded' && <ReferenceArea x1={0} x2={120} fill="var(--accent)" fillOpacity={.6} />}
            <Tooltip formatter={value => [`${Number(value).toFixed(0)} mg/dL`, phase === 'vision' ? 'Simulated' : 'Recorded']} labelFormatter={value => `${value} min from meal`} />
            <ReferenceLine y={180} stroke="var(--warning)" strokeDasharray="5 5" label={{ value: '180', position: 'insideTopRight', fill: 'var(--warning)', fontSize: 10 }} />
            {phase==='vision'&&<ReferenceLine y={70} stroke="var(--chart-low)" strokeDasharray="4 4" label={{value:'70 · illustration',position:'insideBottomRight',fill:'var(--chart-low)',fontSize:10}} />}
            <ReferenceLine x={0} stroke="var(--muted-foreground)" strokeDasharray="3 4" />
            <Line dataKey="glucose" type="linear" stroke={phase === 'vision' ? 'var(--primary)' : 'var(--chart-recorded)'} strokeWidth={2.5} strokeDasharray={phase === 'vision' ? '6 4' : undefined} dot={{ r: 3 }} isAnimationActive={false} />
            {point && <ReferenceDot x={point.minutes} y={point.glucose} r={7} fill={phase === 'vision' ? 'var(--primary)' : 'var(--chart-recorded)'} stroke="var(--card)" strokeWidth={2} />}
          </LineChart></ResponsiveContainer>
        </div>
        {!instanceScope && <label className="timeline-scrubber" htmlFor={`twin-time-${instanceScope || phase}`}><span>Selected sample <b>{index + 1} / {points.length}</b></span><input id={`twin-time-${instanceScope || phase}`} type="range" min={0} max={Math.max(0, points.length - 1)} step={1} value={Math.max(0, index)} aria-valuetext={`${point?.minutes} minutes from meal, ${point?.glucose} milligrams per deciliter`} onChange={event => scrub(Number(event.target.value))} /></label>}
        {!instanceScope && <div className="timeline-controls">{workspaceCompact && <><button className="button button-secondary" disabled={reduced || points.length < 2 || sourceUnavailable} onClick={play}>{playing ? 'Pause replay' : 'Play replay'}</button><button className="button button-secondary" disabled={!points.length || index <= 0} onClick={()=>scrub(index-1)}>Previous sample</button><button className="button button-secondary" disabled={!points.length || index >= points.length-1} onClick={()=>scrub(index+1)}>Next sample</button></>}{phase === 'recorded' && <button className="button button-secondary" aria-pressed={following} onClick={() => { setPlaying(false); setFollowing(true); }}>Follow latest</button>}<p>{reduced ? 'Reduced motion: use the slider or sample buttons.' : 'Replay speed: one sample per second. Not real elapsed time.'}</p></div>}
      </>}
      {!workspaceCompact && <div className="twin-interpretation"><strong>{phase === 'vision' ? 'Mock event overlay' : 'Sample interpretation'}</strong><p>{sourceUnavailable ? 'Waiting for a connected glucose stream.' : !point ? 'No sample selected.' : !isFutureWindow ? 'This sample is at or before the meal. It supplies context; it is not a future event.' : matchesTarget ? `${phase === 'vision' ? 'This fictional' : 'This received'} sample meets the research event rule (≥180 mg/dL or rise ≥40 from baseline).` : 'This individual sample does not meet the research event rule. It cannot rule out an event elsewhere in the window.'}</p><span>{phase === 'vision' ? 'Scenario samples stay separate from saved model results, journals and PDFs.' : 'A line connects received points for readability; glucose between samples is unknown.'}</span></div>}
    </div>
  );
  if(workspaceCompact) return <section ref={studio} className="workspace-history-content" aria-label="Patient glucose history" data-testid="twin-experience" data-phase="recorded">
    <div className="workspace-sample" aria-live="polite"><div><span>Selected reading</span><strong data-testid="twin-glucose">{sourceUnavailable || !point ? '—' : point.glucose.toFixed(0)} <small>mg/dL</small></strong></div><div><span>From meal</span><strong>{point ? `${point.minutes > 0 ? '+' : ''}${point.minutes} min` : '—'}</strong></div><div><span>Change from previous</span><strong>{sourceUnavailable || delta===null ? '—' : `${delta>0?'+':''}${delta} mg/dL`}</strong></div></div>
    {timeline}
    <details id="patient-twin" className="workspace-disclosure workspace-twin" onToggle={event=>setTwinOpen(event.currentTarget.open)}>
      <summary>View patient twin</summary>
      {twinOpen && <><BodyTwinPanel patientId={data.patient.patientId} glucose={baseline} modelScore={score} medications={data.patient.medications} signal={{...signal,playing:active && twinOpen && signal.playing}} phase="recorded"/><button className="button button-secondary" aria-pressed={animateSignal} disabled={reduced || signal.glucose === null || playing} onClick={()=>setAnimateSignal(value=>!value)}>{animateSignal ? 'Pause overlay motion' : 'Animate glucose overlay'}</button></>}
    </details>
  </section>;

  return <section ref={studio} className={`twin-experience ${phase === 'vision' ? 'vision-mode' : ''}`} aria-label="Patient digital twin studio" data-testid="twin-experience" data-phase={phase} data-instance={instanceScope || 'future'}>
    {!fixedPhase && <><div className="experience-topline"><div><p className="eyebrow">GLUCOTWIN / INTERACTIVE PATIENT</p><h2>One patient. Two perspectives.</h2></div><span className="experience-patient">{data.patient.patientId}<small>Synthetic patient</small></span></div>
    <div className="experience-modes" role="group" aria-label="Choose project phase">
      <button aria-pressed={phase === 'recorded'} onClick={() => switchPhase('recorded')}><span>01</span><div><strong>Working prototype</strong><small>Recorded glucose · actual API data</small></div></button>
      <button aria-pressed={phase === 'vision'} onClick={() => switchPhase('vision')}><span>02</span><div><strong>Future vision</strong><small>Simulated scenarios · no prediction</small></div></button>
    </div>
    </>}
    <div className="experience-source" role="status"><strong>{phase === 'recorded' ? 'PHASE 1 · SYNTHETIC RECORDINGS' : instanceScope ? 'SIMULATED GLUCOSE SCENARIOS' : 'PHASE 2 · SIMULATED FUTURE VISION'}</strong><span>{phase === 'recorded' ? 'Explore received synthetic glucose samples. The meal-time score remains fixed to its saved inputs.' : 'Simulated data — not a model prediction. Saved model scores and patient readings stay separate.'}</span></div>
    {phase === 'vision' && <><div className="scenario-selection"><label htmlFor={`twin-scenario-${controlScope}`}>Fictional glucose story<select id={`twin-scenario-${controlScope}`} value={scenario} onChange={event=>chooseScenario(event.target.value as ScenarioId)}>{Object.entries(SCENARIOS).map(([key, value]) => <option key={key} value={key}>{value.title}</option>)}</select></label><p>{SCENARIOS[scenario].description} Starts at the selected patient’s recorded baseline; subsequent values are invented.</p></div><div className="lab-shortcuts"><button className="button button-secondary" onClick={()=>chooseScenario('countdown',true)}>Open falling trend demo</button>{!instanceScope && <><button className="button button-secondary" onClick={()=>chooseScenario('artifact',true)}>Show unusual reading demo</button><a href="#validation-roadmap">Validation roadmap</a></>}</div></>}
    <BodyTwinPanel patientId={data.patient.patientId} glucose={baseline} modelScore={score} medications={data.patient.medications} signal={signal} phase={phase} instanceKey={instanceScope} playbackControls={<div className="viewer-playback">
      <div><strong>{phase === 'vision' ? 'FICTIONAL SCENARIO' : 'PATIENT REPLAY'}</strong><span>{point ? `${point.minutes > 0 ? '+' : ''}${point.minutes} min · ${point.glucose.toFixed(0)} mg/dL` : 'No sample'}</span></div>
      <label htmlFor={`viewer-time-${instanceScope || phase}`}>3D sample<input id={`viewer-time-${instanceScope || phase}`} type="range" min={0} max={Math.max(0, points.length - 1)} step={1} value={Math.max(0, index)} disabled={!points.length} aria-valuetext={`${point?.minutes ?? 'No'} minutes from meal`} onChange={event => scrub(Number(event.target.value))} /></label>
      <div className="viewer-playback-buttons"><button className="twin-button twin-primary" disabled={reduced || points.length < 2 || sourceUnavailable} onClick={play}>{playing ? 'Pause replay' : 'Play replay'}</button><button className="twin-button" disabled={!points.length || index <= 0} onClick={() => scrub(index - 1)}>Previous sample</button><button className="twin-button" disabled={!points.length || index >= points.length - 1} onClick={() => scrub(index + 1)}>Next sample</button></div>
      <p>{reduced ? 'Reduced motion: use the slider or sample buttons.' : '1 sample / second · animated paths are illustrative.'}</p>
      <button className="twin-button overlay-toggle" aria-pressed={animateSignal} disabled={reduced || signal.glucose === null || playing} onClick={() => setAnimateSignal(value => !value)}>{animateSignal ? 'Pause overlay motion' : 'Animate glucose overlay'}</button>
      <p className="overlay-help">{playing ? 'Replay controls the motion while playing.' : 'Animate the pathways without advancing the selected sample. No organ activity is measured.'}</p>
    </div>}>
      <div className="twin-telemetry" style={{ '--signal-color': signal.color } as React.CSSProperties}>
        <div className="telemetry-reading"><span>{phase === 'vision' ? 'SIMULATED GLUCOSE' : 'DISPLAYED GLUCOSE'}</span><strong data-testid="twin-glucose">{signal.glucose === null ? '—' : signal.glucose.toFixed(0)}<small>mg/dL</small></strong><p><i />{signal.label}</p></div>
        <div><span>REPLAY CLOCK</span><strong className="telemetry-time">{point ? `${point.minutes > 0 ? '+' : ''}${point.minutes} min` : '—'}</strong><p>{point?.minutes === 0 ? 'Meal-time baseline' : point && point.minutes < 0 ? 'Before the meal' : 'After the meal'} · {utcLabel(point?.observedAt)}</p></div>
        <div><span>CHANGE FROM PREVIOUS SAMPLE</span><strong className="telemetry-time">{signal.glucose !== null && delta !== null ? `${delta > 0 ? '+' : ''}${delta.toFixed(0)} mg/dL` : '—'}</strong><p>{elapsed !== null ? `Across ${elapsed} minutes · no interpolation` : 'First sample in this sequence'}</p></div>
      </div>
    </BodyTwinPanel>
    {phase==='vision' && (!instanceScope || scenario==='artifact') && <section className={`pattern-card pattern-${sourceUnavailable?'invalid':pattern.kind}`} data-testid="pattern-panel" data-kind={sourceUnavailable?'invalid':pattern.kind} aria-label="Unusual-reading display rules"><div><p className="section-label">UNVALIDATED DISPLAY RULE</p><h3>{sourceUnavailable?'Stream unavailable':pattern.title}</h3><p>{sourceUnavailable?'The current sample cannot be checked until the stream reconnects.':pattern.detail}</p></div><details><summary>How this flag works</summary><p>Uses only the selected and earlier samples: absolute rate ≥3 mg/dL/min, a rapid opposite-direction reversal, or a sample gap over 20 minutes. These project display settings have not been clinically validated. The flag cannot distinguish a true excursion from a sensor glitch and never changes the model inputs or saved score.</p></details></section>}
    {phase==='vision'&&<ProjectionPanel points={points} index={index} active={active} onRun={()=>{setPlaying(false);setAnimateSignal(false);}} />}
    {timeline}
  </section>;
}
