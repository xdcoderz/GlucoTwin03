import { useState } from 'react';
import type { DashboardData } from '../types';
import { ORGANS, type OrganId } from './organs';
import type { TwinPoint } from './twinSignals';

type Props = {
  data: DashboardData;
  point?: TwinPoint;
  unavailable: boolean;
  delta: number | null;
  onBaseline: () => void;
  onFollowup: () => void;
  hasBaseline: boolean;
  hasFollowup: boolean;
};

function timestamp(value?: string | null) {
  const time = Date.parse(value || '');
  return Number.isFinite(time) ? new Date(time).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : 'Not recorded';
}

/** A selected observation is independent of the frozen meal score and outcome. */
export default function PatientCockpit({ data, point, unavailable, delta, onBaseline, onFollowup, hasBaseline, hasFollowup }: Props) {
  const [organ, setOrgan] = useState<OrganId>('pancreas');
  const journal = data.journal;
  const result = journal?.predictionId ? journal.prediction : data.prediction;
  const score = result.status === 'available' && Number.isFinite(result.model_score) ? result.model_score : null;
  const resultLabel = result.status === 'pending' ? 'Not scored yet' : result.status === 'insufficient_data' ? 'More history needed' : 'Score unavailable';
  const resultHelp = result.status === 'pending' ? 'Check the inputs, then score and save the recorded meal below.' : result.status === 'insufficient_data' ? 'The full correctly timed pre-meal history is required.' : 'No estimate has been substituted.';
  const selected = unavailable ? undefined : point;
  const stage = !selected ? 'Observation unavailable' : selected.minutes < 0 ? 'Before the meal' : selected.minutes === 0 ? 'At the meal' : 'Observed follow-up';
  const outcome = journal?.outcome;

  return <section className="patient-cockpit" aria-label="Connected patient cockpit" data-patient={data.patient.patientId}>
    <header className="cockpit-heading"><div><p className="eyebrow">YOUR VIRTUAL PATIENT · SYNTHETIC CASE</p><h2>One patient. A connected story.</h2><p>Inspect an observation, keep the meal-time score fixed, then review what followed.</p></div><span className="cockpit-case-id">{data.patient.patientId}</span></header>
    <div className="cockpit-grid">
      <aside className="cockpit-context" aria-label="Fixed patient background">
        <p className="cockpit-label">PATIENT BACKGROUND · FIXED</p>
        <h3>{data.patient.ageYears} years · {data.patient.sex}</h3>
        <dl><div><dt>HbA1c</dt><dd>{data.patient.hba1cPercent.toFixed(1)}<small>%</small></dd></div><div><dt>Type 2 diabetes</dt><dd>{data.patient.diabetesDurationYears}<small> years</small></dd></div></dl>
        <p className="cockpit-explain">HbA1c describes longer-term glucose context. It does not change when you replay readings.</p>
        <div className="cockpit-meal"><p className="cockpit-label">RECORDED MEAL</p><strong>{data.currentMeal.description}</strong><time>{timestamp(data.currentMeal.baselineAt)}</time></div>
      </aside>

      <div className="cockpit-person">
        <span className="cockpit-stage">{stage}</span>
        <svg className="cockpit-body" viewBox="0 0 300 350" role="img" aria-label={`Educational body highlighting ${ORGANS[organ].name}. Organ function is not measured.`}>
          <ellipse className="cockpit-orbit" cx="150" cy="320" rx="100" ry="19" />
          <ellipse className="cockpit-orbit" cx="150" cy="320" rx="72" ry="11" />
          <g className="cockpit-body-shadow" transform="translate(7 3)"><ellipse cx="150" cy="40" rx="23" ry="29" /><path d="M134 71L110 82L92 129L77 179L88 184L115 130L117 190L127 235L125 307L140 307L150 234L160 307L175 307L173 235L183 190L185 130L212 184L223 179L208 129L190 82L166 71Z" /></g>
          <g className="cockpit-body-shell"><ellipse cx="150" cy="40" rx="23" ry="29" /><path d="M134 71L110 82L92 129L77 179L88 184L115 130L117 190L127 235L125 307L140 307L150 234L160 307L175 307L173 235L183 190L185 130L212 184L223 179L208 129L190 82L166 71Z" /></g>
          <path className="cockpit-body-grid" d="M127 87Q150 101 173 87M121 108Q150 125 179 108M120 130Q150 144 180 130M123 175Q150 185 177 175M150 92V193" />
          <path className={`cockpit-organ ${organ === 'liver' ? 'is-selected' : ''}`} d="M123 127Q140 117 157 128L153 145Q136 149 121 136Z" />
          <ellipse className={`cockpit-organ ${organ === 'pancreas' ? 'is-selected' : ''}`} cx="155" cy="153" rx="21" ry="6" transform="rotate(-14 155 153)" />
          <path className={`cockpit-organ ${organ === 'gut' ? 'is-selected' : ''}`} d="M134 166Q169 160 170 174Q135 169 133 180Q169 175 166 188L134 189Z" />
          <path className="cockpit-body-grid" d="M95 212H55M205 212H245" />
        </svg>
        <div className="cockpit-organs" role="group" aria-label="Explain an organ">{(['pancreas', 'liver', 'gut'] as OrganId[]).map(id => <button key={id} type="button" aria-label={`Explain ${ORGANS[id].name}`} aria-pressed={organ === id} onClick={() => setOrgan(id)}>{ORGANS[id].name}</button>)}</div>
        <div className="cockpit-organ-note" aria-live="polite"><strong>{ORGANS[organ].role}</strong><p>{ORGANS[organ].notMeasured}</p></div>
        <p className="cockpit-explain">Educational anatomy · not a scan or organ-health measurement. <a href="#patient-twin">Explore in 3D</a></p>
      </div>

      <aside className="cockpit-observation" aria-label="Selected observation and frozen model result">
        <div className="workspace-sample cockpit-sample" aria-live="polite"><div><span>SELECTED GLUCOSE · OBSERVATION</span><strong data-testid="twin-glucose">{selected ? selected.glucose.toFixed(0) : '—'} <small>mg/dL</small></strong><time>{selected ? timestamp(selected.observedAt) : 'Waiting for a connected glucose stream'}</time></div><div><span>From meal</span><strong>{selected ? `${selected.minutes > 0 ? '+' : ''}${selected.minutes} min` : '—'}</strong></div><div><span>Change from previous</span><strong>{!selected || delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta} mg/dL`}</strong></div></div>
        <div className="cockpit-frozen" data-testid="cockpit-frozen-result"><p className="cockpit-label">{journal?.predictionId ? 'SAVED MEAL RESULT · FIXED' : 'MEAL RESULT · NO SAVED ATTEMPT'}</p><strong>{score === null ? resultLabel : score!.toFixed(3)}</strong><p>{score === null ? resultHelp : 'Uncalibrated research score, not a personal probability.'}</p><small>Next 120 minutes from the meal. Replaying observations does not recalculate this result.</small>{result.model_version && <p>Model: {result.model_version}</p>}{journal?.predictionId && <span className="cockpit-result-id">{journal.predictionId}</span>}{journal?.inputChanged && <p>Inputs changed since this saved result. Review before scoring again.</p>}</div>
      </aside>
    </div>
    <nav className="cockpit-journey" aria-label="Patient journey"><a href="#patient-record">Patient background</a><button type="button" disabled={!hasBaseline} onClick={onBaseline}>At the meal</button><button type="button" disabled={!hasFollowup} onClick={onFollowup}>Latest follow-up sample</button><a href="#review-section">Review saved result</a></nav>
    <p className="cockpit-followup" data-testid="cockpit-outcome">{!journal?.predictionId ? 'No saved attempt yet. Save a meal result before reviewing its follow-up outcome.' : !outcome?.complete ? `Follow-up incomplete · ${outcome?.receivedSamples ?? 0} of ${outcome?.expectedSamples ?? 8} expected samples. ${outcome?.eventObserved === true ? 'An event has already been observed; the full window is not yet complete.' : 'The outcome is not yet determined.'}` : outcome.eventObserved === true ? 'Complete follow-up · the defined event was observed.' : outcome.eventObserved === false ? 'Complete follow-up · no defined event was observed.' : 'Follow-up outcome unavailable; inspect the saved record.'}</p>
  </section>;
}
