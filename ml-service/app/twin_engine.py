"""Causal, bounded research adapter for Tanmay's MIT six-state twin.

No external model pickle is loaded. Each result is reproducible from its saved
input prefix. Scenario controls never change the assimilated patient state.
"""
from datetime import datetime, timedelta
import hashlib
import json
import numpy as np
from pydantic import BaseModel, ConfigDict, Field, AwareDatetime, model_validator
from .upstream import model as M

VERSION = "physiology-ukf-1"


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class Reading(StrictModel):
    observedAt: AwareDatetime
    glucoseMgDl: float = Field(ge=40, le=500)


class Context(StrictModel):
    observedAt: AwareDatetime
    carbsGrams: float | None = Field(default=None, ge=0, le=200)
    slowFraction: float = Field(default=.5, ge=0, le=1)
    stepsPer5Min: float | None = Field(default=None, ge=0, le=1500)
    heartRateBpm: float | None = Field(default=None, ge=25, le=250)
    hrvMs: float | None = Field(default=None, ge=0, le=400)
    sleepHours: float | None = Field(default=None, ge=0, le=24)


class Scenario(StrictModel):
    carbsGrams: float = Field(default=0, ge=0, le=200)
    slowFraction: float = Field(default=.5, ge=0, le=1)
    walkMinutes: int = Field(default=0, ge=0, le=120, multiple_of=5)


class TwinRequest(StrictModel):
    patientId: str = Field(min_length=1, max_length=80)
    origin: AwareDatetime
    referenceGlucose: float = Field(ge=40, le=400)
    hba1c: float = Field(default=7, ge=3, le=20)
    readings: list[Reading] = Field(max_length=5000)
    context: list[Context] = Field(default_factory=list, max_length=1000)
    scenario: Scenario = Field(default_factory=Scenario)

    @model_validator(mode="after")
    def validate_history(self):
        times = [r.observedAt for r in self.readings]
        if times != sorted(set(times)):
            raise ValueError("Readings must have unique increasing timestamps")
        if any(t > self.origin for t in times) or any(c.observedAt > self.origin for c in self.context):
            raise ValueError("Future observations cannot enter a forecast")
        if times and (self.origin-times[0]).total_seconds() > 14*86400:
            raise ValueError("Use at most 14 days of history")
        if any((self.origin-t).total_seconds() % 300 for t in times):
            raise ValueError("Reading timestamps must align to a five-minute grid")
        if any((self.origin-c.observedAt).total_seconds() % 300 for c in self.context):
            raise ValueError("Context timestamps must align to a five-minute grid")
        return self


def metrics(readings):
    """AlgoAura-inspired metrics; durations exclude gaps >30 min and final hold.

    Short histories report descriptive metrics only; GMI requires >=14 days
    and >=70% duration coverage. No zero values substituted for absent data.
    """
    if len(readings) < 2:
        return {"status": "insufficient_data", "gmi": None}
    g = np.array([r.glucoseMgDl for r in readings])
    dt = np.diff([r.observedAt.timestamp()/60 for r in readings])
    weights = np.where(dt <= 30, dt, 0)
    total = float(weights.sum())
    span = float(dt.sum())
    if total <= 0:
        return {"status": "insufficient_data", "gmi": None}
    mean = float(np.average(g[:-1], weights=weights))
    sd = float(np.sqrt(np.average((g[:-1]-mean)**2, weights=weights)))
    pct = lambda mask: float(weights[mask].sum()/total*100)
    return dict(status="available", observedMinutes=total, spanMinutes=span,
                coveragePercent=100*total/span, sampleCount=len(g), meanGlucose=mean,
                cv=100*sd/mean, tir=pct((g[:-1]>=70)&(g[:-1]<=180)),
                tar=pct(g[:-1]>180), tbr=pct(g[:-1]<70),
                gmi=3.31+.02392*mean if span>=14*1440 and total/span>=.7 else None,
                method="Time weighted; gaps over 30 minutes excluded; no extrapolation beyond last sample.")


def grid(req):
    start = req.readings[0].observedAt
    n = int((req.origin-start).total_seconds()/300)+1
    cg = np.full(n, np.nan)
    steps = np.zeros(n)
    meals = []
    for row in req.readings:
        cg[int((row.observedAt-start).total_seconds()/300)] = row.glucoseMgDl
    for row in req.context:
        i = int((row.observedAt-start).total_seconds()/300)
        if i < 0 or i >= n:
            continue
        if row.carbsGrams is not None:
            meals.append((i, row.carbsGrams, row.slowFraction))
        if row.stepsPer5Min is not None and i>0:
            # Counts describe the interval ending at the observation timestamp.
            # They inform the state update at i, never an earlier forecast.
            steps[i-1] = row.stepsPer5Min
    return dict(cgm=cg, steps=steps, meals=meals, static={"hba1c": req.hba1c}), start


