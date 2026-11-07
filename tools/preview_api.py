"""Local dashboard preview using synthetic fixtures; never calculates a model score."""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
import hashlib
import uuid
import threading
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parent))
import preview_journal as journal
PREVIEW_LOCK = threading.RLock()

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("replay", ROOT / "cgm-publisher/app.py")
replay = importlib.util.module_from_spec(spec)
spec.loader.exec_module(replay)


def preview_state(fixture: dict) -> dict:
    patient = dict(fixture["patient"])
    patient["displayName"] = "PREVIEW ONLY - " + patient["displayName"]
    return {
        "patient": patient,
        "currentMeal": {**fixture["currentMeal"], "mealId": patient['patientId'] + '-MEAL-' + str(int(replay.BASELINE_AT.timestamp()*1000)), "baselineAt": replay.BASELINE_AT.isoformat(), "clockMode": "synthetic_replay"},
        "cgmHistory": replay.build_events(fixture, replay.BASELINE_AT),
        "prediction": {
            "status": "unavailable", "model_score": None, "horizon_minutes": 120,
            "threshold": None, "predicted_event": None, "model_version": None,
            "top_factors": [], "reason": "module_preview_no_model",
        },
    }


def load_patients() -> dict:
    fixtures = [json.loads(path.read_text(encoding="utf-8")) for path in sorted((ROOT / "data/sample").glob("demo_patient_*.json"))]
    return {fixture["patient"]["patientId"]: preview_state(fixture) for fixture in fixtures}


