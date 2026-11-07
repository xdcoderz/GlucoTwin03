import { useCallback, useEffect, useRef, useState } from "react";
import { Overview, Evidence, ValidationRoadmap } from "./site/SitePages";
import { useSiteLocation } from "./site/location";
import "./site/site.css";
import { gsap, useGSAP, easeOut } from './motion/gsap';
import TwinExperience from "./anatomy/TwinExperience";
import WorkspaceScenarios from "./anatomy/WorkspaceScenarios";
import type { DashboardData, Prediction, Readiness } from "./types";
import ResearchWorkflow from "./workflow/ResearchWorkflow";
import PhaseOneFlow from "./workflow/PhaseOneFlow";
import MotionDashboard from "./motion/MotionDashboard";
import LandingExperience from './landing/LandingExperience';
import './site/integrated.css';
import ThemeToggle from './site/ThemeToggle';
import './site/workspace.css';
import MealSimulator from './meal/MealSimulator';

const API = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const initialPatientId = new URLSearchParams(window.location.search).get("patient") === "DEMO-002" ? "DEMO-002" : "DEMO-001";

function App() {
  const site = useSiteLocation();
  const [futureVisited, setFutureVisited] = useState(site.destination === "future");
  const [workspaceVisited, setWorkspaceVisited] = useState(site.destination === 'workspace');
  const [patientId, setPatientId] = useState(initialPatientId);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState("");
  const [actionError, setActionError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [newAttemptRevision, setNewAttemptRevision] = useState(0);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const activePatient = useRef(patientId);
  const loadVersion = useRef(0);
  function selectPatient(id: string) { const url = new URL(location.href); url.searchParams.set('patient',id); history.replaceState(null,'',url); if (id === activePatient.current) return; activePatient.current = id; setData(null); setReadiness(null); setLoading(true); setConnectionError(''); setActionError(''); setRefreshing(false); setNotice(''); setPatientId(id); }

  useEffect(() => { selectPatient(site.patient); }, [site.patient]);
  useEffect(() => {
    if (site.destination === 'future') setFutureVisited(true);
    if (site.destination === 'workspace') setWorkspaceVisited(true);
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(site.anchor);
      if (target && !['workspace','future','overview','evidence'].includes(site.anchor)) { if(target instanceof HTMLDetailsElement)target.open=true; let parent = target.parentElement; while(parent) { if(parent instanceof HTMLDetailsElement) parent.open = true; parent = parent.parentElement; } target.scrollIntoView({ block: 'start' }); }
      else { window.scrollTo(0,0); document.querySelector<HTMLElement>(`[data-destination="${site.destination}"] h1`)?.focus({ preventScroll:true }); }
    });
    return () => cancelAnimationFrame(frame);
  }, [site.destination, site.anchor, loading]);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const elements = document.querySelectorAll(`[data-destination="${site.destination}"] .intro-hero, [data-destination="${site.destination}"] .intro-product, [data-destination="${site.destination}"] .destination-heading`);
      if (elements.length) gsap.from(elements,{opacity:0,y:12,duration:.25,stagger:.05,ease:easeOut,clearProps:'opacity,transform'});
    });
    return () => media.revert();
  }, { dependencies:[site.destination], revertOnUpdate:true });

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    try {
      const response = await fetch(`${API}/api/patients/${patientId}`, { cache: "no-store", signal: AbortSignal.timeout(6500) });
      if (!response.ok) throw new Error(`Spring API returned ${response.status}`);
      const body = (await response.json()) as DashboardData;
      if (activePatient.current !== patientId || version !== loadVersion.current) return;
      setData(body);
      setConnectionError("");
      setLoading(false);
    } catch {
      if (activePatient.current !== patientId || version !== loadVersion.current) return;
      setConnectionError("Can’t reach the GlucoTwin API. Check that the stack is running, then retry.");
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    let stopped = false; let timer: number;
    const poll = async () => { await load(); if (!stopped) timer = window.setTimeout(() => void poll(), 2500); };
    void poll();
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const enoughHistory = readiness?.historyReady === true && !connectionError;

  async function scoreCurrentMeal() {
    if (refreshing || !enoughHistory) return;
    setRefreshing(true);
    setActionError("");
    setNotice("");
    try {
      const response = await fetch(`${API}/api/patients/${patientId}/refresh`, { method: "POST", signal: AbortSignal.timeout(15000) });
      const result = (await response.json()) as Prediction;
      if (activePatient.current !== patientId) return;
      if (!response.ok && result.status !== "unavailable") throw new Error("The score request failed. Retry after checking the services.");
      await load();
      if (activePatient.current !== patientId) return;
      setNewAttemptRevision(value => value + 1);
      setNotice(result.status === "available" ? "Model score updated." : result.status === "insufficient_data" ? "More CGM history is needed before scoring." : "The model score is unavailable. No score was substituted.");
    } catch (error) {
      if (activePatient.current !== patientId) return;
      setActionError(error instanceof Error ? error.message : "The score request failed.");
    } finally {
      if (activePatient.current === patientId) setRefreshing(false);
    }
  }

  const prediction = data?.prediction;
  const score = prediction?.status === "available" && prediction.model_score !== null ? prediction.model_score : null;

  return (
    <MotionDashboard>
      <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.querySelector<HTMLElement>(`[data-destination="${site.destination}"] h1`)?.focus(); }}>Skip to content</a>
      <header className="topbar site-topbar">
        <a className="brand" href="#overview" aria-label="GlucoTwin dashboard home"><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 12h4l3-7 4 14 3-7h4"/><circle cx="12" cy="12" r="10" opacity=".3"/></svg></span><span>Gluco<span className="brand-light">Twin</span><small>Patient research workspace</small></span></a>
        <nav className="site-nav" aria-label="Main navigation">{([['overview','Overview'],['workspace','Patient workspace'],['evidence','Evidence'],['future','Future lab']] as const).map(([id,label]) => <a key={id} href={`#${id}`} aria-current={site.destination === id ? 'page' : undefined}>{label}</a>)}</nav>
        <ThemeToggle />
        <div className="topbar-right"><span className="prototype-tag">SYNTHETIC RESEARCH PROTOTYPE</span><span className={`connection-dot ${connectionError ? 'connection-offline' : ''}`}><i /> {connectionError ? 'API disconnected' : loading ? 'Connecting to API' : 'API connected'}</span></div>
      </header>

      <div id="main-content" tabIndex={-1} />
      {site.destination !== 'overview' && <section className="safety-banner" role="note">
        <strong>Research use only</strong><span>Synthetic patient and CGM data. Uncalibrated model score. No diagnosis, dosing, or emergency use.</span>
      </section>}

      {connectionError && site.destination === 'workspace' && <div className="connection-warning" role="alert">Connection lost. Displaying the last loaded patient record; changes are disabled until the API reconnects. Your review draft is preserved. <button className="button button-secondary" onClick={() => void load()}>Retry connection</button></div>}

      <div data-destination="overview" hidden={site.destination !== 'overview'}>{site.destination === 'overview' && <LandingExperience />}<Overview /></div>
      <div data-destination="evidence" hidden={site.destination !== 'evidence'}><Evidence /></div>
      <div id="workspace" data-destination="workspace" hidden={site.destination !== 'workspace'}>
        {loading ? <div className="destination-loading" role="status">Loading the synthetic patient…<div className="skeleton panel-skeleton" /></div> : !data || !prediction ? <section className="error-panel" role="alert"><h1 tabIndex={-1}>Patient data is unavailable</h1><p>{connectionError}</p><button className="button button-primary" onClick={() => void load()}>Retry connection</button></section> : <>
      <section id="patient-record" className="page-heading">
        <div><p className="eyebrow">01 / Patient &amp; meal</p><h1 tabIndex={-1}>Patient workspace</h1><p className="subheading">{patientId} · {data.patient.ageYears} years · {capitalize(data.patient.sex)} · HbA1c {data.patient.hba1cPercent.toFixed(1)}%</p></div>
        <div className="heading-actions"><div className="patient-switcher"><label htmlFor="patient-select">Synthetic scenario</label><select id="patient-select" value={patientId} onChange={(event) => selectPatient(event.target.value)}><option value="DEMO-001">Patient 001 · lower-score case</option><option value="DEMO-002">Patient 002 · high-score case</option></select></div></div>
      </section>

      <nav className="workspace-nav workflow-path" aria-label="Dashboard sections"><a href="#patient-record"><span aria-hidden="true">01</span>Patient &amp; meal</a><a href="#phase-one-flow"><span aria-hidden="true">02</span>Glucose history</a><a href="#score-step"><span aria-hidden="true">03</span>Score &amp; factors</a><a href="#workflow-section"><span aria-hidden="true">04</span>Follow-up</a><a href="#review-section"><span aria-hidden="true">05</span>Review</a></nav>
      <details className="panel context-panel"><summary>Full synthetic patient record</summary>
        <div className="panel-heading"><div><p className="eyebrow">STATIC SYNTHETIC RECORD</p><h2>Patient context</h2></div><span className="record-tag">Fictional demo profile</span></div>
        <div className="context-grid">
          <Metric label="Age" value={`${data.patient.ageYears} years`} />
          <Metric label="Sex" value={capitalize(data.patient.sex)} />
          <Metric label="Type 2 diabetes" value={`${data.patient.diabetesDurationYears} years`} />
          <Metric label="HbA1c" value={`${data.patient.hba1cPercent.toFixed(1)}%`} />
          <Metric label="BMI" value={`${data.patient.bmiKgM2.toFixed(1)} kg/m²`} />
          <Metric label="Fasting glucose" value={`${data.patient.fastingPlasmaGlucoseMgDl.toFixed(0)} mg/dL`} />
          <Metric label="Recorded medication" value={data.patient.medications.join(", ")} />
          <Metric label="Meal context" value={data.currentMeal.description} wide />
        </div>
      </details>

      <MealSimulator key={`meal-form-${patientId}-${data.currentMeal.baselineAt}`} data={data} api={`${API}/api`} ready={enoughHistory} active={site.destination==='workspace'} />
      <div className="workspace-analysis-grid"><section id="phase-one-flow" className="panel workspace-history-panel"><header className="workspace-block-heading"><p className="section-label">02 / Glucose history</p><h2>Glucose history</h2></header><PhaseOneFlow key={patientId} api={`${API}/api`} patientId={patientId} revision={`${data.journal?.predictionId || ''}-${data.journal?.outcome.receivedSamples || 0}-${data.journal?.reviewState || ''}`} connected={!connectionError} onReadiness={setReadiness} onScore={() => void scoreCurrentMeal()} scoring={refreshing} linkToScore compact simplified />{workspaceVisited && <TwinExperience key={data.patient.patientId + (data.currentMeal.baselineAt || '')} data={data} api={`${API}/api`} fixedPhase="recorded" active={site.destination === 'workspace'} workspaceCompact />}</section>
      <section id="score-step" className="score-step"><div className="step-heading"><p className="section-label">03 / Score &amp; factors</p><h2>Score and factors</h2></div>
      <div className="workspace-score-grid"><div className="workspace-score-decision"><section className="summary-grid score-summary-grid" aria-label="Current patient and prediction summary">
        <article className="summary-card score-card">
          <div className="score-card-head"><p className="card-label">ORIGINAL RECORDED MEAL SCORE</p><span className={`status-pill status-${prediction.status}`}>{statusLabel(prediction.status)}</span></div>
          <div className="score-reading">{score === null ? "—" : score.toFixed(3)}</div>
          {score !== null && <div className="score-signal" aria-label={`Uncalibrated model score ${score.toFixed(3)} on a zero-to-one scale; research threshold 0.50`}><div className="score-track"><span style={{ transform: `scaleX(${Math.max(0, Math.min(1, score))})` }} /></div><small>0.50 threshold</small></div>}
          <p className="workspace-event-target">Event: ≥180 mg/dL or a rise ≥40 mg/dL from meal-time baseline.</p><p className="card-foot">Uncalibrated score · next {prediction.horizon_minutes || 120} minutes</p><p className="score-uncertainty">Uncertainty interval: not estimated. <a href="#evidence">Review model evidence</a></p>
          {data.journal?.inputChanged && <p className="score-saved-note">Saved result: current inputs differ. Resolve history issues and request a new score.</p>}
        </article>

      </section>

      <section className="score-action-panel" aria-label="Score and save this meal"><div>
          <p className="workspace-readiness" role="status">{connectionError ? 'API disconnected · changes paused' : readiness ? `${readiness.receivedExpectedSamples}/${readiness.expectedSamples} input samples · ${readiness.historyReady ? 'History ready' : 'History needs attention'} · ${readiness.model.status === 'ready' ? 'Model ready' : 'Model unavailable'}` : 'Checking history and model readiness…'}</p>
          <button className="button button-primary score-button" onClick={() => void scoreCurrentMeal()} disabled={refreshing || !enoughHistory} aria-describedby="score-help">{refreshing && <span className="scoring-indicator" aria-hidden="true" />}{refreshing ? "Scoring…" : score !== null ? "Score & save new attempt" : "Score & save meal"}</button>
          <p id="score-help" className="button-help">{!readiness ? 'Waiting for the backend readiness check.' : !enoughHistory ? "Requires all nine correctly timed readings and a connected API. See History readiness above for details." : "Creates a saved attempt for the original recorded meal. Use the meal form above for custom what-if scores."}</p>
          {notice && <p className="sr-live" role="status" aria-live="polite">{notice}</p>}
          {actionError && <p className="action-error" role="alert">{actionError}</p>}
      </div></section></div>
      <section className="content-grid">
        <article id="prediction-section" className="panel prediction-panel">
          <div className="panel-heading"><div><p className="eyebrow">MODEL OUTPUT</p><h2>Leading factors</h2></div></div><details className="workspace-model-details"><summary>Model details</summary><span className="model-version">{modelStatusText(prediction)}</span></details>
          {score !== null ? <>
            <p className="explanation-note">Model associations ordered by contribution; these are not causal effects.</p>
            {prediction.top_factors?.length ? <ul className="factor-list">{prediction.top_factors.map((factor, index) => <li key={`${factor.feature}-${index}`}><span className={`factor-direction ${factor.direction}`} aria-hidden="true">{factor.direction === "up" ? "+" : "−"}</span><span className="factor-name" title={humanize(factor.feature)}>{humanize(factor.feature)}</span><span className="factor-effect">{factor.direction === "up" ? "Raises" : "Lowers"} score</span><div className="factor-bar" aria-hidden="true"><span className={factor.direction} style={{width:`${Math.min(100,Math.abs(factor.contribution)/Math.max(...prediction.top_factors.map(item=>Math.abs(item.contribution)),.0001)*100)}%`}} /></div></li>)}</ul> : <div className="empty-inline">No factor contributions were returned.</div>}
            <div className="threshold-note">{prediction.predicted_event ? "Above" : "Below"} the model’s 0.50 research threshold. This is not a treatment recommendation.</div>
          </> : <div className={`prediction-state state-${prediction.status}`} aria-live="polite">
            <strong>{prediction.status === "unavailable" ? "Score unavailable" : prediction.status === "insufficient_data" ? "More history needed" : "No score requested"}</strong>
            <p>{prediction.status === "unavailable" ? "The model service did not return a score. No estimate has been substituted." : prediction.status === "insufficient_data" ? "The model needs the full two-hour CGM history before it can score this meal." : "Request a model score after the synthetic CGM replay has arrived."}</p>
          </div>}
        </article>
      </section></div>

      </section></div>
      <WorkspaceScenarios key={`scenarios-${patientId}`} data={data} api={`${API}/api`} active={site.destination==='workspace'} />
      <div id="workflow-section"><ResearchWorkflow key={data.patient.patientId} api={`${API}/api`} patientId={data.patient.patientId} refreshKey={data.journal?.predictionId || ''} newAttemptRevision={newAttemptRevision} onSelect={selectPatient} onSaved={load} connected={!connectionError} currentData={data} /></div>


      </>}
      </div>
      <div id="future" data-destination="future" hidden={site.destination !== 'future'}>
        <header className="destination-heading"><p className="section-label">Future lab · simulated</p><h1 tabIndex={-1}>Explore a possible future interface</h1><p>Scripted glucose stories demonstrate interaction ideas. These curves are fictional and do not predict the effect of a meal or treatment.</p></header>
        {futureVisited && data ? <TwinExperience key={patientId} data={data} api={`${API}/api`} fixedPhase="vision" active={site.destination === 'future'} /> : <div className="error-panel"><p>{loading ? 'Loading a synthetic meal baseline…' : 'A patient record is needed to start the scenarios.'}</p>{!loading && <button className="button button-secondary" onClick={() => void load()}>Retry patient connection</button>}</div>}
        <ValidationRoadmap />
      </div>
      <footer className="page-footer"><span>GlucoTwin · Working research prototype</span><span>Model score is uncalibrated. No diagnosis, dosing, or emergency use.</span></footer>
    </MotionDashboard>
  );
}