def fit_parameters(p, end, reference, mu, sd, start=0):
    # Require five complete four-hour meal windows, at least 9 real observations
    # per window and no missing interval longer than 30 minutes.
    segments = []
    for t, *_ in p["meals"]:
        lo, hi = t-6, t-6+48
        if lo < start or hi > end:
            continue
        indices = np.flatnonzero(np.isfinite(p["cgm"][lo:hi]))
        if len(indices)>=9 and indices[0]==0 and indices[-1]>=42 and np.max(np.diff(indices))<=6:
            segments.append(lo)
    segments = sorted(set(segments))
    if len(segments)<5:
        return np.exp(mu), np.diag(sd**2), False
    from scipy.optimize import least_squares
    y = np.array([p["cgm"][s:s+48] for s in segments])
    activity = np.array([M.ex_of(p["steps"][s:s+48]) for s in segments])
    fast, slow = np.zeros(y.shape), np.zeros(y.shape)
    for j, s in enumerate(segments):
        for t, carbs, fraction in p["meals"]:
            if s<=t<s+48:
                fast[j,t-s]+=carbs*(1-fraction)
                slow[j,t-s]+=carbs*fraction
    mask=np.isfinite(y)
    def residual(logth):
        th=np.exp(logth)
        state=np.zeros((len(segments),6));state[:,0]=y[:,0]
        state[:,1]=th[0]*np.maximum(y[:,0]-reference,0)
        predicted=np.empty_like(y)
        for k in range(48):
            state[:,2]+=fast[:,k];state[:,4]+=slow[:,k]
            predicted[:,k]=state[:,0]
            state=M.step(state,th,reference,activity[:,k])
        return np.r_[((predicted-y)/8)[mask], (logth-mu)/sd]
    fit=least_squares(residual,mu,loss="soft_l1",f_scale=2,max_nfev=80,
                      bounds=(np.log([1e-5,.001,.01]),np.log([.002,.05,.12])))
    if not fit.success:
        return np.exp(mu), np.diag(sd**2), False
    return np.exp(fit.x),np.linalg.inv(fit.jac.T@fit.jac+1e-6*np.eye(3)),True


