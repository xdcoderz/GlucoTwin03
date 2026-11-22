import { useEffect, useRef, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Curve = { minutes:number; baseline:number; scenario:number; lower:number; upper:number; scenarioLower:number; scenarioUpper:number };
type Result = {
  status:string; reason?:string; origin:string; calibration:string; modelVersion:string;
  measured:number; prior:number; corrected:number; curve:Curve[]; horizons:Curve[];
  residualStatus:string; calibrationRequirement:string; assumptions:string[];
  events:{ index:number; type:string; biasShift?:number }[];
  evaluation:{minutes:number;count:number;mae:number|null;persistenceMae:number|null}[];
  metrics:{status:string;meanGlucose:number;tir:number;tar:number;tbr:number;cv:number;gmi:number|null;coveragePercent:number;observedMinutes:number;method:string};
  wearableContext:{observedAt:string;heartRateBpm:number|null;hrvMs:number|null;sleepHours:number|null}[];
};
type Saved = {forecastId:string;createdAt:string;result:Result};
type Props = { api:string; patientId:string; origin?:string; unavailable:boolean };
const display=(v:number|null|undefined,suffix='')=>v==null?'Not available':`${v.toFixed(1)}${suffix}`;

export default function ReplayForecast({api,patientId,origin,unavailable}:Props) {
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [saved,setSaved]=useState<Saved|null>(null),[history,setHistory]=useState<Saved[]>([]);
  const [carbs,setCarbs]=useState(0),[slow,setSlow]=useState(.5),[walk,setWalk]=useState(0);
  const [contextStatus,setContextStatus]=useState(''),[contextBusy,setContextBusy]=useState(false);
  const [context,setContext]=useState({carbsGrams:'',stepsPer5Min:'',heartRateBpm:'',hrvMs:'',sleepHours:''});
  const pending=useRef<AbortController|null>(null),contextPending=useRef<AbortController|null>(null),historyPending=useRef<AbortController|null>(null);
  const generation=useRef(0);
  const endpoint=`${api}/patients/${encodeURIComponent(patientId)}/twin`;
  useEffect(()=>{generation.current++;pending.current?.abort();contextPending.current?.abort();historyPending.current?.abort();setSaved(null);setError('');setBusy(false);setContextBusy(false);setContextStatus('');setHistory([]);setContext({carbsGrams:'',stepsPer5Min:'',heartRateBpm:'',hrvMs:'',sleepHours:''});
    return()=>{generation.current++;pending.current?.abort();contextPending.current?.abort();historyPending.current?.abort();};
  },[endpoint,origin,unavailable]);
  function edit(action:()=>void){generation.current++;pending.current?.abort();setBusy(false);setSaved(null);setError('');action();}
  async function run(){
    if(!origin||unavailable||busy)return;
    const version=++generation.current;pending.current?.abort();const controller=new AbortController();pending.current=controller;
    setBusy(true);setSaved(null);setError('');const timeout=setTimeout(()=>controller.abort(),70000);
    try {
      const response=await fetch(`${endpoint}/forecasts`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({origin,scenario:{carbsGrams:carbs,slowFraction:slow,walkMinutes:walk}}),signal:controller.signal});
      const row=await response.json();
      if(!response.ok||!row.result)throw new Error(row.reason||row.error||'Forecast could not be completed.');
      if(generation.current===version){setSaved(row);setHistory(old=>[row,...old.filter(r=>r.forecastId!==row.forecastId)].slice(0,20));}
    }catch(e){if(generation.current===version)setError(controller.signal.aborted?'Response not confirmed. Check saved forecasts before retrying.':e instanceof Error?e.message:'Twin service unavailable.');}
    finally{clearTimeout(timeout);if(generation.current===version)setBusy(false);}
  }
  async function loadHistory(){
    historyPending.current?.abort();const controller=new AbortController();historyPending.current=controller;const version=generation.current;
    const timeout=setTimeout(()=>controller.abort(),8000);
    try{const response=await fetch(`${endpoint}/forecasts`,{signal:controller.signal});if(!response.ok)throw Error();const rows=await response.json();if(generation.current===version)setHistory(rows);}
    catch{if(generation.current===version)setError('Saved forecasts could not be loaded. Try again.');}finally{clearTimeout(timeout);}
  }
  async function recordContext(event:React.FormEvent){
    event.preventDefault();if(!origin||contextBusy)return;
    const body:Record<string,number|string|null>={observedAt:origin,slowFraction:slow};
    Object.entries(context).forEach(([key,value])=>body[key]=value===''?null:Number(value));
    if(Object.values(context).every(v=>v==='')){setContextStatus('Enter at least one observation.');return;}
    contextPending.current?.abort();const controller=new AbortController();contextPending.current=controller;const version=generation.current;
    const timeout=setTimeout(()=>controller.abort(),8000);setContextBusy(true);setContextStatus('Saving context…');
    try{const response=await fetch(`${endpoint}/context`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});if(!response.ok)throw Error(response.status===409?'Context already exists at this timestamp. Existing observations were preserved.':'Context could not be saved.');
      if(generation.current===version){setSaved(null);setContextStatus('Context saved. Run the forecast again to use it.');}}
    catch(e){if(generation.current===version)setContextStatus(e instanceof Error?e.message:'Context unavailable.');}
    finally{clearTimeout(timeout);if(generation.current===version)setContextBusy(false);}
  }
  const result=saved?.result, available=result?.status==='available';
  function downloadRecord(row:Saved){
    const url=URL.createObjectURL(new Blob([JSON.stringify(row,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=`glucotwin-twin-${row.forecastId}.json`;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const data=available?result.curve.map(p=>({...p,band:[p.lower,p.upper],scenarioBand:[p.scenarioLower,p.scenarioUpper]})):[];
  return <details className="workspace-disclosure replay-forecast" onToggle={e=>setOpen(e.currentTarget.open)}>
    <summary>Glucose forecast at selected reading</summary>
    {open&&<div className="twin-backend-panel">
      <p>Experimental physiological twin · six states · Kalman updates. Separate from the meal event score.</p>
      <p>Selected reading: <time>{origin?new Date(origin).toISOString().replace('T',' ').slice(0,16)+' UTC':'No reading selected'}</time></p>
      <form className="twin-scenario-form" onSubmit={e=>{e.preventDefault();void run();}} aria-label="Physiological meal and walk comparison">
        <label>Additional carbohydrate (g)<input type="number" min="0" max="200" step="1" disabled={contextBusy} value={carbs} onChange={e=>edit(()=>setCarbs(Number(e.target.value)))}/></label>
        <label>Slow absorption fraction<input type="number" min="0" max="1" step="0.1" disabled={contextBusy} value={slow} onChange={e=>edit(()=>setSlow(Number(e.target.value)))}/></label>
        <label>Walking duration (minutes)<input type="number" min="0" max="120" step="5" disabled={contextBusy} value={walk} onChange={e=>edit(()=>setWalk(Number(e.target.value)))}/></label>
        <p className="twin-form-note">Carbohydrate is a scenario input, not total food weight. Walking uses an assumed moderate activity effect. These controls do not change the recorded meal.</p>
        <button className="button button-primary" disabled={busy||unavailable||!origin||contextBusy}>{busy?'Calculating and saving…':'Run & save twin forecast'}</button>
      </form>
      {(unavailable||!origin)&&<p role="status">Forecast unavailable until a valid recorded glucose stream is connected.</p>}
      {error&&<p role="alert">{error} No substitute forecast is shown.</p>}
      <div aria-live="polite">{result&&!available&&<p>{result.reason||'More recorded history is needed.'}</p>}{available&&<p>Saved {result.calibration==='patient_fit'?'patient-fitted':'prior-parameter'} simulation. Forecast origin: {new Date(result.origin).toISOString().replace('T',' ').slice(0,16)} UTC.</p>}</div>
      {available&&<div data-testid="replay-forecast" data-forecast-origin={result.origin}>
        <dl className="forecast-values"><div><dt>Before reading</dt><dd>{display(result.prior,' mg/dL')}</dd></div><div><dt>Sensor reading</dt><dd>{display(result.measured,' mg/dL')}</dd></div><div><dt>Corrected estimate</dt><dd>{display(result.corrected,' mg/dL')}</dd></div></dl>
        <p>Solid line: no additional meal or walk. Dashed line: selected scenario. Shading: 90% simulation bands, not validated prediction intervals.</p>
        <div className="twin-forecast-chart" role="img" aria-label="Baseline and hypothetical meal and walk glucose curves over the next 120 minutes, with simulation bands">
          <ResponsiveContainer width="100%" height={270}><ComposedChart data={data} margin={{left:0,right:12,top:12,bottom:10}}>
            <CartesianGrid stroke="var(--border)"/><XAxis dataKey="minutes" ticks={[30,60,90,120]} unit="m"/><YAxis width={55} domain={['auto','auto']}/><Tooltip formatter={value=>Array.isArray(value)?value.map(v=>Number(v).toFixed(1)).join(' – '):Number(value).toFixed(1)} labelFormatter={value=>`${value} minutes ahead`} contentStyle={{background:'var(--soft)',border:'1px solid var(--border)',fontSize:12}} wrapperStyle={{maxWidth:'100%',overflowWrap:'anywhere'}}/>
            <Area dataKey="band" stroke="none" fill="#629cf5" fillOpacity={.14} isAnimationActive={false} name="Baseline band"/>
            <Area dataKey="scenarioBand" stroke="none" fill="#c4a1ed" fillOpacity={.12} isAnimationActive={false} name="Scenario band"/>
            <Line dataKey="baseline" stroke="#629cf5" dot={false} strokeWidth={2} isAnimationActive={false} name="Baseline mg/dL"/>
            <Line dataKey="scenario" stroke="#c4a1ed" strokeDasharray="6 4" dot={false} strokeWidth={2} isAnimationActive={false} name="Scenario mg/dL"/>
          </ComposedChart></ResponsiveContainer>
        </div>
        <div className="twin-table-scroll"><table><caption>Projected glucose · mg/dL</caption><thead><tr><th>Horizon</th><th>No additional inputs</th><th>Scenario</th></tr></thead><tbody>{result.horizons.map(p=><tr key={p.minutes}><th>+{p.minutes} min</th><td>{display(p.baseline)}</td><td>{display(p.scenario)}</td></tr>)}</tbody></table></div>
        <h4>CGM summary through forecast origin</h4>
        {result.metrics.status==='available'?<><dl className="forecast-values"><div><dt>Mean glucose</dt><dd>{display(result.metrics.meanGlucose,' mg/dL')}</dd></div><div><dt>In range · 70–180</dt><dd>{display(result.metrics.tir,'%')}</dd></div><div><dt>Above 180</dt><dd>{display(result.metrics.tar,'%')}</dd></div><div><dt>Below 70</dt><dd>{display(result.metrics.tbr,'%')}</dd></div><div><dt>Glucose CV</dt><dd>{display(result.metrics.cv,'%')}</dd></div><div><dt>GMI</dt><dd>{result.metrics.gmi===null?'Needs 14 days / 70% coverage':display(result.metrics.gmi,'%')}</dd></div></dl><p>{display(result.metrics.observedMinutes)} observed minutes · {display(result.metrics.coveragePercent,'%')} duration coverage. {result.metrics.method}</p><p>The summary includes 180 in range; the separate meal event definition uses ≥180.</p></>:<p>More recorded samples are needed for summary metrics.</p>}
        <details><summary>Calibration, evaluation and recorded context</summary><p>{result.calibrationRequirement} Current: {result.calibration.replaceAll('_',' ')}. Residual correction: {result.residualStatus.replaceAll('_',' ')}.</p>
          <div className="twin-table-scroll"><table><caption>Chronological evaluation after calibration · MAE in mg/dL</caption><thead><tr><th>Horizon</th><th>Pairs</th><th>Twin</th><th>Flat forecast</th></tr></thead><tbody>{result.evaluation.map(e=><tr key={e.minutes}><th>{e.minutes} min</th><td>{e.count}</td><td>{display(e.mae)}</td><td>{display(e.persistenceMae)}</td></tr>)}</tbody></table></div>
          <p>Zero pairs means no evaluation evidence yet. These values do not inherit accuracy from either upstream repository.</p>
          {result.events.length?<ul>{result.events.map((e,i)=><li key={i}>{e.type.replaceAll('_',' ')} at grid minute {e.index*5}{e.biasShift===undefined?'':` · bias shift ${e.biasShift.toFixed(1)} mg/dL`}</li>)}</ul>:<p>No drift or gap-reset events detected in this history.</p>}
          <p>Wearable context (display only for HR, HRV and sleep):</p>{result.wearableContext.length?<ul>{result.wearableContext.slice(-5).map((c,i)=><li key={i}>{c.observedAt}: HR {display(c.heartRateBpm,' bpm')}; HRV {display(c.hrvMs,' ms')}; sleep {display(c.sleepHours,' h')}</li>)}</ul>:<p>No wearable observations recorded.</p>}
          <ul>{result.assumptions.map(a=><li key={a}>{a}</li>)}</ul><p>Model {result.modelVersion} · saved result {saved?.forecastId}</p>
        </details>
      </div>}
      <details><summary>Record meal or wearable context at selected reading</summary><p>Only enter known synthetic observations. Meal carbohydrate and steps affect the twin; HR, HRV and sleep are shown as context. Blank means unknown. The slow absorption fraction above applies to logged carbohydrate.</p>
        <form className="twin-scenario-form" aria-label="Record twin context" onSubmit={e=>void recordContext(e)}>
          {([['carbsGrams','Recorded carbohydrate (g)',0,200],['stepsPer5Min','Steps in the preceding 5-minute interval',0,1500],['heartRateBpm','Heart rate (bpm)',25,250],['hrvMs','HRV (ms)',0,400],['sleepHours','Sleep (hours)',0,24]] as const).map(([key,label,min,max])=><label key={key}>{label}<input type="number" min={min} max={max} step="any" value={context[key]} onChange={e=>setContext({...context,[key]:e.target.value})}/></label>)}
          <button className="button button-secondary" disabled={!origin||contextBusy||busy}>{contextBusy?'Saving…':'Save recorded context'}</button>
        </form><p role="status">{contextStatus}</p>
      </details>
      <details><summary>Saved twin forecasts</summary><button className="button button-secondary" onClick={()=>void loadHistory()}>Reload saved forecasts</button><ul>{history.map(row=><li key={row.forecastId}>{new Date(row.createdAt).toISOString().replace('T',' ').slice(0,16)} UTC · {row.result.origin||'insufficient history'} · {row.result.status} <button className="button button-secondary" onClick={()=>downloadRecord(row)}>Download saved twin JSON</button></li>)}</ul><p>Latest 20 results. Inputs, parameters, covariance and scenario curves are saved on the server for reproducibility.</p></details>
    </div>}
  </details>;
}
