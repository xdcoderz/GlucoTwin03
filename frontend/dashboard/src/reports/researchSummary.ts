import { jsPDF } from 'jspdf';
import type { DashboardData } from '../types';

// A report is a frozen API snapshot, not a new inference or clinical record.
export function createResearchSummary(data: DashboardData, capturedAt: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const { patient, currentMeal: meal, prediction } = data;
  const readings = [...data.cgmHistory].filter(row => Number.isFinite(row.glucoseMgDl) && Number.isFinite(Date.parse(row.observedAt))).sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
  const baseline = readings.at(-1);
  const score = prediction.status === 'available' && prediction.model_score !== null && Number.isFinite(prediction.model_score) && prediction.model_score >= 0 && prediction.model_score <= 1 ? prediction.model_score : null;
  const omitted = data.cgmHistory.length - readings.length;
  const ink = '#18343f', muted = '#526b76', teal = '#137d78';
  let y = 46;
  let substitutedCharacters = false;
  const ascii = (value: string) => value.replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/[–—−]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e\n]/g, () => { substitutedCharacters = true; return '?'; });
  const time = (value: string) => Number.isFinite(Date.parse(value)) ? new Date(value).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC') : 'Not available';
  const number = (value: number | null | undefined, digits = 1) => typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : 'Not available';
  function header() {
    doc.setFillColor(ink); doc.rect(0, 0, 210, 34, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor('#a7d9d6'); doc.text('GLUCOTWIN  /  RESEARCH SNAPSHOT', 18, 13);
    doc.setFontSize(21); doc.setTextColor('#ffffff'); doc.text('Post-meal event summary', 18, 25);
    y = 46;
  }
  function page() { doc.addPage(); header(); }
  function ensure(height: number) { if (y + height > 276) page(); }
  function paragraph(value: string, size = 9.5, color = ink) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(color);
    const lines = doc.splitTextToSize(ascii(value), 174) as string[];
    for (const line of lines) {
      ensure(5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(color);
      doc.text(line, 18, y); y += 4.8;
    }
    y += 2;
  }
  function section(title: string, reserve = 18) {
    ensure(reserve); y += 3;
    doc.setDrawColor('#d8e5e8'); doc.setLineWidth(.3); doc.line(18, y - 2, 192, y - 2);
    doc.setTextColor(teal); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(title, 18, y + 4); y += 11;
  }
  header();
  paragraph('SYNTHETIC RESEARCH PROTOTYPE. Uncalibrated score. Not clinically validated. No diagnosis, dosing, or emergency use.', 9.5, '#885719');
  paragraph(`Patient: ${patient.patientId} | ${patient.displayName}\nSnapshot captured: ${time(capturedAt)}`, 9, muted);
  const journal = data.journal?.predictionId ? data.journal : null;
  if (journal) paragraph(`Saved result: ${journal.predictionId}\nMeal baseline: ${time(journal.baselineAt)} | Computed: ${time(journal.computedAt || '')}\nReplay clock: ${journal.clockMode} | ${journal.superseded ? 'Historical superseded version' : 'Current saved version'}`, 8, muted);
  section('01  /  Patient and meal context');
  paragraph(`Age: ${number(patient.ageYears, 0)} years  |  Recorded sex: ${patient.sex}  |  BMI: ${number(patient.bmiKgM2)} kg/m2\nDiabetes duration: ${number(patient.diabetesDurationYears)} years  |  HbA1c: ${number(patient.hba1cPercent)}%\nFasting plasma glucose: ${number(patient.fastingPlasmaGlucoseMgDl)} mg/dL`);
  paragraph(`Recorded diagnoses: ${patient.diagnoses.join('; ') || 'None recorded'}\nRecorded medications: ${patient.medications.join('; ') || 'None recorded'}`);
  paragraph(`Meal: ${meal.description || 'Not recorded'}\nPrevious meal: ${number(meal.minutesSincePreviousMeal, 0)} minutes earlier. Non-insulin medication recorded: ${meal.hasRecordedNonInsulinMedication ? 'yes' : 'no'}.`);
  section('02  /  Returned model output');
  paragraph(`Status: ${prediction.status}${score === null && prediction.status === 'available' ? ' (invalid or missing score; withheld)' : ''}\nUncalibrated model score: ${score === null ? 'NOT AVAILABLE - no score substituted' : score.toFixed(3)}\nHorizon returned: ${number(prediction.horizon_minutes, 0)} minutes | Model version: ${prediction.model_version || 'Not returned'}`, 10);
  if (score !== null) {
    paragraph(`Research threshold returned: ${number(prediction.threshold, 2)} | Event flag returned: ${prediction.predicted_event === null ? 'Not returned' : prediction.predicted_event ? 'positive' : 'negative'}`, 9, muted);
  } else if (prediction.reason) {
    paragraph(`Service reason: ${prediction.reason}`, 9, muted);
  }
  paragraph('Defined target: glucose >=180 mg/dL OR a rise >=40 mg/dL from the meal-time baseline, at any point within the next 120 minutes. A score is not a calibrated event probability.', 9, muted);
  section('03  /  Observed glucose history', baseline ? 80 : 25);
  if (!baseline) {
    paragraph('No valid timestamped CGM readings were returned. No baseline or curve can be shown. Run the replay and export a new snapshot.', 10, muted);
  } else {
    ensure(66);
    const left = 32, right = 188, top = y + 3, height = 37;
    const values = readings.map(row => row.glucoseMgDl);
    const low = Math.floor((Math.min(...values) - 10) / 20) * 20;
    const high = Math.ceil((Math.max(...values) + 10) / 20) * 20;
    const first = Date.parse(readings[0].observedAt), last = Date.parse(baseline.observedAt);
    const px = (value: string) => last === first ? (left + right) / 2 : left + (Date.parse(value) - first) / (last - first) * (right - left);
    const py = (value: number) => top + height - (value - low) / (high - low) * height;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    [low, (low + high) / 2, high].forEach(value => {
      doc.setDrawColor('#dfe8eb'); doc.setLineWidth(.2); doc.line(left, py(value), right, py(value));
      doc.setTextColor(muted); doc.text(value.toFixed(0), left - 3, py(value) + 1, { align: 'right' });
    });
    doc.setTextColor(muted); doc.text('mg/dL', 18, top - 2);
    doc.setDrawColor(teal); doc.setFillColor(teal); doc.setLineWidth(.7);
    readings.forEach((row, index) => {
      if (index) doc.line(px(readings[index - 1].observedAt), py(readings[index - 1].glucoseMgDl), px(row.observedAt), py(row.glucoseMgDl));
      doc.circle(px(row.observedAt), py(row.glucoseMgDl), .8, 'F');
    });
    doc.setFontSize(8); doc.setTextColor(muted);
    doc.text(last === first ? 'Single timestamp' : `${Math.round((first - last) / 60000)} min`, left, top + height + 5);
    doc.text('Latest reading / baseline', right, top + height + 5, { align: 'right' });
    y = top + height + 13;
    paragraph(`${readings.length} valid readings. Baseline: ${number(baseline.glucoseMgDl)} mg/dL at ${time(baseline.observedAt)}. History only; no future glucose curve is predicted or displayed.`, 8.5, muted);
  }
  if (omitted) paragraph(`${omitted} invalid or non-finite reading(s) omitted from the chart and table.`, 9, '#885719');
  page();
  section('04  /  Leading model factors');
  if (score === null) paragraph('No factor contributions shown because there is no valid available score. Any stale factor fields are withheld.', 10, muted);
  else if (!prediction.top_factors?.length) paragraph('No factor contributions were returned for this score.', 10, muted);
  else {
    paragraph('Returned contributions are model associations, not causes or organ measurements. Values are model contribution units, not percentages.', 9, muted);
    prediction.top_factors.forEach((factor, index) => {
      paragraph(`${index + 1}. ${factor.feature}\nContribution returned: ${number(factor.contribution, 4)} | Direction returned: ${factor.direction}`, 9.5);
    });
  }
  section('05  /  Reading trace');
  paragraph(`Showing the latest ${Math.min(9, readings.length)} of ${readings.length} valid readings. Times are UTC; source labels are copied from the API.`, 8.5, muted);
  for (const row of readings.slice(-9)) {
    paragraph(`${time(row.observedAt)} | ${number(row.glucoseMgDl)} mg/dL | ${row.source || 'Source not recorded'}`, 8.5);
  }
  if (baseline) paragraph(`Latest event ID: ${baseline.eventId}`, 8, muted);
  if (journal) {
    section('06  /  Follow-up and local review journal');
    paragraph(`Meal ID: ${journal.mealId}\nInput SHA-256: ${journal.inputHash}\nWindow ends: ${time(journal.horizonEnd)}\nResult issued before follow-up was present: ${journal.prospective ? 'yes (synthetic replay)' : 'no - retrospective'}\nCurrent inputs changed since save: ${journal.inputChanged ? 'yes' : 'no'}`, 8.5, muted);
    const outcome = journal.outcome;
    paragraph(`Observed outcome: ${outcome.status.replaceAll('_', ' ')}\nCoverage: ${outcome.receivedSamples}/${outcome.expectedSamples} expected sample times; conflicts: ${outcome.conflictingTimestamps}\nObserved maximum: ${number(outcome.observedMaxMgDl)} mg/dL | Maximum change from original baseline: ${number(outcome.observedRiseMgDl)} mg/dL\nPrediction agreement: ${outcome.predictionMatched === null ? 'Not assessed' : outcome.predictionMatched ? 'Matches observed sample outcome' : 'Does not match observed sample outcome'}`, 9);
    paragraph(`Observed >=180 component: ${outcome.reaches180 === null ? 'Unknown' : outcome.reaches180 ? 'yes' : 'not observed in complete samples'}\nObserved >=40 rise component: ${outcome.rises40 === null ? 'Unknown' : outcome.rises40 ? 'yes' : 'not observed in complete samples'}`, 8.5, muted);
    paragraph(outcome.note, 8.5, muted);
    if (outcome.readings.length) section('Observed follow-up reading trace (UTC)', Math.min(220, 20 + outcome.readings.length * 6.8));
    for (const reading of outcome.readings) paragraph(`Follow-up ${time(reading.observedAt)} | ${number(reading.glucoseMgDl)} mg/dL | ${reading.source}`, 8, muted);
    paragraph(`Review state: ${journal.reviewState}. Notes are local demo entries without verified staff identity.`, 9);
    if (!journal.reviews.length) paragraph('No review notes recorded.', 8.5, muted);
    journal.reviews.forEach(review => paragraph(`${time(review.recordedAt)} | ${review.action}\n${review.note}`, 8.5));
  }
  section(journal ? '07  /  Interpretation and limits' : '06  /  Interpretation and limits');
  paragraph('This is a saved dashboard snapshot, not a clinical report. The public demo uses synthetic patient records and simulated CGM. No clinical accuracy or individual treatment benefit has been established.');
  paragraph(journal ? 'This report uses the immutable saved inputs and prediction identified above. Export time, result computation time and the synthetic meal/observation clock are separate. Follow-up is fictional workflow data, not model-generated or evidence of clinical effectiveness. Retrospective or changed-input records are not assessed for prospective agreement.' : 'This snapshot has no saved inference timestamp or baseline-to-score identifier. The capture time is the PDF export time; it does not prove that the returned score was computed at that time or from the latest displayed reading. Save a scoring attempt to create an auditable result.');
  paragraph('The 3D viewer uses generic approximate anatomy. It explains glucose-related structures and does not measure organ function, simulate physiology, or alter the model score.');
  paragraph('Project references: docs/CLINICAL_SCOPE.md, docs/MODEL_CARD.md, docs/API_CONTRACT.md and docs/ANATOMY_VIEW.md in the GlucoTwin project. These describe the target, evidence, interfaces and anatomy sources.', 8.5, muted);
  if (substitutedCharacters) paragraph('Text rendering note: this PDF uses a basic Latin font. Unsupported characters are shown as ?, and accented letters are transliterated. The original API snapshot remains the source of truth.', 8, muted);
  const total = doc.getNumberOfPages();
  for (let index = 1; index <= total; index++) {
    doc.setPage(index); doc.setDrawColor('#d8e5e8'); doc.line(18, 283, 192, 283);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(muted);
    doc.text('RESEARCH USE ONLY  /  SYNTHETIC DEMO  /  NOT CLINICALLY VALIDATED', 18, 289);
    doc.text(`${index} / ${total}`, 192, 289, { align: 'right' });
  }
  doc.setProperties({ title: `GlucoTwin research snapshot - ${ascii(patient.patientId)}`, subject: 'Synthetic research data; not for clinical use', author: 'GlucoTwin', creator: 'GlucoTwin browser export' });
  const patientSlug = patient.patientId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 70) || 'patient';
  return { blob: doc.output('blob'), filename: `GlucoTwin_${patientSlug}_${capturedAt.replace(/[:.]/g, '-')}.pdf` };
}
