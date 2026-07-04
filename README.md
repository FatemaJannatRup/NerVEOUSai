# 🧊 NerVEOUSai

**Bangladesh Climate Craft — an AI-powered, block-world styled climate risk simulator.**

Drag sliders for temperature, sea level, rainfall, cyclones, humidity, river overflow, and
deforestation — five independently trained ML models predict flood risk, crop loss,
migration, disease risk, and economic damage in real time. A real 64-district Bangladesh
choropleth heatmap recolors live, and **Golem**, a local LLM (via Ollama), explains what
it all means in a chat panel with a genuine streaming/typewriter effect.

First visit to a tab gets an Among Us-style "ejection" intro + a Gen-Z-toned spotlight
walkthrough. Refreshing the page does **not** replay it (uses `sessionStorage`); opening a
new tab does.

No hardcoded `if temperature > 3: flood = high` logic — every number comes out of a
trained model running inference against your slider inputs.

---

## 1. Project structure

```
nerveous-ai/
├── backend/
│   ├── data/
│   │   ├── generate_dataset.py        # builds the synthetic training dataset
│   │   └── bangladesh_climate_ai_1000.csv
│   ├── train/
│   │   └── train_all_models.py        # trains & saves all 5 models
│   ├── models/                        # .pkl files (already trained, included)
│   ├── api/
│   │   ├── predict.py                 # loads models, runs inference
│   │   ├── districts.py               # all 64 real districts + vulnerability weights
│   │   └── advice.py                  # Golem / Ollama LLM call + safe fallback
│   ├── main.py                        # FastAPI app + all routes
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ControlPanel.jsx       # sliders + year time machine + presets
│   │   │   ├── RiskMap.jsx            # real Bangladesh district choropleth (Leaflet)
│   │   │   ├── GolemChat.jsx         # streaming AI chat panel (top right)
│   │   │   ├── StatsRow.jsx           # animated stat slots + trend chart
│   │   │   └── Tutorial.jsx           # Among Us intro + spotlight walkthrough
│   │   ├── data/
│   │   │   ├── bd-districts.geo.json  # real 64-district boundaries (simplified)
│   │   │   └── districts.json         # division / coastal / vulnerability metadata
│   │   ├── hooks/useIntroOnce.js      # sessionStorage-based "show once per tab" logic
│   │   ├── utils/sound.js             # synthesized 8-bit SFX (no audio files needed)
│   │   ├── utils/riskStyle.js         # heatmap color ramp
│   │   ├── pages/Home.jsx             # orchestrates everything
│   │   ├── api.js, App.jsx, main.jsx, index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 2. Requirements

- Python 3.10+
- Node.js 18+
- (Optional, for real AI-generated chat responses) [Ollama](https://ollama.com) running
  locally with the `gemma:2b` model pulled

## 3. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Models are already trained and included in `backend/models/*.pkl`. To regenerate the
dataset and retrain from scratch:

```bash
cd data && python generate_dataset.py && cd ..
cd train && python train_all_models.py && cd ..
```

Verify: http://localhost:8000/health should show `"districts_loaded": 64`.
Interactive API docs: http://localhost:8000/docs

## 4. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173.

## 5. (Optional) Enable real Golem responses with Ollama

Without Ollama running, Golem automatically falls back to a well-written templated
response so the demo never breaks. For the full live-AI effect:

```bash
ollama pull gemma:2b
ollama serve
```

Override the endpoint/model if needed:
```bash
export OLLAMA_URL=http://localhost:11434/api/generate
export OLLAMA_MODEL=gemma:2b
```

## 6. The real map

`frontend/src/data/bd-districts.geo.json` contains **actual simplified administrative
boundaries for all 64 Bangladesh districts** (sourced from public ADM2 boundary data,
geometry-simplified with mapshaper for a fast, clean render). Every district polygon is
keyed by its exact name, and the backend's `/predict/districts` endpoint returns
predictions keyed by those same 64 names — so the map always has a color for every
district, with zero missing or orphaned polygons.

District risk is calculated by taking the national AI prediction and scaling it per
district using vulnerability multipliers derived from each district's coastal exposure
and delta position (see `backend/api/districts.py`).

## 7. How the AI models work

| # | Output | Model | Why |
|---|--------|-------|-----|
| 1 | `flood_risk_pct` | XGBoost Regressor | non-linear interaction between sea level, river overflow & cyclones |
| 2 | `crop_loss_pct` | Random Forest Regressor | robust to noisy agricultural signals |
| 3 | `migration_people` | XGBoost Regressor | handles skewed, high-variance population data |
| 4 | `disease_risk_pct` | Neural Network (MLPRegressor) | learns smooth, humidity-driven outbreak patterns |
| 5 | `economic_damage_usd` | Random Forest Regressor | stable on wide-range monetary targets |

All five are trained on `backend/data/bangladesh_climate_ai_1000.csv`, a synthetic but
physically-informed dataset (see `generate_dataset.py`). No public dataset combines these
exact variables at the district level, so the generator builds one from IPCC-style
coastal-flood sensitivity curves, per-district vulnerability weights, and randomized
noise + non-linear interactions — keeping input→output relationships genuinely non-linear
so the models learn real structure instead of memorizing a formula.

> Note: scikit-learn's `MLPRegressor` (a true backprop-trained neural network) is used
> instead of TensorFlow for the disease model so the whole project installs and trains in
> under a minute with no GPU/CPU wheel headaches. See the comment block at the bottom of
> `train_all_models.py` for a drop-in TensorFlow/Keras swap.

## 8. UX features

- 🚀 **Among Us-style intro** — a crewmate gets "ejected" on first visit per tab, then a
  Gen-Z-toned welcome card and spotlight walkthrough (skippable anytime).
- 🔄 **Refresh-safe** — intro uses `sessionStorage`, so hitting refresh keeps you right
  where you are. Opening a brand-new tab shows the intro again.
- 🗺️ **Real choropleth** — all 64 districts rendered from actual boundary data, labeled,
  color-intensity-coded, click any district to select it.
- ✦ **Golem chat** — top-right, large, genuinely streams its response character-by-
  character (typewriter effect) with markdown formatting.
- 🔊 **8-bit sound effects** — synthesized on the fly via Web Audio API (no audio files
  shipped), for clicks, slider drags, alerts, and the ejection sting.
- ❤️ **Pixel-heart severity meter** + animated "item slot" stat cards + a small risk
  trajectory chart.
- 🎲 **Randomize** button, 🕐 **year time machine**, and one-click scenario presets.

## 9. API reference

### `POST /predict`
```json
{
  "temperature_increase_c": 3.2,
  "sea_level_rise_m": 1.4,
  "rainfall_change_pct": 20,
  "cyclone_intensity_index": 7,
  "humidity_pct": 81,
  "river_overflow_index": 50,
  "deforestation_pct": 14
}
```
→ `{ flood_risk_pct, crop_loss_pct, migration_people, disease_risk_pct, economic_damage_usd, severity, composite_score }`

### `POST /predict/districts`
Same input → `{ base: {...}, districts: { "<DistrictName>": { flood_risk_pct, crop_loss_pct, migration_people, overallRisk, severity }, ... } }` for all 64 districts.

### `POST /advice`
Same input + optional `"district": "Bhola"` → `{ message: "<markdown>", source: "ollama:gemma:2b" | "fallback-template" }`

### `GET /districts`
Static metadata for all 64 districts (division, coastal flag, coordinates, multipliers).

---

Built for an AI hackathon 🇧🇩 — predictions are AI-generated simulations for
educational/demo purposes, not official climate forecasts.
