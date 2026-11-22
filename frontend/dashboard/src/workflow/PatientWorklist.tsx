import { useEffect, useState } from 'react';
import type { JournalRecord } from '../types';
import { outcomeLabel, scoreText, time } from './ResearchWorkflow';

type Props = { api: string; patientId: string; revision: number; onSelect: (id: string) => void };
type Filter = 'all' | 'flagged' | 'awaiting';
const currentScore = (row: JournalRecord) => row.prediction.status === 'available' && !row.inputChanged && !row.qualityIssues.length ? row.prediction.model_score : null;

export default function PatientWorklist({ api, patientId, revision, onSelect }: Props) {
  const [rows, setRows] = useState<JournalRecord[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const stop = new AbortController();
    let timer: number;
    async function poll() {
      try {
        const response = await fetch(`${api}/worklist`, { cache: 'no-store', signal: AbortSignal.any([stop.signal, AbortSignal.timeout(6500)]) });
        if (!response.ok) throw new Error('Worklist unavailable');
        const worklist: JournalRecord[] = await response.json();
        if (stop.signal.aborted) return;
        setRows(worklist);
        setState('ready');
      } catch {
        if (!stop.signal.aborted) setState('error');
      } finally {
        if (!stop.signal.aborted) timer = window.setTimeout(poll, 5000);
      }
    }
    void poll();
    return () => { stop.abort(); window.clearTimeout(timer); };
  }, [api, revision, retry]);

  const query = search.trim().toLowerCase();
  const visible = rows.filter(row =>
    `${row.patientId} ${row.displayName}`.toLowerCase().includes(query)
    && (filter !== 'flagged' || (currentScore(row) !== null && row.prediction.predicted_event))
    && (filter !== 'awaiting' || row.reviewState !== 'reviewed')
  ).sort((a, b) => (currentScore(b) ?? -1) - (currentScore(a) ?? -1) || a.patientId.localeCompare(b.patientId));

  return <section className="panel patient-worklist" aria-labelledby="worklist-heading">
    <div className="panel-heading"><div><h2 id="worklist-heading">Patient worklist</h2><p className="subheading">Synthetic cases for research review.</p></div></div>
    <div className="worklist-filters">
      <label>Search patients<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Patient ID or name" /></label>
      <label>Filter patients<select value={filter} onChange={event => setFilter(event.target.value as Filter)}><option value="all">All patients</option><option value="flagged">Research threshold flag</option><option value="awaiting">Awaiting review</option></select></label>
    </div>
    {state === 'loading' && <p role="status">Loading patient worklist…</p>}
    {state === 'error' && <p role="alert">Worklist unavailable. Any shown rows are from the last successful load. <button className="button button-secondary" onClick={() => setRetry(value => value + 1)}>Retry worklist</button></p>}
    {state === 'ready' && !visible.length && <p role="status">{rows.length ? 'No patients match these filters.' : 'No synthetic patients available.'}</p>}
    {visible.length > 0 && <><div className="worklist-scroll" tabIndex={0} role="region" aria-label="Patient worklist table; scroll horizontally for all columns"><table className="worklist-table"><caption>Saved research scores, highest first when inputs are current. Scroll horizontally for all columns.</caption><thead><tr><th>Patient / meal baseline</th><th>Recorded baseline</th><th>Model output</th><th>Follow-up</th><th>Review</th></tr></thead><tbody>{visible.map(row => <tr key={row.patientId} className={row.patientId === patientId ? 'worklist-current' : ''}><td><button className="patient-row-button" onClick={() => onSelect(row.patientId)} aria-current={row.patientId === patientId ? 'true' : undefined}>{row.patientId}</button><small>{time(row.baselineAt)}</small></td><td><strong>{row.baselineGlucoseMgDl === null ? 'Not recorded' : `${row.baselineGlucoseMgDl.toFixed(0)} mg/dL`}</strong>{row.baselineAlreadyHigh && <span className="workflow-tag observation">Already ≥180 at baseline</span>}</td><td><strong>{scoreText(row)}</strong>{row.prediction.status === 'available' && <small>{row.prediction.predicted_event ? 'Research threshold flag' : 'Below research threshold; not a safety clearance'}</small>}{row.qualityIssues.length > 0 && <small>History requires attention</small>}{row.inputChanged && <span className="workflow-tag observation">Saved inputs differ from current data</span>}<small>{row.computedAt ? `Computed ${time(row.computedAt)}` : 'No attempt saved'}</small></td><td>{outcomeLabel(row.outcome.status)}<small>{row.outcome.receivedSamples}/8 expected sample times</small></td><td>{row.reviewState === 'reviewed' ? 'Reviewed (local demo)' : 'Awaiting review'}</td></tr>)}</tbody></table></div></>}
  </section>;
}
