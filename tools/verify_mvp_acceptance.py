"""Acceptance checks against an explicitly selected synthetic Docker test stack.

Run baseline, workflow, outage, recovery, then persistence around a scoped restart.
This writes test scoring attempts, fictional follow-up and TEST ONLY review notes.
It never deletes records or controls Docker itself.
"""
import argparse
import copy
import json
import math
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--phase', required=True, choices=['baseline', 'workflow', 'outage', 'recovery', 'persistence'])
parser.add_argument('--api', default='http://localhost:8080/api')
parser.add_argument('--evidence', type=Path, required=True)
parser.add_argument('--project', default='glucotwin-mvp-proof', help='Evidence label for the isolated Compose project')
args = parser.parse_args()
report = json.loads(args.evidence.read_text(encoding='utf-8')) if args.evidence.exists() else {
    'project': args.project, 'synthetic': True, 'startedAtUtc': datetime.now(timezone.utc).isoformat(), 'checks': [], 'patients': {}
}


def request(path, body=None, expected=200):
    req = Request(args.api + path, data=json.dumps(body).encode() if body is not None else None,
                  headers={'Content-Type': 'application/json'})
    try:
        with urlopen(req, timeout=20) as response:
            status, raw = response.status, response.read()
    except HTTPError as error:
        status, raw = error.code, error.read()
    assert status == expected, f'{path}: expected HTTP {expected}, got {status}'
    return json.loads(raw) if raw else None


def check(name, condition, detail=None):
    report['checks'].append({'phase': args.phase, 'name': name, 'passed': bool(condition), 'detail': detail})
    print(f'{"PASS" if condition else "FAIL"} {name}', flush=True)
    assert condition, f'{name}: {detail}'


def record(pid):
    return request('/journal/' + report['patients'][pid]['originalId'])


