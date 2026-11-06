import type { TwinPoint } from './twinSignals';

export const VISUAL_RULES = { rapidRate: 3, directionRate: .5, maxGap: 20, projectionHorizon: 120 } as const;
export type PatternFlag = { kind: 'none' | 'rapid' | 'reversal' | 'gap' | 'invalid'; title: string; detail: string; rate: number | null };

/** Display heuristic only. Uses the selected sample and its predecessors, never future points. */
export function inspectPattern(points: TwinPoint[], index: number): PatternFlag {
  const current = points[index], previous = points[index - 1];
  if (!current || !Number.isFinite(current.glucose) || !Number.isFinite(current.minutes) || current.glucose <= 0)
    return { kind:'invalid', title:'Sample unavailable', detail:'A valid selected sample is required.', rate:null };
  if (!previous) return { kind:'none', title:'More history needed', detail:'Two samples are needed to inspect a change.', rate:null };
  const gap = current.minutes - previous.minutes;
  if (!Number.isFinite(previous.glucose) || previous.glucose <= 0 || !Number.isFinite(gap) || gap <= 0)
    return { kind:'invalid', title:'Invalid sample order', detail:'The visual check requires distinct, increasing timestamps and finite glucose values.', rate:null };
  const rate = (current.glucose - previous.glucose) / gap;
  if (gap > VISUAL_RULES.maxGap) return { kind:'gap', title:'Reading gap', detail:`${gap} minutes between samples. The projection is withheld.`, rate };
  const earlier = points[index - 2];
  const oldGap = earlier ? previous.minutes - earlier.minutes : 0;
  const oldRate = earlier && oldGap > 0 && oldGap <= VISUAL_RULES.maxGap ? (previous.glucose - earlier.glucose) / oldGap : null;
  if (oldRate !== null && Math.abs(oldRate) >= VISUAL_RULES.rapidRate && Math.abs(rate) >= VISUAL_RULES.rapidRate && oldRate * rate < 0)
    return { kind:'reversal', title:'Abrupt change and reversal', detail:'Two large opposite changes were observed. This rule cannot distinguish a physiological change from a sensor or data issue.', rate };
  if (Math.abs(rate) >= VISUAL_RULES.rapidRate)
    return { kind:'rapid', title:'Unusual sample change', detail:`Absolute change is at least ${VISUAL_RULES.rapidRate} mg/dL/min. This unvalidated display rule does not establish a real spike or sensor fault.`, rate };
  return { kind:'none', title:'No rule triggered', detail:'No rule triggered in these recent samples. This is not a safety clearance or a validated anomaly assessment.', rate };
}

export type Projection = { status:'projected' | 'insufficient' | 'flagged' | 'already_below' | 'not_falling' | 'beyond'; minutes:number | null; rate:number | null; glucose:number | null; reason:string };
/** Arithmetic extrapolation for fictional samples only. Calling code gates this to Future lab. */
export function projectTo70(points: TwinPoint[], index: number): Projection {
  const flag=inspectPattern(points,index), point=points[index];
  const common={minutes:null,rate:flag.rate,glucose:point?.glucose ?? null};
  if (flag.kind !== 'none') return {...common,status:'flagged',reason:'Projection withheld because a sample-quality or unusual-change rule was triggered.'};
  if (flag.rate === null) return {...common,status:'insufficient',reason:'Select at least the second fictional sample.'};
  if (point.glucose <= 70) return {...common,status:'already_below',reason:'The selected fictional sample is already at or below 70 mg/dL; no future crossing is estimated.'};
  if (flag.rate >= -.05) return {...common,status:'not_falling',reason:'The recent fictional samples are flat, rising or too close to flat for this illustration.'};
  const minutes=(point.glucose - 70)/-flag.rate;
  if (!Number.isFinite(minutes) || minutes > VISUAL_RULES.projectionHorizon)
    return {...common,status:'beyond',reason:'The linear crossing falls beyond this 120-minute illustration. No countdown is shown.'};
  return {...common,status:'projected',minutes,reason:'If this fictional slope continued unchanged, it would cross 70 mg/dL at the displayed time.'};
}

export function formatProjectionClock(seconds: number) {
  const bounded=Math.max(0,Math.ceil(seconds));
  return `${Math.floor(bounded/60).toString().padStart(2,'0')}:${(bounded%60).toString().padStart(2,'0')}`;
}
