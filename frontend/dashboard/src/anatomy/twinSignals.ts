import {sampleGlow, type BodyGlow} from './visualStates';
import type { Reading } from '../types';

export type TwinSignal = { glucose: number | null; color: string; label: string; playing: boolean; bodyGlow?: BodyGlow; contextOnly?: boolean };
export type TwinPoint = { minutes: number; glucose: number; observedAt: string };
export type ScenarioId = 'rise' | 'surge' | 'dip' | 'countdown' | 'artifact';

// Storyboard fixtures, NOT fitted forecasts or intervention response estimates.
export const SCENARIOS: Record<ScenarioId, { title: string; description: string; values: number[] }> = {
  rise: { title: 'A · Rise and settle', description: 'A fictional modest rise followed by a return toward baseline.', values: [0, 9, 18, 25, 29, 23, 14, 7, 2] },
  surge: { title: 'B · Larger excursion', description: 'A fictional larger rise to demonstrate the event overlay.', values: [0, 17, 36, 55, 67, 60, 48, 33, 20] },
  dip: { title: 'C · Dip and return', description: 'An invented dip to 65 mg/dL, then recovery. No low-glucose predictor is running.', values: [] },
  countdown: { title:'D · Falling trend demo', description:'Fictional decline of 15 mg/dL every 15 minutes, then recovery. A linear illustration, not a low-glucose forecast.', values:[] },
  artifact: { title:'E · Unusual reading demo', description:'A scripted jump and reversal to demonstrate an unvalidated pattern flag. It does not prove a sensor fault.', values:[0,3,5,110,6,4,1,3,0] },
};

export function mockTimeline(baseline: number | null, baselineAt: string | undefined, scenario: ScenarioId): TwinPoint[] {
  const start = Date.parse(baselineAt || '');
  if (baseline === null || !Number.isFinite(baseline) || !Number.isFinite(start)) return [];
  const values = scenario === 'dip'
    ? [baseline, baseline * .8 + 65 * .2, baseline * .5 + 65 * .5, 74, 65, 79, 95, 110, 120]
    : scenario === 'countdown' ? [baseline,baseline-15,baseline-30,baseline-45,baseline-60,Math.max(55,baseline-75),79,95,110].map(value=>Math.max(40,value))
    : SCENARIOS[scenario].values.map(delta => baseline + delta);
  return values.map((glucose, index) => ({ minutes: index * 15, glucose: Math.round(glucose), observedAt: new Date(start + index * 15 * 60000).toISOString() }));
}

export function recordedTimeline(readings: Reading[], baselineAt: string | undefined): { points: TwinPoint[]; issue: string } {
  const baseline = Date.parse(baselineAt || '');
  if (!Number.isFinite(baseline)) return { points: [], issue: 'A valid meal timestamp is needed to align the body and timeline.' };
  const byTime = new Map<number, number>();
  let invalid = false;
  for (const row of readings) {
    const time = Date.parse(row.observedAt);
    if (!Number.isFinite(time) || !Number.isFinite(row.glucoseMgDl) || row.glucoseMgDl <= 0) { invalid = true; continue; }
    if (time < baseline - 120 * 60000 || time > baseline + 120 * 60000) continue;
    if (byTime.has(time) && byTime.get(time) !== row.glucoseMgDl) return { points: [], issue: 'Conflicting glucose values share a timestamp. The visual replay is withheld until the data is corrected.' };
    byTime.set(time, row.glucoseMgDl);
  }
  if (invalid) return { points: [], issue: 'Invalid glucose or timestamps were returned. The visual replay is withheld until the data is corrected.' };
  return { points: [...byTime].sort(([a], [b]) => a - b).map(([time, glucose]) => ({ minutes: (time - baseline) / 60000, glucose, observedAt: new Date(time).toISOString() })), issue: '' };
}

// Display bands only. They are not patient risk categories or organ health scores.
export function glucoseSignal(glucose: number | null, playing: boolean, rate: number | null = null): TwinSignal {
  const bodyGlow=sampleGlow(glucose,rate);
  return {bodyGlow,glucose,playing:playing && bodyGlow.tone!=='unavailable',color:bodyGlow.tone==='unavailable'?'#9bb3bd':bodyGlow.color,label:bodyGlow.label};
}

export function utcLabel(value: string | undefined) {
  return value ? new Date(value).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : 'No timestamp';
}
