import { useState, type CSSProperties, type ReactNode } from 'react';
import type { DashboardData } from '../types';
import { ORGAN_IDS, ORGANS, type OrganId } from './organs';
import PatientBodyDiagram from './PatientBodyDiagram';
import type { TwinPoint, TwinSignal } from './twinSignals';

type Props = {
  data: DashboardData;
  point?: TwinPoint;
  unavailable: boolean;
  delta: number | null;
  onBaseline: () => void;
  onFollowup: () => void;
  hasBaseline: boolean;
  hasFollowup: boolean;
  signal: TwinSignal;
  twinOpen: boolean;
  anatomy: ReactNode;
  timeline: ReactNode;
};

function timestamp(value?: string | null) {
  const time = Date.parse(value || '');
  return Number.isFinite(time) ? new Date(time).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : 'Not recorded';
}

/** A selected observation is independent of the frozen meal score and outcome. */
export default function PatientCockpit({ data, point, unavailable, delta, onBaseline, onFollowup, hasBaseline, hasFollowup, signal, twinOpen, anatomy, timeline }: Props) {
  const [organ, setOrgan] = useState<OrganId>('pancreas');
  const journal = data.journal;
  const result = journal?.predictionId ? journal.prediction : data.prediction;
  const score = result.status === 'available' && Number.isFinite(result.model_score) ? result.model_score : null;
  const resultLabel = result.status === 'pending' ? 'Not scored yet' : result.status === 'insufficient_data' ? 'More history needed' : 'Score unavailable';
  const resultHelp = result.status === 'pending' ? 'Check the inputs, then score and save the recorded meal below.' : result.status === 'insufficient_data' ? 'The full correctly timed pre-meal history is required.' : 'No estimate has been substituted.';
  const selected = unavailable ? undefined : point;
  const stage = !selected ? 'Observation unavailable' : selected.minutes < 0 ? 'Before the meal' : selected.minutes === 0 ? 'At the meal' : 'Observed follow-up';
  const outcome = journal?.outcome;

  return <section className="patient-cockpit" aria-label="Connected patient cockpit" data-patient={data.patient.patientId} style={{ '--cockpit-signal': signal.color } as CSSProperties}>
    <header className="cockpit-heading">
      <div><h2>Patient twin</h2><p>Move through the glucose timeline to see the same reading on the body.</p></div>
      <a className="cockpit-timeline-link" href="#glucose-timeline">Go to glucose timeline <span aria-hidden="true">↓</span></a>
    </header>
    <div className="cockpit-grid">
      <aside className="cockpit-observation" aria-label="Selected observation and frozen model result">
        <div className="workspace-sample cockpit-sample" aria-live="polite">
          <div className="cockpit-current">
            <span className="cockpit-label">SELECTED GLUCOSE</span>
            <strong data-testid="twin-glucose">{selected ? selected.glucose.toFixed(0) : '—'} <small>mg/dL</small></strong>
            <time dateTime={selected?.observedAt}>{selected ? timestamp(selected.observedAt) : 'Waiting for a connected glucose stream'}</time>
          </div>
          <div><span>From meal</span><strong>{selected ? `${selected.minutes > 0 ? '+' : ''}${selected.minutes} min` : '—'}</strong></div>
          <div><span>Change from previous</span><strong>{!selected || delta === null ? '—' : `${delta > 0 ? '+' : ''}${Number(delta.toFixed(1))} mg/dL`}</strong></div>
        </div>
        <div className="cockpit-frozen" data-testid="cockpit-frozen-result">
          <p className="cockpit-label">{journal?.predictionId ? 'SAVED MEAL RESULT · FIXED' : 'MEAL RESULT · NO SAVED ATTEMPT'}</p>
          <strong>{score === null ? resultLabel : score.toFixed(3)}</strong>
          <p>{score === null ? resultHelp : 'Uncalibrated research score on a 0–1 scale.'}</p>
          <small>Next 120 minutes from the meal. Replaying observations does not recalculate this result.</small>
          {result.model_version && <p>Model: {result.model_version}</p>}
          {journal?.predictionId && <span className="cockpit-result-id">{journal.predictionId}</span>}
          {journal?.inputChanged && <p>Inputs changed since this saved result. Review before scoring again.</p>}
        </div>
      </aside>

      <div className="cockpit-person">
        <div className="cockpit-visual-heading">
          <h3>Anatomy explorer</h3>
          <span className="cockpit-stage"><i aria-hidden="true" />{stage}</span>
        </div>
        {anatomy}
        <div className="cockpit-illustration" hidden={twinOpen}>
          <div className="cockpit-diagram" data-glucose={signal.glucose ?? 'none'}>
            <PatientBodyDiagram selected={organ} />
            <p className="cockpit-diagram-key"><span aria-hidden="true" />{selected ? 'Glow follows the selected glucose reading' : 'Glucose overlay unavailable'}</p>
          </div>
          <div className="cockpit-organ-guide">
            <p className="cockpit-label">ORGANS AND TISSUES</p>
            <div className="cockpit-organs" role="group" aria-label="Explain an organ">
              {ORGAN_IDS.map(id => <button key={id} type="button" aria-label={`Explain ${ORGANS[id].name}`} aria-pressed={organ === id} onClick={() => setOrgan(id)}>{ORGANS[id].name}</button>)}
            </div>
            <div className="cockpit-organ-note" aria-live="polite"><strong>{ORGANS[organ].role}</strong><p>{ORGANS[organ].description}</p><p>{ORGANS[organ].notMeasured}</p></div>
          </div>
        </div>
        {!twinOpen && <p className="cockpit-anatomy-caption">Anatomy and organ colors are illustrative.</p>}
      </div>

      <aside className="cockpit-context" aria-label="Fixed patient background">
        <p className="cockpit-label">PATIENT BACKGROUND · FIXED</p>
        <h3>{data.patient.ageYears} years · {data.patient.sex}</h3>
        <dl><div><dt>HbA1c</dt><dd>{data.patient.hba1cPercent.toFixed(1)}<small>%</small></dd></div><div><dt>Type 2 diabetes</dt><dd>{data.patient.diabetesDurationYears}<small> years</small></dd></div></dl>
        <div className="cockpit-meal"><p className="cockpit-label">RECORDED MEAL</p><strong>{data.currentMeal.description}</strong><time dateTime={data.currentMeal.baselineAt}>{timestamp(data.currentMeal.baselineAt)}</time></div>
      </aside>
    </div>
    <div id="glucose-timeline" className="cockpit-replay">
      {timeline}
      <div className="cockpit-journey" role="group" aria-label="Patient journey">
        <button type="button" disabled={!hasBaseline} onClick={onBaseline}>At the meal</button>
        <button type="button" disabled={!hasFollowup} onClick={onFollowup}>Latest follow-up sample</button>
        <a href={journal?.predictionId ? '#review-section' : '#score-step'}>{journal?.predictionId ? 'Review saved result' : 'Go to meal score'}</a>
      </div>
      <p className="cockpit-followup" data-testid="cockpit-outcome">{!journal?.predictionId ? 'No saved attempt yet. Save a meal result before reviewing its follow-up outcome.' : !outcome?.complete ? `Follow-up incomplete · ${outcome?.receivedSamples ?? 0} of ${outcome?.expectedSamples ?? 8} expected samples. ${outcome?.eventObserved === true ? 'An event has already been observed; the full window is not yet complete.' : 'The outcome is not yet determined.'}` : outcome.eventObserved === true ? 'Complete follow-up · the defined event was observed.' : outcome.eventObserved === false ? 'Complete follow-up · no defined event was observed.' : 'Follow-up outcome unavailable; inspect the saved record.'}</p>
    </div>
  </section>;
}
