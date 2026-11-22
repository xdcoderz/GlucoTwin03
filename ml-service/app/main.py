from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd
import sklearn
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from .twin_engine import TwinRequest, calculate as calculate_twin

FEATURE_NAMES = [
    "baseline_glucose_mg_dl", "glucose_lag_15_min_mg_dl", "glucose_lag_30_min_mg_dl",
    "glucose_lag_60_min_mg_dl", "glucose_lag_120_min_mg_dl",
    "glucose_change_prev_15_min_mg_dl", "glucose_change_prev_30_min_mg_dl",
    "glucose_change_prev_60_min_mg_dl", "glucose_change_prev_120_min_mg_dl",
    "glucose_mean_prev_120_min_mg_dl", "glucose_std_prev_120_min_mg_dl",
    "glucose_min_prev_120_min_mg_dl", "glucose_max_prev_120_min_mg_dl",
    "glucose_range_prev_120_min_mg_dl", "glucose_observations_prev_120_min",
    "meal_hour_sin", "meal_hour_cos", "meal_is_weekend", "minutes_since_previous_meal",
    "reported_food_weight_g", "food_items_with_reported_weight", "meal_text_length_characters",
    "meal_contains_rice", "meal_contains_noodle", "meal_contains_bread", "meal_contains_fruit",
    "meal_contains_vegetable", "meal_contains_animal_protein", "meal_contains_dairy",
    "meal_contains_root_or_corn", "csii_bolus_insulin_iu_at_meal",
    "csii_basal_insulin_iu_per_hour_at_meal", "has_recorded_csii_bolus_at_meal",
    "has_recorded_csii_basal_setting_at_meal", "has_recorded_subcutaneous_insulin_at_meal",
    "has_recorded_non_insulin_medication_at_meal", "has_recorded_intravenous_insulin_at_meal",
    "sex_female", "age_years", "bmi_kg_m2", "diabetes_duration_years", "hba1c_percent",
    "fasting_plasma_glucose_mg_dl",
]

MODEL_PATH = Path(os.getenv("MODEL_PATH", "/app/artifacts/logistic_regression.joblib"))
METADATA_PATH = Path(os.getenv("MODEL_METADATA_PATH", "/app/artifacts/model_metadata.json"))
app = FastAPI(title="GlucoTwin research model service", version="0.1.0")


@app.post("/twin/forecast")
def twin_forecast(request: TwinRequest) -> dict:
    try:
        return calculate_twin(request)
    except (ValueError, ArithmeticError, np.linalg.LinAlgError) as exc:
        raise HTTPException(status_code=503, detail="twin_numerical_failure") from exc

model = None
metadata: dict = {}
load_error: str | None = None


class PredictionRequest(BaseModel):
    features: dict[str, Optional[float]]
    horizon_minutes: int = Field(default=120)


@app.exception_handler(RequestValidationError)
async def request_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Keep malformed internal prediction requests diagnosable without logging health data."""
    errors = [{"loc": list(error["loc"]), "type": error["type"]} for error in exc.errors()]
    print(f"Prediction request validation failed: {len(errors)} field error(s)", flush=True)
    return JSONResponse(status_code=422, content={"detail": errors})


@app.on_event("startup")
def load_model() -> None:
    global model, metadata, load_error
    try:
        metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
        actual_hash = hashlib.sha256(MODEL_PATH.read_bytes()).hexdigest()
        expected_hash = str(metadata.get("artifactSha256", "")).lower()
        if not expected_hash or actual_hash.lower() != expected_hash:
            raise ValueError("model artifact SHA-256 does not match metadata")
        expected_version = str(metadata.get("trainingRun", {}).get("scikitLearnVersion", ""))
        if expected_version and sklearn.__version__ != expected_version:
            raise ValueError(f"scikit-learn version mismatch: expected {expected_version}, got {sklearn.__version__}")
        candidate = joblib.load(MODEL_PATH)
        if getattr(candidate, "n_features_in_", None) != len(FEATURE_NAMES):
            raise ValueError("model feature count does not match the 43-feature contract")
        if list(getattr(candidate, "feature_names_in_", [])) != FEATURE_NAMES:
            raise ValueError("model feature names/order do not match FEATURE_NAMES")
        steps = getattr(candidate, "named_steps", {})
        if not all(name in steps for name in ("imputer", "scaler", "classifier")):
            raise ValueError("model artifact does not contain the expected preprocessing pipeline")
        model = candidate
        load_error = None
    except Exception as exc:
        model = None
        load_error = str(exc)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model_loaded": model is not None, "model_version": metadata.get("modelVersion"), "reason": load_error}


@app.post("/predict")
def predict(request: PredictionRequest) -> dict:
    if model is None:
        raise HTTPException(status_code=503, detail={"status": "unavailable", "reason": "model_unavailable"})
    if request.horizon_minutes != 120:
        raise HTTPException(status_code=422, detail="Only the documented 120-minute horizon is supported")
    supplied = set(request.features)
    expected = set(FEATURE_NAMES)
    missing = sorted(expected - supplied)
    extra = sorted(supplied - expected)
    if missing or extra:
        raise HTTPException(status_code=422, detail={"missing_features": missing, "unexpected_features": extra})
    row = {name: request.features[name] for name in FEATURE_NAMES}
    invalid = [name for name, value in row.items() if value is not None and not np.isfinite(value)]
    if invalid:
        raise HTTPException(status_code=422, detail={"non_finite_features": invalid})
    frame = pd.DataFrame([row], columns=FEATURE_NAMES, dtype=float)
    try:
        probabilities = model.predict_proba(frame)[0]
        classes = list(model.named_steps["classifier"].classes_)
        score = float(probabilities[classes.index(1)])
        threshold = float(metadata.get("decision_threshold", 0.5))
        transformed = model[:-1].transform(frame)
        coefficients = np.asarray(model.named_steps["classifier"].coef_[0], dtype=float)
        imputer = model.named_steps["imputer"]
        transformed_names = list(imputer.get_feature_names_out(FEATURE_NAMES))
        contributions = np.asarray(transformed[0], dtype=float) * coefficients
        if not np.isfinite(score) or not 0 <= score <= 1 or threshold != 0.5 or not np.all(np.isfinite(contributions)):
            raise ValueError("invalid model output")
        ranked = sorted(range(len(contributions)), key=lambda i: abs(contributions[i]), reverse=True)[:5]
        factors = [
            {
                "feature": transformed_names[i],
                "contribution": float(contributions[i]),
                "direction": "up" if contributions[i] >= 0 else "down",
            }
            for i in ranked
        ]
    except Exception as exc:
        raise HTTPException(status_code=503, detail={"status": "unavailable", "reason": "model_scoring_failed"}) from exc
    return {
        "status": "available",
        "model_score": score,
        "horizon_minutes": 120,
        "threshold": threshold,
        "predicted_event": score >= threshold,
        "model_version": metadata.get("modelVersion", "unknown"),
        "top_factors": factors,
    }
