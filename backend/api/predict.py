"""
predict.py
----------
Loads the five trained DeltaMind AI models once at startup and exposes
a `run_prediction()` function that turns a validated input payload into
a dict of AI-generated predictions. No hardcoded if/else climate rules
live here -- every number comes out of a trained model.
"""

import os
import joblib
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(HERE, "..", "models")

FEATURE_ORDER = [
    "temperature_increase_c",
    "sea_level_rise_m",
    "rainfall_change_pct",
    "cyclone_intensity_index",
    "humidity_pct",
    "river_overflow_index",
    "deforestation_pct",
]

_flood_model = joblib.load(os.path.join(MODELS_DIR, "flood_model.pkl"))
_crop_model = joblib.load(os.path.join(MODELS_DIR, "crop_model.pkl"))
_migration_model = joblib.load(os.path.join(MODELS_DIR, "migration_model.pkl"))
_disease_bundle = joblib.load(os.path.join(MODELS_DIR, "disease_model.pkl"))  # {"model", "scaler"}
_economic_model = joblib.load(os.path.join(MODELS_DIR, "economic_model.pkl"))

print("[predict.py] All 5 DeltaMind AI models loaded successfully.")


def _to_vector(payload: dict) -> np.ndarray:
    return np.array([[payload[f] for f in FEATURE_ORDER]], dtype=float)


def run_prediction(payload: dict) -> dict:
    X = _to_vector(payload)

    flood_risk_pct = float(np.clip(_flood_model.predict(X)[0], 0, 100))
    crop_loss_pct = float(np.clip(_crop_model.predict(X)[0], 0, 100))
    migration_people = int(max(0, _migration_model.predict(X)[0]))

    X_scaled = _disease_bundle["scaler"].transform(X)
    disease_risk_pct = float(np.clip(_disease_bundle["model"].predict(X_scaled)[0], 0, 100))

    economic_damage_usd = float(max(0, _economic_model.predict(X)[0]))

    # Simple derived severity classification (label only, not used to
    # compute the numbers themselves -- purely for UI color-coding).
    composite = 0.35 * flood_risk_pct + 0.25 * crop_loss_pct + 0.2 * disease_risk_pct + 0.2 * (
        min(100, economic_damage_usd / 4_000_000)
    )
    if composite < 30:
        severity = "safe"
    elif composite < 55:
        severity = "moderate"
    elif composite < 75:
        severity = "high"
    else:
        severity = "severe"

    return {
        "flood_risk_pct": round(flood_risk_pct, 2),
        "crop_loss_pct": round(crop_loss_pct, 2),
        "migration_people": migration_people,
        "disease_risk_pct": round(disease_risk_pct, 2),
        "economic_damage_usd": round(economic_damage_usd, 2),
        "severity": severity,
        "composite_score": round(composite, 2),
    }
