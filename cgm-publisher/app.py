from __future__ import annotations

import json
import argparse
import math
import os
import re
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

FIXTURES = [Path(value.strip()) for value in os.getenv("FIXTURE_PATHS", "/app/data/demo_patient_001.json,/app/data/demo_patient_002.json").split(",") if value.strip()]
API_URL = os.getenv("SPRING_API_URL", "http://spring:8080/api/cgm/events")
BASELINE_AT = datetime.fromisoformat(os.getenv("SIMULATED_MEAL_TIME", "2026-10-30T12:00:00+00:00")).astimezone(timezone.utc)
INTERVAL = float(os.getenv("REPLAY_INTERVAL_SECONDS", "1.2"))


def validate_provenance(payload: dict, mode: str = "demo") -> None:
    """Check declared data origin; these declarations do not prove de-identification."""
    provenance = payload.get("provenance", {})
    if mode == "demo":
        if provenance.get("synthetic") is not True or provenance.get("containsRealPatientData") is not False:
            raise ValueError("Public demo accepts explicitly synthetic data only; use research validation for real-derived records")
    elif mode == "research":
        if provenance.get("synthetic") is not False or provenance.get("containsRealPatientData") is not True:
            raise ValueError("Research records must explicitly declare real-derived, non-synthetic origin")
        if provenance.get("deidentified") is not True or provenance.get("researchUsePermitted") is not True:
            raise ValueError("Research input needs declared de-identification and permitted research use")
        for field in ("source", "usageTerms"):
            if not isinstance(provenance.get(field), str) or not provenance[field].strip():
                raise ValueError("Research input needs a source and usageTerms reference")
        allowed_root = {"schemaVersion", "provenance", "patient", "currentMeal", "cgmHistory"}
        allowed_patient = {"patientId", "displayName", "sex", "ageYears", "bmiKgM2", "diabetesDurationYears", "hba1cPercent", "fastingPlasmaGlucoseMgDl", "diagnoses", "medications"}
        if set(payload) - allowed_root or set(payload.get("patient", {})) - allowed_patient:
            raise ValueError("Unexpected research fields: use the documented patient schema without identifier fields")
        patient = payload.get("patient", {})
        if patient.get("displayName") != patient.get("patientId"):
            raise ValueError("Research displayName must equal its pseudonymous patientId")
    else:
        raise ValueError("Data mode must be demo or research")


def research_baseline(payload: dict) -> datetime:
    value = payload.get("currentMeal", {}).get("baselineAt")
    if not isinstance(value, str):
        raise ValueError("Research input needs currentMeal.baselineAt with an explicit timezone")
    try:
        baseline = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise ValueError("Research baselineAt must be an ISO-8601 timestamp") from None
    if baseline.tzinfo is None:
        raise ValueError("Research baselineAt must include a timezone")
    return baseline


def build_events(payload: dict, baseline_at: datetime, mode: str = "demo") -> list[dict]:
    """Prepare deterministic pre-meal events without sending any HTTP requests."""
    validate_provenance(payload, mode)
    if baseline_at.tzinfo is None:
        raise ValueError("Baseline must include a timezone")
    patient_id = payload["patient"]["patientId"]
    prefix = "DEMO" if mode == "demo" else "RESEARCH"
    if not isinstance(patient_id, str) or not re.fullmatch(prefix + r"-[A-Za-z0-9-]{1,64}", patient_id):
        raise ValueError("Patient ID must use the mode's DEMO- or RESEARCH- pseudonymous format")
    history = payload["cgmHistory"]
    offsets = [row["minutesBefore"] for row in history]
    if any(type(offset) is not int for offset in offsets) or len(offsets) != 9 or set(offsets) != set(range(0, 121, 15)):
        raise ValueError("Expected nine unique history offsets from 120 to 0 minutes")
    events = []
    for index, reading in enumerate(sorted(history, key=lambda row: -row["minutesBefore"]), start=1):
        glucose = reading["glucoseMgDl"]
        if isinstance(glucose, bool) or not isinstance(glucose, (int, float)) or not math.isfinite(glucose) or not 40 <= glucose <= 500:
            raise ValueError("Glucose must be finite and between 40 and 500 mg/dL for this input contract")
        observed_at = baseline_at.astimezone(timezone.utc) - timedelta(minutes=reading["minutesBefore"])
        events.append({
            "patientId": patient_id,
            "eventId": f"{patient_id}-HISTORY-{index:02d}",
            "observedAt": observed_at.isoformat().replace("+00:00", "Z"),
            "glucoseMgDl": float(glucose),
            "source": "synthetic-cgm-replay" if mode == "demo" else "deidentified-research-record",
        })
    return events


def main() -> None:
    parser = argparse.ArgumentParser(description="Replay synthetic CGM or validate local de-identified research records")
    parser.add_argument("--dry-run", action="store_true", help="Print events without HTTP delivery or waiting")
    parser.add_argument("--mode", choices=("demo", "research"), default="demo")
    parser.add_argument("--validate-only", action="store_true", help="Validate input without sending or printing measurements")
    parser.add_argument("--fixture", type=Path, action="append", help="Input JSON path; may be repeated")
    args = parser.parse_args()
    if args.mode == "research" and (not args.validate_only or args.dry_run or not args.fixture):
        parser.error("Research mode requires --validate-only and --fixture; delivery and raw-event printing are disabled")
    for fixture in args.fixture or FIXTURES:
        try:
            payload = json.loads(fixture.read_text(encoding="utf-8"))
            baseline = research_baseline(payload) if args.mode == "research" else BASELINE_AT
            events = build_events(payload, baseline, mode=args.mode)
        except (OSError, ValueError, KeyError, TypeError):
            # Do not include private paths, input values, or patient identifiers in console errors.
            parser.exit(2, "Input validation failed. Check provenance, pseudonymous fields, baseline and history schema.\n")
        if args.validate_only:
            print(json.dumps({"status": "validated", "mode": args.mode, "readings": len(events), "sent": False, "modelScored": False}), flush=True)
            continue
        for index, event in enumerate(events, start=1):
            if args.dry_run:
                print(json.dumps(event, allow_nan=False), flush=True)
                continue
            request = Request(API_URL, data=json.dumps(event).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST")
            try:
                with urlopen(request, timeout=10) as response:
                    print(f"{event['eventId']}: {response.status} {response.read().decode('utf-8')}", flush=True)
            except (HTTPError, URLError) as exc:
                raise RuntimeError(f"Could not send synthetic CGM event {event['eventId']} to Spring: {exc}") from exc
            if index < len(events):
                time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