function Metric({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={`metric${wide ? " metric-wide" : ""}`}><span>{label}</span><strong>{value}</strong></div>;
}
function statusLabel(status: string) {
  if (status === "available") return "Available";
  if (status === "unavailable") return "Unavailable";
  if (status === "insufficient_data") return "Needs history";
  return "Pending";
}
function modelStatusText(prediction: Prediction) {
  if (prediction.model_version) return prediction.model_version;
  if (prediction.status === "unavailable") return "ML service unavailable";
  if (prediction.status === "insufficient_data") return "Incomplete CGM history";
  return "No score requested";
}
function humanize(name: string) {
  const labels: Record<string,string> = { glucose_change_prev_15_min_mg_dl: 'Glucose change over 15 minutes', glucose_change_prev_30_min_mg_dl: 'Glucose change over 30 minutes', glucose_change_prev_120_min_mg_dl: 'Glucose change over two hours', minutes_since_previous_meal: 'Time since the previous meal', has_recorded_non_insulin_medication_at_meal: 'Recorded non-insulin medication at the meal' };
  if (labels[name]) return labels[name];
  return name.replace(/^missingindicator_/, "Missing: ").replaceAll("_", " ").replace(/\bmg dl\b/g, "mg/dL").replace(/\bcsii\b/gi, "CSII").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function capitalize(text: string) { return text.charAt(0).toUpperCase() + text.slice(1); }

export default App;
