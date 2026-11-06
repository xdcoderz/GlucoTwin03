import { ORGANS } from '../anatomy/organs';

export type OrganId = 'body' | 'pancreas' | 'liver' | 'gut' | 'muscle' | 'fat';
export const organOrder: OrganId[] = ['body', 'pancreas', 'liver', 'gut', 'muscle', 'fat'];
export const tourOrder: OrganId[] = ['body', 'gut', 'pancreas', 'liver', 'muscle', 'fat'];

interface OrganInfo {
  name: string; category: string; badge: string; headline: string;
  description: string; detail: string; role: string; color: string; glowColor: string;
  focus: [number, number, number]; cameraPos: [number, number, number];
  anatomyHighlights: string[];
  mechanismSteps: { step: string; phase: string; description: string }[];
  diabetes: string; source: string; sourceTitle: string;
}

const diabetesContext: Record<Exclude<OrganId, 'body'>, string> = {
  pancreas: 'In type 2 diabetes, insulin production may not keep up with the body’s needs, allowing blood glucose to rise.',
  liver: 'When the liver responds less effectively to insulin, blood glucose can remain elevated.',
  gut: 'Absorbed sugars contribute to the glucose rise after a meal—the period GlucoTwin examines.',
  muscle: 'Insulin resistance in muscle can reduce its response to insulin and contribute to high blood glucose.',
  fat: 'Fat tissue can become less responsive to insulin. This is one part of insulin resistance in type 2 diabetes.',
};

const projectContext: Record<Exclude<OrganId, 'body'>, string> = {
  pancreas: 'Shown because insulin helps the body respond to a meal-related glucose rise. GlucoTwin uses recorded history and meal context; it does not measure insulin release.',
  liver: 'Shown because the liver helps balance stored and circulating glucose. GlucoTwin uses glucose and laboratory context; it does not estimate liver glucose output.',
  gut: 'Shown because digestion connects a meal to glucose entering the blood. Meal descriptions and reported weights are model inputs; absorption speed is not measured.',
  muscle: 'Shown because muscle is part of the body’s response to insulin. GlucoTwin illustrates this connection; it has no muscle uptake or activity measurements.',
  fat: 'Shown because adipose tissue is involved in insulin response. BMI is background context in the model; fat distribution and function are not measured.',
};

type Presentation = Pick<OrganInfo, 'name' | 'category' | 'badge' | 'headline' | 'focus' | 'cameraPos'>;
const presentation: Record<OrganId, Presentation> = {
  body: {
    name: 'Whole Body',
    category: 'INTEGRATED METABOLIC TWIN',
    badge: 'SYSTEM OVERVIEW',
    headline: 'A little closer\nto you.',
    focus: [0, 0.88, 0],
    cameraPos: [0.15, 1.0, 3.45],
  },
  pancreas: {
    name: 'Pancreas',
    category: 'ENDOCRINE COMMAND CENTER',
    badge: 'HORMONAL REGULATION',
    headline: 'Precision\nsignaling.',
    focus: [-0.005, 1.147, -0.025],
    cameraPos: [0.22, 1.18, 0.44],
  },
  liver: {
    name: 'Liver',
    category: 'CENTRAL METABOLIC RESERVOIR',
    badge: 'STORAGE & RELEASE',
    headline: 'The grand\nbuffer.',
    focus: [-0.066, 1.242, 0.024],
    cameraPos: [-0.32, 1.30, 0.58],
  },
  gut: {
    name: 'Digestive Tract',
    category: 'NUTRIENT CONVERTER & INCRETIN ENGINE',
    badge: 'ABSORPTION & SIGNALS',
    headline: 'Where energy\nbegins.',
    focus: [0.028, 1.109, 0.042],
    cameraPos: [0.16, 1.12, 0.65],
  },
  muscle: {
    name: 'Skeletal Muscle',
    category: 'PRIMARY GLUCOSE CONSUMER',
    badge: 'METABOLIC ENGINE',
    headline: 'Movement\ninto energy.',
    focus: [-0.095, 0.754, 0.02],
    cameraPos: [-0.30, 0.82, 0.92],
  },
  fat: {
    name: 'Adipose Tissue',
    category: 'ENDOCRINE BUFFER & LIPID SINK',
    badge: 'ENERGY RESERVE',
    headline: 'Adaptive\nreserves.',
    focus: [0.076, 1.069, 0.078],
    cameraPos: [0.26, 1.08, 0.55],
  },
};

export const organs = Object.fromEntries(organOrder.map(id => {
  const record = id === 'body' ? null : ORGANS[id];
  const description = record?.description || 'A patient. A meal. The next 120 minutes. Explore the organs behind the glucose story, then open the workspace to inspect a saved model score.';
  const connection = record?.connection || 'Synthetic health record + meal + nine recent glucose samples. Spring Boot prepares 43 inputs for the fitted event model.';
  const boundary = record?.notMeasured || 'This generic 3D anatomy is educational. The model does not measure organ function.';
  return [id, {
    ...presentation[id], description, detail: id === 'body' ? connection : projectContext[id],
    diabetes: id === 'body' ? '' : diabetesContext[id],
    source: id === 'gut' ? ORGANS.gut.source : 'https://www.niddk.nih.gov/health-information/diabetes/overview/what-is-diabetes/prediabetes-Insulin-resistance',
    sourceTitle: id === 'gut' ? 'NIDDK · Your digestive system' : 'NIDDK · Insulin resistance',
    role: record?.role || 'One connected research workflow',
    color: record?.color || '#60a5fa', glowColor: record?.color || '#93c5fd',
    anatomyHighlights: record ? [record.appearance, boundary, 'Generic educational geometry; not a patient scan.'] : [
      'Explore five connected metabolic structures',
      'Score one defined post-meal event in the workspace',
      'Review saved results, factors and later observations'
    ],
    mechanismSteps: record ? [
      { step:'01', phase:'Biology in context', description },
      { step:'02', phase:'Connection to this project', description:connection },
      { step:'03', phase:'What is not measured', description:boundary }
    ] : [
      { step:'01', phase:'Patient and meal', description:'Start with a synthetic health record and a fixed meal-time baseline.' },
      { step:'02', phase:'History and score', description:'Check all nine pre-meal samples, then request and save one uncalibrated 120-minute event score.' },
      { step:'03', phase:'Follow-up and review', description:'Keep later observations separate from the original saved inputs and model output.' }
    ]
  }];
})) as Record<OrganId, OrganInfo>;

// Both timelines are fictional illustrations. Neither is an inference input.
export const daySamples: { time: string; value: number | null }[] = [
  { time: '06:00', value: 88 },
  { time: '07:00', value: 91 },
  { time: '08:00', value: 112 },
  { time: '09:00', value: 143 },
  { time: '10:00', value: 126 },
  { time: '11:00', value: null },
  { time: '12:00', value: 109 },
  { time: '13:00', value: 158 },
  { time: '14:00', value: 136 },
  { time: '15:00', value: 115 },
  { time: '16:00', value: 102 },
  { time: '17:00', value: 98 },
  { time: '18:00', value: 110 },
  { time: '19:00', value: 151 },
  { time: '20:00', value: 124 },
  { time: '21:00', value: 106 },
  { time: '22:00', value: 95 },
  { time: '23:00', value: 92 },
];

export const scenarioSamples = daySamples.map((s, i) => ({
  ...s,
  value: [94, 101, 128, 186, 193, 164, 132, 119, 104, 89, 67, 74, 96, 134, 153, 127, 109, 98][i]
}));

