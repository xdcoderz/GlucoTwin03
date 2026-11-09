"""Policy tests use fabricated records only; no real participant records are included."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("research_publisher", ROOT / "cgm-publisher/app.py")
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)


class ResearchInputTests(unittest.TestCase):
    def setUp(self):
        # Adapt a synthetic fixture solely to exercise research policy, not to claim real-data evaluation.
        self.record = json.loads((ROOT / "data/sample/demo_patient_001.json").read_text())
        self.record["provenance"] = {
            "synthetic": False, "containsRealPatientData": True,
            "deidentified": True, "researchUsePermitted": True,
            "source": "Fabricated policy-test record", "usageTerms": "Automated test only",
        }
        self.record["patient"]["patientId"] = "RESEARCH-001"
        self.record["patient"]["displayName"] = "RESEARCH-001"
        self.record["currentMeal"]["baselineAt"] = "2025-04-10T12:00:00+05:30"

    def test_research_record_accepted_only_in_explicit_mode(self):
        baseline = publisher.research_baseline(self.record)
        with self.assertRaises(ValueError):
            publisher.build_events(self.record, baseline)
        events = publisher.build_events(self.record, baseline, mode="research")
        self.assertEqual(len(events), 9)
        self.assertEqual(events[-1]["observedAt"], "2025-04-10T06:30:00Z")
        self.assertEqual(events[-1]["source"], "deidentified-research-record")

    def test_missing_or_false_research_declarations_rejected(self):
        for field in ("deidentified", "researchUsePermitted", "source", "usageTerms"):
            for value in (None, False, ""):
                record = copy.deepcopy(self.record)
                record["provenance"][field] = value
                with self.assertRaises(ValueError):
                    publisher.build_events(record, publisher.BASELINE_AT, mode="research")

    def test_identifier_fields_and_named_display_rejected(self):
        record = copy.deepcopy(self.record)
        record["patient"]["email"] = "not-a-real-address@example.invalid"
        with self.assertRaises(ValueError):
            publisher.build_events(record, publisher.BASELINE_AT, mode="research")
        record = copy.deepcopy(self.record)
        record["patient"]["displayName"] = "Named individual"
        with self.assertRaises(ValueError):
            publisher.build_events(record, publisher.BASELINE_AT, mode="research")

    def test_synthetic_cannot_be_relabelled_by_mode_alone(self):
        self.record["provenance"]["synthetic"] = True
        with self.assertRaises(ValueError):
            publisher.build_events(self.record, publisher.BASELINE_AT, mode="research")

    def test_timestamp_required_and_timezone_preserved(self):
        for value in (None, "", "2025-04-10T12:00:00"):
            self.record["currentMeal"]["baselineAt"] = value
            with self.assertRaises(ValueError):
                publisher.research_baseline(self.record)

    def test_cli_validation_never_sends_or_prints_measurements(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "test-only.json"
            path.write_text(json.dumps(self.record), encoding="utf-8")
            args = [str(ROOT / "cgm-publisher/app.py"), "--mode", "research", "--validate-only", "--fixture", str(path)]
            with patch.object(sys, "argv", ["app.py"] + args[1:]), patch.object(publisher, "urlopen", side_effect=AssertionError("Research must not send")), patch("builtins.print") as printed:
                publisher.main()
                self.assertEqual(json.loads(printed.call_args.args[0]), {"status": "validated", "mode": "research", "readings": 9, "sent": False, "modelScored": False})
            # Include Windows interpreter startup under concurrent browser load.
            result = subprocess.run([sys.executable, "-B"] + args, capture_output=True, text=True, timeout=20)
            self.assertEqual(result.returncode, 0)
            self.assertNotIn("RESEARCH-001", result.stdout)
            self.assertNotIn("glucoseMgDl", result.stdout)

    def test_cli_rejects_delivery_and_raw_dry_run_for_research(self):
        for switches in ([], ["--dry-run"], ["--validate-only", "--dry-run"]):
            result = subprocess.run([sys.executable, "-B", str(ROOT / "cgm-publisher/app.py"), "--mode", "research", "--fixture", "not-read.json"] + switches, capture_output=True, text=True, timeout=20)
            self.assertNotEqual(result.returncode, 0)
            self.assertNotIn("glucoseMgDl", result.stdout)


if __name__ == "__main__":
    unittest.main()
