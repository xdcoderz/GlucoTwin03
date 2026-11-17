import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone
import numpy as np
import pytest
from pydantic import ValidationError

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app.twin_engine import TwinRequest, Reading, calculate, metrics
from app.upstream import model as M

START=datetime(2026,10,1,tzinfo=timezone.utc)

def short(**updates):
    body=dict(patientId="TEST-001",origin=START+timedelta(minutes=120),referenceGlucose=130,
              readings=[dict(observedAt=START+timedelta(minutes=i*15),glucoseMgDl=130+i*2) for i in range(9)])
    body.update(updates)
    return TwinRequest(**body)


def test_short_history_is_prior_and_scenarios_do_not_mutate_state():
    base=calculate(short())
    meal=calculate(short(scenario=dict(carbsGrams=40)))
    walk=calculate(short(scenario=dict(carbsGrams=40,walkMinutes=30)))
    assert base["calibration"]=="prior_parameters"
    assert base["state"]==meal["state"]==walk["state"]
    assert meal["curve"][5]["scenario"]>meal["curve"][5]["baseline"]
    assert walk["curve"][5]["scenario"]<meal["curve"][5]["scenario"]
    assert all(p["baseline"]==p["scenario"] for p in base["curve"])
    assert calculate(short())==base
    assert base["metrics"]["gmi"] is None
    assert all(row["count"]==0 and row["mae"] is None for row in base["evaluation"])
    assert np.linalg.eigvalsh(base["stateCovariance"]).min()>-1e-8


def test_context_meal_and_activity_affect_state_without_using_wearable_as_glucose():
    context=[dict(observedAt=START+timedelta(minutes=60),carbsGrams=30,heartRateBpm=80)]
    meal=calculate(short(context=context))
    plain=calculate(short())
    changed=calculate(short(context=[{**context[0],"heartRateBpm":120}]))
    assert meal["state"]!=plain["state"]
    assert changed["state"]==meal["state"]
    assert changed["wearableContext"][0]["heartRateBpm"]==120


def test_rejects_future_duplicate_nonfinite_and_off_grid_data():
    body=short().model_dump()
    for rows in [body["readings"]+[body["readings"][-1]],
                 body["readings"]+[dict(observedAt=START+timedelta(minutes=135),glucoseMgDl=180)],
                 [dict(observedAt=START+timedelta(minutes=1),glucoseMgDl=140)],
                 [dict(observedAt=START,glucoseMgDl=float('nan'))]]:
        with pytest.raises(ValidationError): TwinRequest(**{**body,"readings":rows})
    with pytest.raises(ValidationError):short(context=[dict(observedAt=START+timedelta(days=1),carbsGrams=30)])


def test_missing_data_does_not_invent_glucose():
    req=short();req.readings=req.readings[:2]+req.readings[-1:]
    assert calculate(req)["status"]=="insufficient_data"
    req.readings.insert(-1,Reading(observedAt=START+timedelta(minutes=105),glucoseMgDl=142))
    result=calculate(req)
    assert result["status"]=="available"
    assert any(e["type"]=="gap_reset" for e in result["events"])


def test_time_weighted_metrics_and_boundary_values():
    rows=[Reading(observedAt=START+timedelta(minutes=m),glucoseMgDl=g) for m,g in [(0,70),(5,180),(20,200),(65,60),(70,100)]]
    result=metrics(rows)
    assert result["observedMinutes"]==25
    assert result["tir"]==80
    assert result["tbr"]==20
    assert result["tar"]==0 # 45-minute gap not counted
    assert result["gmi"] is None


def generated_history(days=5):
    """Model-generated test fixture, never external validation evidence."""
    th=(.0004,.015,.035);s=np.array([130.,0,0,0,0,0]);rows=[];context=[]
    for i in range(days*288+1):
        now=START+timedelta(minutes=i*5)
        if i%288 in (90,150,222):
            context.append(dict(observedAt=now,carbsGrams=35,slowFraction=.5))
            s[2]+=17.5;s[4]+=17.5
        rows.append(dict(observedAt=now,glucoseMgDl=float(s[0])))
        s=M.step(s,th,130)
    return dict(patientId="TEST-LONG",origin=rows[-1]["observedAt"],referenceGlucose=130,readings=rows,context=context)


def test_calibration_residual_and_chronological_evaluation():
    req=TwinRequest(**generated_history())
    result=calculate(req)
    assert result["calibration"]=="patient_fit"
    assert result["residualStatus"]=="ridge_calibration_only"
    assert result["evaluation"][0]["count"]>0
    assert all(row["mae"] is not None for row in result["evaluation"])
    # Last measurement cannot change calibration parameters fitted on first four days.
    changed=req.model_copy(deep=True);changed.readings[-1].glucoseMgDl+=5
    assert calculate(changed)["parameters"]==result["parameters"]


def test_fastapi_contract_rejects_bad_inputs_and_returns_serializable_forecast():
    from fastapi.testclient import TestClient
    from app.main import app
    client=TestClient(app)
    good=client.post('/twin/forecast',json=short().model_dump(mode='json'))
    assert good.status_code==200
    assert len(good.json()['curve'])==24
    body=short().model_dump(mode='json');body['scenario']['walkMinutes']=7
    assert client.post('/twin/forecast',json=body).status_code==422


def test_drift_recalibration_preserves_zero_scenario_and_past_results():
    body=generated_history(6)
    for i,row in enumerate(body['readings']):
        if i>=4*288:row['glucoseMgDl']+=65
    result=calculate(TwinRequest(**body))
    assert any(event['type']=='recalibrated' for event in result['events'])
    assert result['residualStatus']=='disabled_after_recalibration'
    assert all(abs(row['baseline']-row['scenario'])<1e-8 for row in result['curve'])
    assert len(result['versions'])>1
