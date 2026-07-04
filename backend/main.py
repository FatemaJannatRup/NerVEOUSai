"""
main.py
-------
NerVEOUSai backend entrypoint. Run with:

    uvicorn main:app --reload --port 8000

Endpoints:
    POST /predict              -> run all 5 ML models on given inputs
    POST /predict/districts    -> per-district predictions for all 64 districts (map)
    POST /advice                -> AI-generated recommendations (Ollama, streaming-friendly)
    GET  /districts             -> static district metadata (division, coastal, coords)
    GET  /health                -> health check
"""

import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "api"))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from api.predict import run_prediction
from api.districts import DISTRICTS, severity_from_flood
from api.advice import generate_advice

app = FastAPI(
    title="NerVEOUSai",
    description="AI-powered Bangladesh future climate impact simulator",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # relax for hackathon/demo purposes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ClimateInput(BaseModel):
    temperature_increase_c: float = Field(..., ge=0, le=6)
    sea_level_rise_m: float = Field(..., ge=0, le=5)
    rainfall_change_pct: float = Field(..., ge=-20, le=60)
    cyclone_intensity_index: float = Field(..., ge=0, le=10)
    humidity_pct: float = Field(..., ge=0, le=100)
    river_overflow_index: float = Field(..., ge=0, le=100)
    deforestation_pct: float = Field(..., ge=0, le=100)


class AdviceInput(ClimateInput):
    district: str | None = None


@app.get("/health")
def health():
    return {"status": "ok", "service": "NerVEOUSai backend", "districts_loaded": len(DISTRICTS)}


@app.get("/districts")
def get_districts():
    return {"districts": DISTRICTS}


@app.post("/predict")
def predict(payload: ClimateInput):
    try:
        result = run_prediction(payload.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")


@app.post("/predict/districts")
def predict_districts(payload: ClimateInput):
    """
    Runs the global AI prediction once, then spreads it across all 64
    real Bangladesh districts using their vulnerability-derived
    multipliers, keyed by the exact ADM2_EN name used in the district
    boundary GeoJSON so the frontend can join predictions -> polygons
    directly by district name.
    """
    try:
        base = run_prediction(payload.model_dump())
        total_flood_mult = sum(d["flood_mult"] for d in DISTRICTS.values())
        out = {}
        for name, d in DISTRICTS.items():
            flood = min(100.0, round(base["flood_risk_pct"] * d["flood_mult"], 2))
            crop = min(100.0, round(base["crop_loss_pct"] * d["crop_mult"], 2))
            migration_share = d["flood_mult"] / total_flood_mult
            migration = int(base["migration_people"] * migration_share)
            out[name] = {
                "flood_risk_pct": flood,
                "crop_loss_pct": crop,
                "migration_people": migration,
                "overallRisk": round(0.6 * flood + 0.4 * crop, 1),
                "severity": severity_from_flood(flood),
            }
        return {"base": base, "districts": out}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"District prediction failed: {e}")


@app.post("/advice")
def advice(payload: AdviceInput):
    try:
        climate_fields = payload.model_dump(exclude={"district"})
        prediction = run_prediction(climate_fields)
        result = generate_advice(prediction, climate_fields, payload.district)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Advice generation failed: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
