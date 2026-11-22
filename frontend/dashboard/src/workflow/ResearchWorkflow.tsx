import { useCallback, useEffect, useRef, useState } from 'react';
import ResearchExport from '../reports/ResearchExport';
import type { JournalRecord, DashboardData } from '../types';
import './workflow.css';

type Props = { api: string; patientId: string; refreshKey: string; newAttemptRevision?: number; onSaved: () => Promise<void>; connected?: boolean; currentData?: DashboardData };
export const time = (value: string | null) => value ? new Date(value).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC') : 'Not recorded';
export const outcomeLabel = (status: string) => ({ awaiting_outcome: 'Awaiting follow-up', partial_follow_up: 'Partial follow-up', insufficient_follow_up: 'Incomplete follow-up', event_observed: 'Event observed in samples', no_event_observed_complete: 'No event observed in complete samples' }[status] || status);
export const scoreText = (row: JournalRecord) => row.prediction.status === 'available' && row.prediction.model_score !== null ? row.prediction.model_score.toFixed(3) : row.prediction.status.replaceAll('_', ' ');

export default function ResearchWorkflow({ api, patientId, refreshKey, newAttemptRevision = 0, onSaved, connected = true, currentData }: Props) {
  const [records, setRecords] = useState<JournalRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // An explicit score request opens its new result; background polling preserves selection.
  useEffect(() => { setSelectedId(null); }, [newAttemptRevision]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const serial = useRef(0);
  const load = useCallback(async () => {
    const request = ++serial.current;
    try {
      const response = await fetch(`${api}/patients/${patientId}/journal`, { cache: 'no-store', signal: AbortSignal.timeout(6500) });
      if (!response.ok) throw new Error('Workflow unavailable');
      const journal: JournalRecord[] = await response.json();
      if (request !== serial.current) return;
      setRecords(journal);
      setSelectedId(current => current && journal.some(row => row.predictionId === current) ? current : journal[0]?.predictionId || null);
      setState('ready');
    } catch { if (request === serial.current) setState('error'); }
  }, [api, patientId]);
  useEffect(() => { let stopped = false; let timer: number; const poll = async () => { await load(); if (!stopped) timer = window.setTimeout(() => void poll(), 5000); }; void poll(); return () => { stopped = true; ++serial.current; window.clearTimeout(timer); }; }, [load, refreshKey]);
  const active = records.find(row => row.predictionId === selectedId) || records[0];
  const activeId = active?.predictionId;
  useEffect(() => { setNote(''); }, [activeId]);

  async function action(name: string, path: string, body?: object) {
    if (busy || !connected || state !== 'ready') return;
    setBusy(name); setMessage('');
    try {
      const response = await fetch(`${api}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('The action was not saved. Retry after checking the API.');
      if (name === 'save') setSelectedId(null);
      await onSaved(); await load();
      setMessage(name === 'save' ? 'Scoring attempt saved, including any unavailable status.' : name === 'review' ? 'Review note saved to this result’s history.' : 'Fictional follow-up replayed. No new prediction was calculated.');
      if (name === 'review') setNote('');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Action failed. Retry.'); }
    finally { setBusy(''); }
  }
  const disabled = busy !== '' || !connected;
  return <section className="research-workflow" aria-labelledby="workflow-title">
    <div className="workflow-heading"><div><p className="section-label">04 / Follow-up</p><h2 id="workflow-title">Follow-up</h2><p>Later observations for the selected saved attempt.</p></div><span className="workflow-clock">SYNTHETIC REPLAY CLOCK</span></div>
    {state === 'loading' && <p role="status">Loading saved research records…</p>}
    {state === 'error' && <div className="workflow-error" role="alert"><strong>Saved records could not be loaded.</strong><p>Displayed rows may be out of date. Retry before taking a review action.</p><button className="button button-secondary" onClick={() => void load()}>Retry saved records</button></div>}
    <div className="journal-heading"><div><p className="eyebrow">SELECTED PATIENT · {patientId}</p><h3>Saved meal result</h3></div></div>
    <p className="workflow-note">Saved attempts retain their original inputs. Review notes are local demo records.</p>
    {records.length === 0 && state === 'ready' && <div className="journal-empty"><strong>No scoring attempts saved for this meal.</strong><p>Use Score & save meal in the workspace to freeze the baseline before replaying follow-up. Unavailable model results can also be recorded.</p></div>}
    {active && <div className="journal-layout"><details className="workspace-disclosure saved-attempts"><summary>Saved attempts ({records.length})</summary><aside className="journal-versions" aria-label="Saved prediction versions">{records.map((row, index) => <button key={row.predictionId} aria-pressed={active.predictionId === row.predictionId} onClick={() => setSelectedId(row.predictionId)}><strong>{index === 0 ? 'Latest attempt' : `Earlier attempt ${records.length - index}`}</strong><span>{scoreText(row)} · {time(row.computedAt)}</span><small>{row.superseded ? 'Superseded; original record retained' : 'Current saved version'}</small></button>)}</aside></details>
      <article className="journal-detail" aria-label="Saved result details">
        <div className="journal-detail-heading"><div><h4>{active.superseded ? 'Historical saved result' : 'Current saved result'}</h4></div></div>
        <details className="workspace-disclosure journal-technical"><summary>Technical details</summary><p className="record-id">Result {active.predictionId}</p><dl className="journal-metadata"><div><dt>Meal baseline</dt><dd>{time(active.baselineAt)}</dd></div><div><dt>Observation window ends</dt><dd>{time(active.horizonEnd)}</dd></div><div><dt>Result computed (wall clock)</dt><dd>{time(active.computedAt)}</dd></div><div><dt>Model / input fingerprint</dt><dd>{active.prediction.model_version || 'Model unavailable'} / {active.inputHash.slice(0, 12)}</dd></div></dl></details>
        {!active.prospective && <p className="workflow-caution">Retrospective record: follow-up was already present when this result was issued. Prediction agreement is not assessed.</p>}
        {active.inputChanged && <p className="workflow-caution">The current input history differs from this frozen record. The saved inputs are preserved; outcome agreement is withheld.</p>}
        {active.qualityIssues.length > 0 && <p className="workflow-caution">Saved history issues: {active.qualityIssues.join(', ')}</p>}
        <div className="outcome-summary" aria-live="polite"><strong>{outcomeLabel(active.outcome.status)}</strong><p>{active.outcome.receivedSamples} of {active.outcome.expectedSamples} expected sample times · {active.outcome.conflictingTimestamps} conflicting timestamps</p><p>Observed maximum: {active.outcome.observedMaxMgDl === null ? 'Not available' : `${active.outcome.observedMaxMgDl.toFixed(0)} mg/dL`} · Observed rise: {active.outcome.observedRiseMgDl === null ? 'Not available' : `${active.outcome.observedRiseMgDl.toFixed(0)} mg/dL`}</p></div><details className="workspace-disclosure outcome-details"><summary>Observed readings and comparison</summary><p>Reached 180: {active.outcome.reaches180 === null ? 'Unknown' : active.outcome.reaches180 ? 'Observed' : 'Not observed in complete samples'} · Rose by 40: {active.outcome.rises40 === null ? 'Unknown' : active.outcome.rises40 ? 'Observed' : 'Not observed in complete samples'}</p><p>Prediction agreement: {active.outcome.predictionMatched === null ? 'Not assessed' : active.outcome.predictionMatched ? 'Matches observed sample outcome' : 'Does not match observed sample outcome'}</p>
        {active.outcome.readings.length > 0 && <div className="followup-readings" aria-label="Observed follow-up readings">{active.outcome.readings.map(row => <span key={row.eventId}>{Math.round((Date.parse(row.observedAt) - Date.parse(active.baselineAt)) / 60000)} min<strong>{row.glucoseMgDl.toFixed(0)} mg/dL</strong></span>)}</div>}
        <p className="workflow-note">{active.outcome.note}</p></details>
        <details className="workspace-disclosure demo-controls"><summary>Demo controls</summary><fieldset className="replay-controls" disabled={disabled || state !== 'ready'}><legend>Synthetic follow-up demonstration</legend><p>Appends fictional observations to this patient’s meal. Repeating a stage does not duplicate readings.</p><div>{(['partial', 'gap', 'complete'] as const).map(stage => <button className="button button-secondary" key={stage} onClick={() => void action('replay', `/demo/patients/${patientId}/follow-up`, { stage })}>{stage === 'partial' ? 'Replay first 45 minutes' : stage === 'gap' ? 'Replay with a missing sample' : 'Complete follow-up replay'}</button>)}</div></fieldset></details>
        <section id="review-section" className="workspace-review" aria-labelledby="review-title"><header className="workspace-review-heading"><div><p className="section-label">05 / Review</p><h2 id="review-title">Review and export</h2><p className="review-status">{active.reviewState === 'reviewed' ? 'Reviewed (local demo)' : 'Awaiting review'}</p></div><ResearchExport label="Download saved result" data={{ ...active.snapshot, prediction: active.prediction, journal: active }} /></header><form className="review-form" onSubmit={event => { event.preventDefault(); void action('review', `/journal/${active.predictionId}/reviews`, { action: 'reviewed', note }); }}><label htmlFor="review-note">Local demo review note</label><textarea id="review-note" maxLength={1000} value={note} onChange={event => setNote(event.target.value)} placeholder="Record what you reviewed; do not enter real patient details." aria-describedby="review-note-help" /><p id="review-note-help">{note.length}/1000 characters. A note is required to mark reviewed or reopen.</p><div><button className="button button-primary" disabled={disabled || state !== 'ready' || !note.trim()}>Mark reviewed</button><button type="button" className="button button-secondary" disabled={disabled || state !== 'ready' || !note.trim()} onClick={() => void action('review', `/journal/${active.predictionId}/reviews`, { action: 'reopened', note })}>Reopen review</button></div></form>
        {active.reviews.length > 0 && <details className="workspace-disclosure review-history-disclosure"><summary>Review history ({active.reviews.length})</summary><ol className="review-history" aria-label="Review history">{active.reviews.map((review, index) => <li key={`${review.recordedAt}-${index}`}><strong>{review.action === 'reviewed' ? 'Marked reviewed' : 'Reopened'} · {time(review.recordedAt)}</strong><p>{review.note}</p></li>)}</ol></details>}
        </section>
      </article></div>}
    {!active && <section id="review-section" className="workspace-review" aria-labelledby="review-title"><p className="section-label">05 / Review</p><h2 id="review-title">Review and export</h2><p>Save a scoring attempt to add a review note.</p>{currentData && <ResearchExport data={currentData}/>}</section>}
    <p className="workflow-action-status" role="status">{busy ? 'Saving workflow action…' : message}</p>
  </section>;
}