try:
    if args.phase not in ('baseline', 'persistence'):
        for pid in report['patients']:
            assert record(pid)['snapshot'] == report['patients'][pid]['original']['snapshot'], 'API does not match this acceptance run; refusing test writes'
    if args.phase == 'baseline':
        for attempt in range(60):
            try:
                if all(request(f'/patients/{pid}/readiness')['historyReady'] for pid in ['DEMO-001', 'DEMO-002']):
                    break
            except (OSError, AssertionError, TimeoutError):
                pass
            time.sleep(1)
        else:
            raise AssertionError('The two synthetic input histories did not become ready')
        for pid, baseline, expected_score in [('DEMO-001', 142, .3677653238267805), ('DEMO-002', 190, .9887812722077698)]:
            if pid in report['patients']:
                check(pid + ' baseline evidence still addressable', record(pid)['snapshot'] == report['patients'][pid]['original']['snapshot'])
                continue
            before = request(f'/patients/{pid}')
            check(pid + ' fresh journal', request(f'/patients/{pid}/journal') == [])
            check(pid + ' nine pre-meal inputs', len(before['cgmHistory']) == 9)
            request(f'/patients/{pid}/refresh', {})
            saved = request(f'/patients/{pid}/journal')[0]
            report['patients'][pid] = {'originalId': saved['predictionId'], 'original': copy.deepcopy(saved)}
            pred = saved['prediction']
            check(pid + ' actual fitted inference', pred['status'] == 'available' and math.isclose(pred['model_score'], expected_score, abs_tol=1e-10), pred)
            check(pid + ' model version and factors', pred['model_version'] == 'shanghai-logistic-v1' and len(pred['top_factors']) == 5)
            check(pid + ' frozen baseline and prospective receipt order', saved['baselineGlucoseMgDl'] == baseline and saved['prospective'] is True)
            check(pid + ' follow-up initially unknown', saved['outcome']['eventObserved'] is None and saved['outcome']['receivedSamples'] == 0)
        request('/patients/NOT-A-PATIENT', expected=400)
        check('Unknown patient rejected', True)

    elif args.phase == 'workflow':
        pid = 'DEMO-001'
        for stage, count in [('partial', 3), ('gap', 7), ('complete', 8)]:
            if any(c['name'] == f'{stage} replay does not invoke model' and c['passed'] for c in report['checks']):
                continue
            replay = request(f'/demo/patients/{pid}/follow-up', {'stage': stage})
            saved = record(pid)
            check(f'{stage} future coverage', saved['outcome']['receivedSamples'] == count, saved['outcome'])
            check(f'{stage} outcome semantics', saved['outcome']['eventObserved'] is (False if count == 8 else None))
            check(f'{stage} replay does not invoke model', replay['modelScored'] is False and len(request(f'/patients/{pid}/journal')) == 1)
        repeat = request(f'/demo/patients/{pid}/follow-up', {'stage': 'complete'})
        check('Follow-up replay idempotency', repeat['accepted'] == 0 and repeat['duplicates'] == 8)
        request('/demo/patients/DEMO-002/follow-up', {'stage': 'partial'})
        check('Positive observation detected before complete coverage', record('DEMO-002')['outcome']['eventObserved'] is True)
        for pid in report['patients']:
            saved = record(pid)
            original = report['patients'][pid]['original']
            check(pid + ' frozen snapshot survives follow-up', saved['snapshot'] == original['snapshot'] and saved['inputHash'] == original['inputHash'] and saved['prediction'] == original['prediction'])
            check(pid + ' overview excludes future model inputs', len(request(f'/patients/{pid}')['cgmHistory']) == 9)
            event = copy.deepcopy(request(f'/patients/{pid}/cgm')[0])
            event = {key: event[key] for key in ['eventId', 'observedAt', 'glucoseMgDl', 'source']}
            event['patientId'] = pid
            count = len(request(f'/patients/{pid}/cgm'))
            request('/cgm/events', event, expected=202)
            check(pid + ' exact duplicate does not grow history', len(request(f'/patients/{pid}/cgm')) == count)
            event['glucoseMgDl'] += 1
            request('/cgm/events', event, expected=409)
            check(pid + ' conflicting duplicate rejected without replacement', len(request(f'/patients/{pid}/cgm')) == count and record(pid)['inputChanged'] is False)
            request('/journal/' + saved['predictionId'] + '/reviews', {'action': 'reviewed', 'note': 'TEST ONLY: MVP acceptance reviewed fictional samples; not a clinical assessment.'})
            request('/journal/' + saved['predictionId'] + '/reviews', {'action': 'reopened', 'note': 'TEST ONLY: verify append-only reopen history.'})
            check(pid + ' append-only reviews', [r['action'] for r in record(pid)['reviews']] == ['reviewed', 'reopened'])

    elif args.phase == 'outage':
        pred = request('/patients/DEMO-001/refresh', {})
        saved = request('/patients/DEMO-001/journal')[0]
        report['outage'] = saved
        check('Real unavailable inference saved', pred['status'] == 'unavailable' and saved['prediction']['status'] == 'unavailable')
        check('Outage does not invent score or classification', pred['model_score'] is None and pred['predicted_event'] is None and not pred['top_factors'], pred)
        check('Original available result retained', record('DEMO-001')['prediction'] == report['patients']['DEMO-001']['original']['prediction'])

    elif args.phase == 'recovery':
        for attempt in range(60):
            try:
                if request('/patients/DEMO-001/readiness')['model']['status'] == 'ready':
                    break
            except (OSError, AssertionError, TimeoutError):
                pass
            time.sleep(1)
        else:
            raise AssertionError('Model health did not recover')
        pred = request('/patients/DEMO-001/refresh', {})
        check('Real inference recovers', pred['status'] == 'available' and math.isclose(pred['model_score'], .3677653238267805, abs_tol=1e-10))
        check('Available/unavailable/recovered versions retained', len(request('/patients/DEMO-001/journal')) == 3)
        check('Outage record remains unavailable', request('/journal/' + report['outage']['predictionId'])['prediction']['model_score'] is None)
        report['beforeRestart'] = {pid: request(f'/patients/{pid}/journal') for pid in report['patients']}

    elif args.phase == 'persistence':
        for attempt in range(60):
            try:
                request('/patients')
                break
            except (OSError, AssertionError, TimeoutError):
                pass
            time.sleep(1)
        else:
            raise AssertionError('API did not recover after restart')
        for pid, expected in report['beforeRestart'].items():
            actual = request(f'/patients/{pid}/journal')
            check(pid + ' all journal state persists across restart', actual == expected)
            check(pid + ' original record still addressable', record(pid)['predictionId'] == report['patients'][pid]['originalId'])

    report['lastCompletedPhase'] = args.phase
finally:
    report['updatedAtUtc'] = datetime.now(timezone.utc).isoformat()
    args.evidence.parent.mkdir(parents=True, exist_ok=True)
    args.evidence.write_text(json.dumps(report, indent=2), encoding='utf-8')
