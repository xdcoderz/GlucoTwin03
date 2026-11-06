import {useEffect,useRef,useState} from 'react';
import type {DashboardData,Prediction} from '../types';
import BodyTwinPanel from '../anatomy/BodyTwinPanel';
import type {TwinSignal} from '../anatomy/twinSignals';
import './meal.css';

const GROUPS=[
  ['rice','Rice',/\brice\b/i],['bread','Bread / roti',/\b(bread|bun|toast|roti|rotis|chapati|chapatis|paratha|parathas)\b/i],
  ['vegetable','Vegetables',/\b(vegetables?|spinach|cabbage|lettuce|cucumber|tomato|broccoli|cauliflower|salad)\b/i],
  ['animal_protein','Meat / eggs / fish',/\b(beef|chicken|duck|eggs?|fish|lamb|mutton|pork|shrimp)\b/i],
  ['fruit','Fruit',/\b(fruit|apple|banana|grape|orange|peach|pear|pomelo|watermelon)\b/i],
  ['dairy','Dairy',/\b(milk|yogurt|yoghurt|curd|paneer|cheese)\b/i],
  ['noodle','Noodles',/\b(noodles?|vermicelli)\b/i],['root_or_corn','Roots / corn',/\b(potato|yam|corn|lotus root)\b/i],
] as const;
const suggest=(text:string)=>GROUPS.filter(([, ,pattern])=>pattern.test(text)).map(([key])=>key as string);
const weight=(text:string)=>[...text.matchAll(/(?<![a-z])(\d+(?:\.\d+)?)\s*g\b/gi)].reduce((sum,match)=>sum+Number(match[1]),0)||200;
type MealInput={description:string;categories:string[];portionGrams:number|'';minutesSincePreviousMeal:number|''};
type Simulation={simulationId:string;mode:string;patientId:string;createdAt:string;baselineAt:string;inputHash:string;meal:{description:string;selectedFoodCategories:string[];portionGrams:number;minutesSincePreviousMeal:number};prediction:Prediction;features:Record<string,number|null>;note:string};

