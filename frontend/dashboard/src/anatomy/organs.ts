export type OrganId = "pancreas" | "liver" | "gut" | "muscle" | "fat";
export type ViewId = "body" | OrganId;

export const ORGANS: Record<OrganId, {
  name: string; role: string; description: string; connection: string;
  notMeasured: string; color: string; source: string; sourceTitle: string;
  appearance: string; appearanceSource: string; roughness: number;
  center: [number, number, number]; distance: number;
}> = {
  pancreas: {
    name: "Pancreas", role: "Signals glucose uptake",
    description: "The pancreas makes insulin, a hormone that helps glucose enter cells for energy.",
    connection: "GlucoTwin combines glucose history with recorded health and meal context. Its score does not measure insulin secretion.",
    notMeasured: "Insulin output and pancreatic function are not measured.",
    // sRGB illustration choices, not measured tissue reflectance. See docs/ANATOMY_APPEARANCE.md.
    color: "#c9a384", appearance: "Warm tan, with a lobulated surface.", roughness: .53,
    appearanceSource: "https://www.tau.ac.il/medicine/tau-only/webpath/panchtml/panc189.htm",
    source: "https://www.niddk.nih.gov/health-information/diabetes/overview/what-is-diabetes",
    sourceTitle: "NIDDK · What is diabetes?", center: [0.08, 0.68, 0.16], distance: 2.65,
  },
  liver: {
    name: "Liver", role: "Stores glucose for later",
    description: "Insulin signals the liver to store extra blood glucose as energy for later use.",
    connection: "The model receives glucose and fasting-laboratory context, but no liver-function measurement or liver-specific prediction.",
    notMeasured: "Liver function and glucose production are not measured.",
    color: "#71382f", appearance: "Dark reddish-brown.", roughness: .38,
    appearanceSource: "https://www.hopkinsmedicine.org/health/conditions-and-diseases/liver-anatomy-and-functions",
    source: "https://www.cdc.gov/diabetes/about/insulin-resistance-type-2-diabetes.html",
    sourceTitle: "CDC · Insulin resistance", center: [-0.23, 1.02, 0.08], distance: 3.3,
  },
  gut: {
    name: "Digestive tract", role: "Brings meal nutrients into the body",
    description: "Digestion breaks carbohydrates into simple sugars. The small intestine absorbs nutrients into the bloodstream.",
    connection: "The meal description supplies food keywords and reported weights. These are simple model inputs, not measured nutrient absorption.",
    notMeasured: "Digestion speed and glucose absorption are not measured.",
    color: "#d59b94", appearance: "Pale pink bowel; the stomach shares this simplified pink-tan palette.", roughness: .42,
    appearanceSource: "https://my.clevelandclinic.org/health/body/ileum",
    source: "https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works",
    sourceTitle: "NIDDK · Your digestive system", center: [0.08, 0.3, 0.12], distance: 3.6,
  },
  muscle: {
    name: "Skeletal muscle", role: "Uses glucose for energy",
    description: "Muscle cells respond to insulin and take up glucose. Insulin resistance can reduce this response.",
    connection: "Highlighted limb regions illustrate skeletal muscle. GlucoTwin does not receive activity or muscle-specific glucose-uptake measurements.",
    notMeasured: "Muscle uptake and insulin sensitivity are not measured.",
    color: "#9d4944", appearance: "Muted red; myoglobin contributes to muscle color.", roughness: .62,
    appearanceSource: "https://www.nmr.hhu.de/main/mmyoglobin_e.html",
    source: "https://www.niddk.nih.gov/health-information/diabetes/overview/what-is-diabetes/prediabetes-Insulin-resistance",
    sourceTitle: "NIDDK · Insulin resistance", center: [-0.4, -1.1, 0.05], distance: 4.0,
  },
  fat: {
    name: "Adipose tissue", role: "Participates in insulin response",
    description: "Fat tissue is one of the tissues that responds to insulin. Changes in that response are part of insulin resistance.",
    connection: "BMI is a background model input. It does not tell this viewer a patient's fat distribution or tissue function.",
    notMeasured: "Fat distribution and tissue function are not measured.",
    color: "#e3c374", appearance: "Soft yellow, representing white adipose tissue rather than brown fat.", roughness: .65,
    appearanceSource: "https://openpress.universityofgalway.ie/openhistology1/chapter/connective-tissue-supports-and-protects/",
    source: "https://www.niddk.nih.gov/health-information/diabetes/overview/what-is-diabetes/prediabetes-Insulin-resistance",
    sourceTitle: "NIDDK · Insulin resistance", center: [0.2, 0.1, 0.04], distance: 3.6,
  },
};

export const ORGAN_IDS = Object.keys(ORGANS) as OrganId[];

export function cameraStage(distance: number): "body" | "abdomen" | "detail" {
  return distance > 7.8 ? "body" : distance > 4.2 ? "abdomen" : "detail";
}
