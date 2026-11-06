"""Read-only module checks. Does not start or assemble the application."""
from __future__ import annotations

import argparse
import ast
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
PARTS = ("data", "replay", "backend", "ml", "dashboard", "packaging", "docs")


def read_json(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def require(condition, message):
    if not condition:
        raise ValueError(message)


def check(part, contract):
    if part in ("data", "replay"):
        spec = importlib.util.spec_from_file_location("publisher", ROOT / "cgm-publisher/app.py")
        publisher = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(publisher)
        seen = []
        for path in sorted((ROOT / "data/sample").glob("demo_patient_*.json")):
            fixture = json.loads(path.read_text(encoding="utf-8"))
            pid = fixture["patient"]["patientId"]
            seen.append(pid)
            require([row["minutesBefore"] for row in fixture["cgmHistory"]] == contract["historyOffsetsMinutes"], f"History offsets differ: {path.name}")
            events = publisher.build_events(fixture, publisher.BASELINE_AT)
            require(all(set(event) == set(contract["cgmEventFields"]) for event in events), "CGM event contract differs")
            bundled = read_json(f"backend/fusion-api/src/main/resources/{path.name}")
            require(fixture == bundled, f"Spring and publisher fixtures differ: {path.name}")
        require(seen == contract["patients"], "Unexpected synthetic patient list")
        return "Both synthetic fixtures, pre-meal history, and event fields match"
    if part == "ml":
        metadata = read_json("ml-service/app/artifacts/model_metadata.json")
        artifact = ROOT / "ml-service/app/artifacts/logistic_regression.joblib"
        require(hashlib.sha256(artifact.read_bytes()).hexdigest() == metadata["artifactSha256"], "Artifact hash mismatch")
        tree = ast.parse((ROOT / "ml-service/app/main.py").read_text(encoding="utf-8"))
        features = next(ast.literal_eval(node.value) for node in tree.body if isinstance(node, ast.Assign) and any(isinstance(target, ast.Name) and target.id == "FEATURE_NAMES" for target in node.targets))
        require(features == contract["featureNames"] and len(features) == 43, "ML feature order drift")
        require(metadata["featureCount"] == 43, "Metadata feature count drift")
        require(metadata["calibratedProbability"] is False, "Score calibration claim drift")
        require(all(f"`{name}`" in (ROOT / "docs/FEATURE_DICTIONARY.md").read_text(encoding="utf-8") for name in features), "Feature dictionary missing inputs")
        return "Artifact hash and frozen 43-feature inference schema match; model execution deferred"
    required = {
        "backend": ["backend/fusion-api/pom.xml", "backend/fusion-api/Dockerfile", "backend/fusion-api/src/test/java/com/glucotwin/api/FeatureBuilderTest.java"],
        "dashboard": ["frontend/dashboard/package.json", "frontend/dashboard/src/App.tsx", "tools/preview_api.py"],
        "packaging": ["compose.yaml", "compose.modules.yaml", "tools/Module.ps1"],
        "docs": ["docs/MODULE_PLAN.md", "docs/ASSEMBLY_NOV_2.md", "docs/CLINICAL_SCOPE.md", "docs/API_CONTRACT.md"],
    }
    for path in required[part]:
        require((ROOT / path).is_file(), f"Missing module file: {path}")
    return "Module entry files present; build/runtime gates tracked separately"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--part", choices=("all",) + PARTS, default="all")
    args = parser.parse_args()
    contract = read_json("contracts/v1.json")
    failed = False
    for part in PARTS if args.part == "all" else (args.part,):
        try:
            print(f"PASS {part}: {check(part, contract)}")
        except Exception as exc:
            failed = True
            print(f"FAIL {part}: {exc}")
    if args.part in ("all", "data", "replay", "dashboard"):
        suite = unittest.defaultTestLoader.discover(str(ROOT / "tests"), pattern="test_*.py")
        result = unittest.TextTestRunner(verbosity=2).run(suite)
        failed = failed or not result.wasSuccessful()
    print("Static module checks only; assembled runtime acceptance is recorded separately in docs/MVP_ACCEPTANCE.md.")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