export default function MealSimulator({data,api,ready,active}:{data:DashboardData;api:string;ready:boolean;active:boolean}) {
  const initial=():MealInput=>({description:data.currentMeal.description,categories:suggest(data.currentMeal.description),portionGrams:weight(data.currentMeal.description),minutesSincePreviousMeal:data.currentMeal.minutesSincePreviousMeal});
  const [input,setInput]=useState<MealInput>(initial);
  const [result,setResult]=useState<Simulation|null>(null);
  const [records,setRecords]=useState<Simulation[]>([]);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[historyError,setHistoryError]=useState('');
  const [showTwin,setShowTwin]=useState(false);
  const pending=useRef<AbortController|null>(null);
  const mounted=useRef(true);
  const endpoint=`${api}/patients/${data.patient.patientId}/meal-simulations`;
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;pending.current?.abort();};},[]);
  async function loadRecords(signal?:AbortSignal) {
    try {
      const response=await fetch(endpoint,{cache:'no-store',signal:signal||AbortSignal.timeout(10000)});
      if(!response.ok)throw new Error();
      const rows=await response.json();if(mounted.current){setRecords(rows);setHistoryError('');}
    }catch{if(mounted.current&&!signal?.aborted)setHistoryError('Saved meal simulations could not be loaded.');}
  }
  useEffect(()=>{const controller=new AbortController();void loadRecords(controller.signal);return()=>controller.abort();},[endpoint]);
  function change(update:Partial<MealInput>) {setInput(value=>({...value,...update}));setResult(null);setShowTwin(false);setError('');}
  async function submit(event:React.FormEvent) {
    event.preventDefault();if(busy||!ready)return;
    setBusy(true);setError('');setResult(null);setShowTwin(false);
    const controller=new AbortController();pending.current=controller;
    const timeout=setTimeout(()=>controller.abort(),16000);
    try {
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,description:input.description.trim()}),signal:controller.signal});
      const row=await response.json();
      if(!response.ok)throw new Error(row.error||'The meal simulation could not be completed.');
      if(mounted.current){setResult(row);setShowTwin(row.prediction.status==='available');setRecords(old=>[row,...old.filter(r=>r.simulationId!==row.simulationId)].slice(0,20));}
    }catch(e){if(mounted.current)setError(controller.signal.aborted?'The response was not confirmed. Reload saved simulations before retrying.':e instanceof Error?e.message:'The API is unavailable. No score was substituted.');}
    finally{clearTimeout(timeout);if(mounted.current)setBusy(false);pending.current=null;}
  }
  function openRecord(row:Simulation) {
    setInput({description:row.meal.description,categories:row.meal.selectedFoodCategories,portionGrams:row.meal.portionGrams,minutesSincePreviousMeal:row.meal.minutesSincePreviousMeal});
    setResult(row);setShowTwin(false);setError('');
  }
  const baseline=data.cgmHistory.find(row=>Date.parse(row.observedAt)===Date.parse(data.currentMeal.baselineAt||''))?.glucoseMgDl??null;
  const prediction=result?.prediction;
  const score=prediction?.status==='available'?prediction.model_score:null;
  const signal: TwinSignal={glucose:baseline,playing:false,contextOnly:true,color:score===null?'#9bb3bd':prediction?.predicted_event?'#ef646e':'#629cf5',label:'Meal what-if score context',bodyGlow:{tone:score===null?'unavailable':prediction?.predicted_event?'attention':'neutral',color:prediction?.predicted_event?'#ef646e':'#629cf5',intensity:score===null?0:1,label:score===null?'No model score · glow off':prediction?.predicted_event?'Red · meal score at/above the 0.50 research threshold':'Blue · meal score below the 0.50 research threshold'}};
  return <section id="meal-context" className="meal-simulator panel" aria-labelledby="meal-simulator-title">
    <header className="meal-form-heading"><div><p className="eyebrow">YOUR MEAL · WHAT-IF</p><h2 id="meal-simulator-title">What are you planning to eat?</h2><p>Try a meal against this synthetic patient’s saved glucose history.</p></div><span className="status-pill">CUSTOM MEAL</span></header>
    <div className="meal-context-meta meal-strip"><div><span>Fixed baseline · UTC</span><strong>{(data.currentMeal.baselineAt||'').replace('T',' ').slice(0,16)}</strong></div><div><span>Glucose at baseline</span><strong>{baseline??'—'} mg/dL</strong></div><div><span>Prediction window</span><strong>Next 120 minutes</strong></div></div>
    <div className="meal-form-grid">
      <form onSubmit={event=>void submit(event)} aria-label="Custom meal simulator">
        <fieldset disabled={busy}>
          <label htmlFor="custom-meal-description">Meal description</label>
          <textarea id="custom-meal-description" required maxLength={500} rows={3} placeholder="e.g. 2 rotis, dal and a cup of curd" value={input.description} onChange={event=>change({description:event.target.value,categories:suggest(event.target.value)})}/>
          <fieldset className="meal-food-groups"><legend>Food groups</legend><p>Suggested from the description. Tap to correct them; selected groups go to the model.</p><div className="meal-chips">{GROUPS.map(([key,label])=><button key={key} type="button" aria-pressed={input.categories.includes(key)} onClick={()=>change({categories:input.categories.includes(key)?input.categories.filter(k=>k!==key):[...input.categories,key]})}>{label}</button>)}</div><small>Dal and other plant proteins have no dedicated feature in this model. These groups are not a nutrient analysis.</small></fieldset>
          <div className="meal-portion-heading"><label htmlFor="custom-meal-weight">Total portion (g)</label><input id="custom-meal-weight" type="number" min="1" max="2000" step="1" required value={input.portionGrams} onChange={event=>change({portionGrams:event.target.value===''?'':event.target.valueAsNumber})}/></div>
          <input className="meal-portion-slider" type="range" min="50" max="400" step="5" aria-label="Adjust total meal portion" value={Math.max(50,Math.min(400,input.portionGrams||50))} onChange={event=>change({portionGrams:Number(event.target.value)})}/><div className="portion-scale"><span>50 g · light</span><span>200 g</span><span>400 g · large</span></div>
          <p className="meal-field-help">The total above is used even if the description includes gram amounts. Enter 1–2,000 g directly if needed.</p>
          <label className="meal-previous" htmlFor="custom-meal-previous">Minutes since previous meal<input id="custom-meal-previous" type="number" required min="0" max="1440" step="1" value={input.minutesSincePreviousMeal} onChange={event=>change({minutesSincePreviousMeal:event.target.value===''?'':event.target.valueAsNumber})}/></label>
          <button className="button button-primary meal-simulate-button" type="submit" disabled={!ready||busy}>{busy?'Running model…':'Simulate this meal'}</button>
          <p className="meal-field-help">{ready?'Saves a separate what-if attempt with the exact meal and model inputs.':'Requires all nine correctly timed readings and a connected API.'}</p>
        </fieldset>
      </form>
      <div className="meal-result" aria-live="polite" aria-atomic="true" aria-busy={busy}>
        {error?<p className="meal-error" role="alert">{error}</p>:busy?<><p className="eyebrow">MODEL RUNNING</p><h3>Testing your meal…</h3><p>Combining the new meal with the fixed patient history.</p></>:result?<>
          <p className="eyebrow">CUSTOM MEAL RESULT · SAVED WHAT-IF</p><h3>{result.meal.description}</h3>
          <div className="meal-score-value" data-testid="meal-simulation-score">{score===null?'—':score.toFixed(3)}</div>
          <p>{score===null?prediction?.status==='insufficient_data'?'More correctly timed glucose history is needed.':'Model score unavailable. No estimate was substituted.':<>Uncalibrated event score · next 120 minutes<br/>{prediction?.predicted_event?'At/above':'Below'} the 0.50 research threshold.</>}</p>
          <p className="meal-result-boundary">This is a hypothetical meal at the displayed baseline, not a log of food actually eaten. It cannot establish that a meal is safe or estimate a treatment effect.</p>
          {score!==null&&<><h4>Leading factors</h4><ul className="meal-factor-list">{prediction?.top_factors?.map(f=><li key={f.feature}><span>{f.feature.replaceAll('_',' ')}</span><strong>{f.direction==='up'?'Raises':'Lowers'} score</strong></li>)}</ul><button type="button" className="button button-secondary" onClick={()=>setShowTwin(value=>!value)}>{showTwin?'Hide meal simulation twin':'Show meal simulation twin'}</button></>}
          <details className="meal-input-details"><summary>Exact inputs used</summary><p>Patient {result.patientId} · baseline {result.baselineAt} · {result.meal.portionGrams} g</p><p>Selected groups: {result.meal.selectedFoodCategories.join(', ')||'none'}.</p><p>Model: {prediction?.model_version||'unavailable'}. This model has no carbohydrate-gram input and no dedicated dal/legume feature.</p><pre>{JSON.stringify(result.features,null,2)}</pre><small>Input fingerprint: {result.inputHash}</small></details>
        </>:<><p className="eyebrow">MEAL SIMULATION</p><h3>A different meal. The same patient context.</h3><p>Enter your meal, check the groups and portion, then run the fitted model.</p><ol><li>Patient record and glucose history stay fixed.</li><li>Your meal supplies the meal features.</li><li>The model returns a score and contributing factors.</li></ol><p>No future glucose curve is generated. This is a research what-if, not a dietary recommendation.</p></>}
      </div>
    </div>
    {active&&showTwin&&score!==null&&<BodyTwinPanel patientId={data.patient.patientId} glucose={baseline} modelScore={score} signal={signal} instanceKey="meal-simulator" displayMode="meal_score"/>}
    <details className="meal-simulation-history"><summary>Saved meal simulations ({records.length}{records.length===20?'+':''})</summary><p>Latest 20 what-if attempts for {data.patient.patientId}. These do not replace the recorded meal, follow-up or saved clinical research journal.</p>{historyError&&<p role="status">{historyError}</p>}<button type="button" className="button button-secondary" disabled={busy} onClick={()=>void loadRecords()}>Reload saved simulations</button>{records.length?<ul>{records.map(row=><li key={row.simulationId}><button type="button" disabled={busy} onClick={()=>openRecord(row)}><span>{row.meal.description}<small>{row.meal.portionGrams} g · {new Date(row.createdAt).toLocaleString()}</small></span><strong>{row.prediction.status==='available'&&row.prediction.model_score!==null?row.prediction.model_score.toFixed(3):'Unavailable'}</strong></button></li>)}</ul>:<p>No saved custom meals yet.</p>}</details>
    <details className="original-recorded-meal"><summary>Original recorded meal</summary><p>{data.currentMeal.description}</p><p>The recorded-meal score and follow-up below continue to use this original meal. Custom simulations are saved separately.</p><button type="button" disabled={busy} className="button button-secondary" onClick={()=>{setInput(initial());setResult(null);setShowTwin(false);}}>Use original meal in form</button></details>
  </section>;
}
