"""Read-only feasibility audit of the existing Shanghai research export.

Writes aggregate counts and file hashes only. Does not score, train, copy source
records, or change the demo/clinical target. Window counts are not episode counts.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path


def rows(root: Path, name: str) -> list[dict]:
    with (root / name).open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def recorded_bool(value: str) -> bool:
    if value.lower() in ("true", "1"):
        return True
    if value.lower() in ("false", "0"):
        return False
    raise ValueError("Unexpected boolean in research export")


def audit(root: Path) -> dict:
    names = ["glucose_readings.csv", "meal_events.csv", "modeling/model_features.csv", "modeling/baseline_predictions.csv"]
    features = rows(root, names[2])
    predictions = rows(root, names[3])
    meals = {row["meal_id"]: row for row in rows(root, names[1])}
    glucose = defaultdict(dict)
    for row in rows(root, names[0]):
        glucose[row["recording_id"]][datetime.fromisoformat(row["timestamp"])] = float(row["glucose_mg_dl"])
    by_split = {}
    for split in ("train", "validation", "test"):
        group = [row for row in features if row["split"] == split]
        high = [row for row in group if float(row["baseline_glucose_mg_dl"]) >= 180]
        counts = {
            "eligible_meals": len(group),
            "patients": len({row["patient_id"] for row in group}),
            "baseline_already_ge_180": len(high),
            "composite_events_in_already_high": sum(int(row["spike_within_120_min"]) for row in high),
            "baseline_below_180_meals": len(group) - len(high),
            "composite_positive_meals": sum(int(row["spike_within_120_min"]) for row in group),
            "absolute_180_positive_meals": 0,
            "rise40_positive_meals": 0,
            "rise40_only_without_180": 0,
            "complete_8_future_15min_samples": 0,
            "observed_under70_in_complete_windows": 0,
        }
        low_patients = set()
        for row in group:
            meal = meals[row["meal_id"]]
            hyper = recorded_bool(meal["reaches_180_mg_dl_within_120_min"])
            rise = recorded_bool(meal["rises_40_mg_dl_within_120_min"])
            if int(hyper or rise) != int(row["spike_within_120_min"]):
                raise ValueError("Composite label disagrees with component labels")
            counts["absolute_180_positive_meals"] += int(hyper)
            counts["rise40_positive_meals"] += int(rise)
            counts["rise40_only_without_180"] += int(rise and not hyper)
            start = datetime.fromisoformat(row["timestamp"])
            future = [glucose[row["recording_id"]].get(start + timedelta(minutes=minute)) for minute in range(15, 121, 15)]
            if all(value is not None for value in future):
                counts["complete_8_future_15min_samples"] += 1
                if min(future) < 70:
                    counts["observed_under70_in_complete_windows"] += 1
                    low_patients.add(row["patient_id"])
        counts["patients_with_under70_windows"] = len(low_patients)
        by_split[split] = counts
    feature_map = {row["meal_id"]: row for row in features}
    matrices = {name: dict(TN=0, FP=0, FN=0, TP=0) for name in ("all", "baseline_below180", "baseline_ge180")}
    for row in predictions:
        if row["split"] != "test":
            continue
        actual = int(row["actual_spike_within_120_min"])
        predicted = int(row["predicted_spike_at_0_5_threshold"])
        cell = ("T" if actual == predicted else "F") + ("P" if predicted else "N")
        subgroup = "baseline_ge180" if float(feature_map[row["meal_id"]]["baseline_glucose_mg_dl"]) >= 180 else "baseline_below180"
        matrices["all"][cell] += 1
        matrices[subgroup][cell] += 1
    if sum(matrices["all"].values()) != by_split["test"]["eligible_meals"]:
        raise ValueError("Existing prediction rows do not cover the test meals exactly")
    return {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "purpose": "Aggregate scope feasibility; not a new trained model or clinical validation",
        "source_sha256": {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in names},
        "definitions": {
            "baseline_high": "Recorded meal-time baseline >=180 mg/dL",
            "composite_event": "Existing label: any future glucose >=180 OR rise >=40 from baseline within 120 minutes",
            "low_window": "At least one observed glucose <70 among eight exact future samples at +15,+30,...,+120 minutes",
            "complete_future": "All eight expected future samples present; no interpolation; excludes baseline",
            "caution": "Counts are overlapping meal windows, not independent episodes. No new low-glucose classifier is evaluated. Subgroups are descriptive post-hoc audits, not fresh held-out validation."
        },
        "splits": by_split,
        "existing_model_test_confusion_matrices_at_0_50": matrices,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--processed-root", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    result = audit(args.processed_root)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "aggregate_audit_written", "meals": sum(row["eligible_meals"] for row in result["splits"].values()), "records_copied": False, "model_trained": False}))


if __name__ == "__main__":
    main()
