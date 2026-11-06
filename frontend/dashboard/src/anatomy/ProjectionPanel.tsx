import { useEffect, useState, useId } from 'react';
import { formatProjectionClock, projectTo70 } from './visualResearch';
import type { TwinPoint } from './twinSignals';

export default function ProjectionPanel({points,index,active,onRun}:{points:TwinPoint[];index:number;active:boolean;onRun:()=>void}) {
  const titleId=useId();
  const result=projectTo70(points,index);
  const [running,setRunning]=useState(false),[elapsed,setElapsed]=useState(0);
  const key=`${points[index]?.observedAt}-${points[index]?.glucose}-${result.rate}`;
  useEffect(()=>{setRunning(false);setElapsed(0);},[key]);
  useEffect(()=>{if(!active)setRunning(false);},[active]);
  useEffect(()=>{const pause=()=>{if(document.hidden)setRunning(false);};document.addEventListener('visibilitychange',pause);return()=>document.removeEventListener('visibilitychange',pause);},[]);
  const duration=result.minutes===null?0:result.minutes*60;
  useEffect(()=>{
    if(!running || !active || result.status!=='projected')return;
    const start=performance.now(),prior=elapsed;
    const timer=window.setInterval(()=>{const next=Math.min(duration,prior+(performance.now()-start)/1000);setElapsed(next);if(next>=duration)setRunning(false);},250);
    return()=>clearInterval(timer);
    // Capture elapsed at a start/resume, not at every clock tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[running,active,key,duration,result.status]);
  const remaining=Math.max(0,duration-elapsed);
  return <section className="projection-card" aria-labelledby={titleId} data-testid="projection-panel" data-state={result.status}>
    <div className="projection-title-row"><div><p className="section-label">SIMULATED DATA · TREND PROJECTION</p><h3 id={titleId}>If the current fictional slope continued</h3></div><span className="projection-badge">Not a medical forecast</span></div>
    {result.status==='projected' ? <>
      <div className="projection-readout"><div><span>Illustrated time to 70 mg/dL</span><strong data-testid="projection-clock" role="timer" aria-live="off" aria-label={`Illustrated minutes and seconds to 70: ${formatProjectionClock(remaining)}`}>{formatProjectionClock(remaining)}</strong><small>minutes : seconds of simulated time</small></div><p>Simulated demo: if glucose kept falling at <b>{Math.abs(result.rate!).toFixed(2)} mg/dL/min</b>, it would cross 70 mg/dL in about <b>{Math.ceil(remaining/60)} minutes</b>. This is arithmetic on dummy data, not a validated forecast.</p></div>
      <div className="projection-progress" aria-hidden="true"><span style={{transform:`scaleX(${duration?elapsed/duration:0})`}} /></div>
      <div className="projection-actions"><button className="button button-primary" disabled={remaining===0} onClick={()=>{onRun();setRunning(value=>!value);}}>{running?'Pause projection clock':'Run projection clock'}</button><button className="button button-secondary" onClick={()=>{setRunning(false);setElapsed(0);}}>Reset projection clock</button><span>{remaining===0?'Illustrated threshold reached.':running?'Clock running · no new samples received.':'Clock paused.'}</span></div>
      <details><summary>Show the calculation and assumptions</summary><p>({result.glucose!.toFixed(0)} − 70) ÷ {Math.abs(result.rate!).toFixed(2)} = {result.minutes!.toFixed(1)} minutes. Slope uses only the selected and preceding fictional samples. One real second advances one simulated second. The selected body/chart sample remains fixed; this clock does not infer a new glucose measurement.</p><p>Illustrated value along that line: <b>{Math.max(70,result.glucose!+result.rate!*elapsed/60).toFixed(1)} mg/dL</b>. Flat/rising slopes, gaps over 20 minutes, flagged changes and crossings beyond 120 minutes withhold the countdown.</p></details>
    </> : <p className="projection-empty">{result.reason}</p>}
    <p className="projection-boundary">Research illustration only. Do not use this clock to decide food, medication, monitoring or emergency actions. It is excluded from model results, journals and research PDFs.</p>
  </section>;
}
