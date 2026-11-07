import copy
import importlib.util
import json
import os
from pathlib import Path
import threading
import subprocess
import sys
import unittest
from concurrent.futures import ThreadPoolExecutor
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from http.server import ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[1]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


publisher = load("publisher_tests", "cgm-publisher/app.py")
preview = load("preview_tests", "tools/preview_api.py")


class ReplayTests(unittest.TestCase):
    def setUp(self):
        self.fixture = json.loads((ROOT / "data/sample/demo_patient_001.json").read_text(encoding="utf-8"))

    def test_stable_ids_and_no_future_readings(self):
        first = publisher.build_events(self.fixture, publisher.BASELINE_AT)
        again = publisher.build_events(self.fixture, publisher.BASELINE_AT)
        self.assertEqual(first, again)
        self.assertEqual(len({event["eventId"] for event in first}), 9)
        times = [publisher.datetime.fromisoformat(event["observedAt"].replace("Z", "+00:00")) for event in first]
        self.assertEqual(times, sorted(times))
        self.assertTrue(all(time <= publisher.BASELINE_AT for time in times))
        self.assertEqual(times[-1], publisher.BASELINE_AT)

    def test_non_synthetic_and_missing_provenance_rejected(self):
        for field, value in (("synthetic", False), ("containsRealPatientData", True)):
            fixture = copy.deepcopy(self.fixture)
            fixture["provenance"][field] = value
            with self.assertRaises(ValueError):
                publisher.build_events(fixture, publisher.BASELINE_AT)
        del self.fixture["provenance"]["containsRealPatientData"]
        with self.assertRaises(ValueError):
            publisher.build_events(self.fixture, publisher.BASELINE_AT)

    def test_future_duplicate_and_missing_offsets_rejected(self):
        for offset in (-15, 120, 1, False, 0.0):
            fixture = copy.deepcopy(self.fixture)
            fixture["cgmHistory"][-1]["minutesBefore"] = offset
            with self.assertRaises(ValueError):
                publisher.build_events(fixture, publisher.BASELINE_AT)

    def test_invalid_glucose_rejected(self):
        for value in (float("nan"), float("inf"), 39, 501, True):
            fixture = copy.deepcopy(self.fixture)
            fixture["cgmHistory"][0]["glucoseMgDl"] = value
            with self.assertRaises(ValueError):
                publisher.build_events(fixture, publisher.BASELINE_AT)

    def test_dry_run_cli_prints_both_scenarios_without_network(self):
        env = dict(os.environ)
        env["FIXTURE_PATHS"] = ",".join(str(ROOT / f"data/sample/demo_patient_{number:03d}.json") for number in (1, 2))
        env["SPRING_API_URL"] = "http://127.0.0.1:1/unreachable"
        result = subprocess.run([sys.executable, "-B", str(ROOT / "cgm-publisher/app.py"), "--dry-run"], env=env, capture_output=True, text=True, timeout=5)
        self.assertEqual(result.returncode, 0, result.stderr)
        rows = [json.loads(line) for line in result.stdout.splitlines()]
        self.assertEqual(len(rows), 18)
        self.assertEqual({row["patientId"] for row in rows}, {"DEMO-001", "DEMO-002"})


class PreviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = preview.PreviewServer(("127.0.0.1", 0), preview.Handler)
        cls.server.patients = preview.load_patients()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=3)

    def request(self, path, method="GET"):
        with urlopen(Request(self.base + path, method=method), timeout=3) as response:
            return json.load(response)

    def test_dashboard_request_burst_keeps_patient_and_unavailable_score(self):
        def fetch_patient(_):
            with urlopen(self.base + '/api/patients/DEMO-001', timeout=10) as response:
                return json.load(response)
        with ThreadPoolExecutor(max_workers=16) as pool:
            rows = list(pool.map(fetch_patient, range(16)))
        self.assertEqual(len(rows), 16)
        for row in rows:
            self.assertEqual(row['patient']['patientId'], 'DEMO-001')
            self.assertIsNone(row['prediction']['model_score'])

    def test_both_patients_are_explicit_previews(self):
        self.assertEqual(len(self.request("/api/patients")), 2)
        row = self.request("/api/patients/DEMO-002")
        self.assertTrue(row["patient"]["displayName"].startswith("PREVIEW ONLY"))
        self.assertEqual(len(row["cgmHistory"]), 9)

    def test_preview_never_invents_score(self):
        for pid in ("DEMO-001", "DEMO-002"):
            result = self.request(f"/api/patients/{pid}/refresh", "POST")
            self.assertEqual(result["status"], "unavailable")
            self.assertIsNone(result["model_score"])
            self.assertIsNone(result["predicted_event"])
            self.assertEqual(result["reason"], "module_preview_no_model")

    def test_unknown_patient_and_route_rejected(self):
        for path in ("/api/patients/REAL-001", "/api/patients/DEMO-001/wrong"):
            with self.assertRaises(HTTPError) as context:
                self.request(path)
            self.assertEqual(context.exception.code, 404)


if __name__ == "__main__":
    unittest.main()