class Handler(BaseHTTPRequestHandler):
    def reply(self, status: int, body: dict | list) -> None:
        encoded = json.dumps(body, allow_nan=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        try:
            self.wfile.write(encoded)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            # Navigation/abort cancels polling requests; state remains intact.
            pass

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def dispatch(self, method: str) -> None:
        with PREVIEW_LOCK:
            self.dispatch_locked(method)

    def dispatch_locked(self, method: str) -> None:
        parts = urlsplit(self.path).path.strip("/").split("/")
        patients = self.server.patients
        journal.initialize(self.server)
        body = {}
        if method == 'POST' and int(self.headers.get('Content-Length', 0)):
            try:
                length = int(self.headers.get('Content-Length', 0))
                if length > 8192: raise ValueError()
                body = json.loads(self.rfile.read(length))
                if not isinstance(body, dict): raise ValueError()
            except (ValueError, TypeError):
                self.reply(400, {'error': 'Invalid demo workflow body'})
                return
        if method == "GET" and parts == ["health"]:
            self.reply(200, {"status": "ok", "mode": "preview", "model_loaded": False})
        elif method == 'GET' and parts == ['api', 'worklist']:
            self.reply(200, [journal.latest(self.server, pid) for pid in patients])
        elif len(parts) in (3, 4) and parts[:2] == ['api', 'journal']:
            found = journal.find(self.server, parts[2])
            if not found:
                self.reply(404, {'error': 'Unknown saved prediction'})
                return
            pid, record = found
            if method == 'GET' and len(parts) == 3:
                self.reply(200, journal.view(self.server, pid, record))
            elif method == 'POST' and len(parts) == 4 and parts[3] == 'reviews':
                if body.get('action') not in ('reviewed','reopened') or not isinstance(body.get('note'), str) or not 0 < len(body['note'].strip()) <= 1000:
                    self.reply(400, {'error': 'Review action and a 1-1000 character note required'})
                    return
                record['reviews'].append({'recordedAt': journal.datetime.now(journal.timezone.utc).isoformat(), 'action': body['action'], 'note': body['note'].strip()})
                record['reviewState'] = 'reviewed' if body['action'] == 'reviewed' else 'awaiting_review'
                self.reply(200, journal.view(self.server, pid, record))
            else: self.reply(404, {'error': 'Unknown journal route'})
        elif len(parts) == 5 and parts[:3] == ['api','demo','patients'] and parts[3] in patients and parts[4] == 'follow-up' and method == 'POST':
            pid = parts[3]
            if not self.server.journal[pid]: self.reply(409, {'error': 'Save a scoring attempt first'})
            elif body.get('stage') not in ('partial','gap','complete'): self.reply(400, {'error': 'Unknown replay stage'})
            else: self.reply(200, journal.replay_future(self.server, pid, body['stage']))
        elif method == "GET" and parts == ["api", "patients"]:
            self.reply(200, [{"patientId": pid, "displayName": row["patient"]["displayName"]} for pid, row in patients.items()])
        elif len(parts) in (3, 4) and parts[:2] == ["api", "patients"] and parts[2] in patients:
            row = patients[parts[2]]
            suffix = parts[3] if len(parts) == 4 else ""
            if suffix == 'meal-simulations':
                if not hasattr(self.server, 'meal_simulations'): self.server.meal_simulations = {}
                saved = self.server.meal_simulations.setdefault(parts[2], [])
                if method == 'GET': self.reply(200, saved[:20])
                elif method == 'POST':
                    groups = body.get('categories')
                    weight = body.get('portionGrams')
                    previous = body.get('minutesSincePreviousMeal')
                    allowed = {'rice','noodle','bread','vegetable','animal_protein','fruit','dairy','root_or_corn'}
                    if (not isinstance(body.get('description'), str) or not 1 <= len(body['description'].strip()) <= 500
                        or not isinstance(groups, list) or any(not isinstance(g, str) or g not in allowed for g in groups) or len(set(groups)) != len(groups)
                        or type(weight) not in (int, float) or not math.isfinite(weight) or not 1 <= weight <= 2000
                        or type(previous) is not int or not 0 <= previous <= 1440):
                        self.reply(400, {'error':'Invalid meal fields'})
                        return
                    meal = {**row['currentMeal'], 'description':body['description'].strip(), 'selectedFoodCategories':groups, 'portionGrams':weight, 'minutesSincePreviousMeal':previous}
                    snapshot = {'patient':row['patient'], 'currentMeal':meal, 'cgmHistory':row['cgmHistory'], 'features':{}}
                    record = {'simulationId':str(uuid.uuid4()), 'mode':'meal_what_if', 'patientId':parts[2], 'createdAt':journal.datetime.now(journal.timezone.utc).isoformat(), 'baselineAt':meal['baselineAt'], 'meal':meal,
                        'prediction':{**row['prediction'], 'reason':'module_preview_no_model'}, 'features':{}, 'snapshot':snapshot,
                        'inputHash':hashlib.sha256(json.dumps(snapshot, sort_keys=True).encode()).hexdigest(), 'note':'Preview only; no fitted model inference available.'}
                    saved.insert(0, record)
                    self.reply(200, record)
                else: self.reply(404, {'error':'Unknown meal route'})
            elif method == 'GET' and suffix == 'readiness':
                self.reply(200, journal.readiness(self.server, parts[2]))
            elif method == 'GET' and suffix == 'journal':
                self.reply(200, [journal.view(self.server, parts[2], r) for r in self.server.journal[parts[2]]])
            elif method == "GET" and suffix in ("", "cgm", "prediction"):
                self.reply(200, {**row, 'journal': journal.latest(self.server, parts[2])} if not suffix else [*row['cgmHistory'], *self.server.followup[parts[2]].values()] if suffix == 'cgm' else row['prediction'])
            elif method == "POST" and suffix == "refresh":
                self.reply(200, journal.save(self.server, parts[2]))
            else:
                self.reply(404, {"error": "Preview route not found"})
        else:
            self.reply(404, {"error": "Unknown preview patient or route"})

    def do_GET(self):
        self.dispatch("GET")

    def do_POST(self):
        self.dispatch("POST")


class PreviewServer(ThreadingHTTPServer):
    # A workspace starts several independent polls in one burst. The stdlib's
    # small default backlog can refuse valid connections on a slower machine.
    request_queue_size = 64
    daemon_threads = True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=18081)
    args = parser.parse_args()
    server = PreviewServer((args.host, args.port), Handler)
    server.patients = load_patients()
    print(f"PREVIEW ONLY: http://{args.host}:{args.port}; scores remain unavailable", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