def calculate(req: TwinRequest):
    summary=metrics(req.readings)
    if len(req.readings)<2 or req.readings[-1].observedAt != req.origin:
        return dict(status="insufficient_data",reason="Select an observed reading with preceding history.",metrics=summary)
    if (req.readings[-1].observedAt-req.readings[-2].observedAt).total_seconds()>1800:
        return dict(status="insufficient_data",reason="A gap over 30 minutes requires another reading.",metrics=summary)
    p,start=grid(req); cg=p["cgm"]; n=len(cg); gb=req.referenceGlucose
    # Fixed initial calibration prefix: subsequent observations cannot change
    # earlier forecasts. Four days follows the upstream design.
    cal_end=4*288
    mu,sd=M.prior_for(p["static"])
    th,cov,fitted=fit_parameters(p,min(n,cal_end),gb,mu,sd) if n>cal_end else (np.exp(mu),np.diag(sd**2),False)
    ukf=M.UKF(th,gb,cg[0]);states=np.zeros((n,6));raw=np.zeros((n,24))
    by_i={}
    for meal in p["meals"]: by_i.setdefault(meal[0],[]).append(meal)
    events=[];versions=[dict(index=0,parameters=th.tolist(),status="patient_fit" if fitted else "prior")]
    last_seen=0;last_refit=cal_end;errors=[];prior=float(cg[0]);nis=None
    segment_start=0;segment_starts=np.zeros(n,dtype=int)
    for i in range(n):
        if i:
            ukf.predict(float(M.ex_of(p["steps"][i-1])))
            prior=float(ukf.x[0])
            if np.isfinite(cg[i]):
                if i-last_seen>6:
                    ukf=M.UKF(th,gb,cg[i]);segment_start=i
                    events.append(dict(index=i,type="gap_reset"))
                else:
                    innovation,variance=ukf.update(cg[i]);nis=float(innovation**2/variance)
                last_seen=i
        for _,carbs,slow in by_i.get(i,[]): ukf.meal(carbs,slow)
        segment_starts[i]=segment_start;states[i]=ukf.x;raw[i]=M.rollout(ukf.x,th,gb)
        if i>=12 and i-12>=segment_start and np.isfinite(cg[i]) and np.isfinite(cg[i-12]):
            errors.append((i,float(cg[i]-raw[i-12,11])))
        # Compare matured 60-min errors with calibration bias, never future labels.
        if fitted and i>cal_end and i-last_refit>=288:
            base=[e for j,e in errors if j<cal_end]
            recent=[e for j,e in errors if i-288<j<=i]
            if len(base)>=24 and len(recent)>=24 and abs(np.mean(recent)-np.mean(base))>12:
                new,newcov,ok=fit_parameters(p,i+1,gb,np.log(th),np.full(3,.5),max(0,i-864))
                events.append(dict(index=i,type="recalibrated" if ok else "drift_insufficient_history",
                                   biasShift=float(np.mean(recent)-np.mean(base))))
                last_refit=i
                if ok:
                    th,cov=new,newcov;ukf.th=tuple(th)
                    versions.append(dict(index=i,parameters=th.tolist(),status="recalibrated"))
                    raw[i]=M.rollout(ukf.x,th,gb)
    # Residual correction learns only the initial calibration prefix. It is
    # disabled after parameter changes until a fresh evaluation is available.
    corrected=raw.copy();residual_status="insufficient_history"
    if fitted and n>cal_end:
        features=M.base_feats(p,states,gb);models={}
        for h in M.H:
            idx=np.arange(24,cal_end-h)
            ok=np.isfinite(cg[idx+h])&np.isfinite(cg[idx])&(segment_starts[idx+h]==segment_starts[idx])
            if ok.sum()<40: break
            models[h]=M.ridge(M.hfeat(features,raw,states,h)[idx][ok],(cg[idx+h]-raw[idx,h-1])[ok])
        if len(models)==3:
            corrected,_=M.apply_resid(models,features,raw,states);residual_status="ridge_calibration_only"
            if len(versions)>1:
                corrected[versions[1]["index"]:]=raw[versions[1]["index"]:]
                residual_status="disabled_after_recalibration"
    evaluation=[]
    for h in M.H:
        idx=np.arange(cal_end,max(cal_end,n-h))
        ok=np.isfinite(cg[idx])&np.isfinite(cg[idx+h])&(segment_starts[idx+h]==segment_starts[idx])
        idx=idx[ok]
        evaluation.append(dict(minutes=h*5,count=len(idx),
            mae=float(np.mean(abs(corrected[idx,h-1]-cg[idx+h]))) if len(idx) else None,
            persistenceMae=float(np.mean(abs(cg[idx]-cg[idx+h]))) if len(idx) else None))
    # Paired draws ensure scenario differences reflect controls, not new noise.
    rng=np.random.default_rng(42)
    sampled_th=np.exp(rng.multivariate_normal(np.log(th),cov,size=96))
    sampled_th=np.clip(sampled_th,[1e-5,.001,.01],[.002,.05,.12])
    eigen,vec=np.linalg.eigh((ukf.P+ukf.P.T)/2)
    sampled=ukf.x+rng.normal(size=(96,6))@(vec*np.sqrt(np.maximum(eigen,1e-12))).T
    sampled[:,1:]=np.maximum(sampled[:,1:],0)
    baseline=M.rollout(sampled,tuple(sampled_th.T),gb)
    altered=sampled.copy();scenario=req.scenario
    altered[:,2]+=scenario.carbsGrams*(1-scenario.slowFraction)
    altered[:,4]+=scenario.carbsGrams*scenario.slowFraction
    activity=np.array([.5 if k*5<scenario.walkMinutes else 0 for k in range(24)])
    comparison=M.rollout(altered,tuple(sampled_th.T),gb,e=activity)
    center=ukf.x.copy();center[2]+=scenario.carbsGrams*(1-scenario.slowFraction);center[4]+=scenario.carbsGrams*scenario.slowFraction
    correction=corrected[-1]-raw[-1]
    scenario_mean=M.rollout(center,th,gb,e=activity)+correction
    baseline+=correction;comparison+=correction
    curve=[]
    for k in range(24):
        low,high=np.quantile(baseline[:,k],[.05,.95]);sl,sh=np.quantile(comparison[:,k],[.05,.95])
        curve.append(dict(minutes=(k+1)*5,baseline=float(corrected[-1,k]),scenario=float(scenario_mean[k]),
                          lower=float(low),upper=float(high),scenarioLower=float(sl),scenarioUpper=float(sh)))
    fingerprint=hashlib.sha256(req.model_dump_json().encode()).hexdigest()
    result=dict(status="available",modelVersion=VERSION,inputHash=fingerprint,patientId=req.patientId,
                origin=req.origin.isoformat(),calibration="patient_fit" if fitted else "prior_parameters",
                calibrationRequirement="Four days and at least five complete logged meal windows.",
                parameters=th.tolist(),parameterCovariance=cov.tolist(),state=ukf.x.tolist(),stateCovariance=ukf.P.tolist(),
                measured=float(cg[-1]),prior=prior,corrected=float(ukf.x[0]),innovationNis=nis,
                residualStatus=residual_status,versions=versions,events=events,curve=curve,
                horizons=[curve[h-1] for h in M.H],evaluation=evaluation,metrics=summary,
                wearableContext=[c.model_dump(mode="json") for c in req.context if c.heartRateBpm is not None or c.hrvMs is not None or c.sleepHours is not None],
                assumptions=["Research simulation; not a validated clinical forecast.",
                             "90% parameter/state simulation bands, not validated prediction intervals.",
                             "Unknown historical meals and activity are omitted, not inferred from food weight.",
                             "HR, HRV and sleep are context only; steps affect the assumed exercise term.",
                             "Medication and insulin doses are not simulated."])
    # Fail closed on numerical divergence rather than serialize NaN/Infinity.
    json.dumps(result,allow_nan=False)
    return result
