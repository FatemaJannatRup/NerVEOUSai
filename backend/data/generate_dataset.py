"""
generate_dataset.py
--------------------
Generates a synthetic (but physically-informed) Bangladesh climate impact
dataset used to train DeltaMind AI's five prediction models.

Why synthetic? No public dataset combines all of these exact variables
(temperature increase, sea level rise, rainfall change, cyclone intensity,
humidity, river overflow, deforestation) with the five target outcomes at
the district level. So we build a realistic simulator grounded in known
climate-science relationships (IPCC coastal-flood sensitivity curves,
Bangladesh Meteorological Dept. cyclone-damage patterns, IOM migration
studies) and layer in noise + non-linear interactions + randomized
district vulnerability so that the relationship between inputs and
outputs is NOT a simple hardcoded formula the model can trivially learn
as a linear map. This forces the trained ML models to genuinely learn
non-linear, interacting patterns instead of us hand-coding rules in the
backend.

Run:
    python generate_dataset.py
Produces:
    bangladesh_climate_ai_1000.csv
"""

import numpy as np
import pandas as pd

RNG = np.random.default_rng(42)

# 20 real Bangladesh districts with an approximate coastal/vulnerability
# weight (0 = inland/low vulnerability, 1 = highly exposed coastal delta)
DISTRICTS = {
    "Khulna":       0.95,
    "Barisal":      0.92,
    "Bhola":        0.98,
    "Patuakhali":   0.96,
    "Satkhira":     0.93,
    "Bagerhat":     0.90,
    "Chittagong":   0.85,
    "Cox's Bazar":  0.88,
    "Noakhali":     0.87,
    "Pirojpur":     0.84,
    "Jhalokati":    0.80,
    "Shariatpur":   0.70,
    "Chandpur":     0.66,
    "Faridpur":     0.55,
    "Dhaka":        0.35,
    "Comilla":      0.50,
    "Sylhet":       0.60,
    "Rajshahi":     0.20,
    "Rangpur":      0.18,
    "Bogura":       0.22,
}

N_SAMPLES = 1000
LAT_LNG = {
    "Khulna": (22.8456, 89.5403), "Barisal": (22.7010, 90.3535),
    "Bhola": (22.6859, 90.6482), "Patuakhali": (22.3596, 90.3296),
    "Satkhira": (22.7185, 89.0705), "Bagerhat": (22.6602, 89.7895),
    "Chittagong": (22.3569, 91.7832), "Cox's Bazar": (21.4272, 92.0058),
    "Noakhali": (22.8696, 91.0995), "Pirojpur": (22.5841, 89.9720),
    "Jhalokati": (22.6406, 90.1987), "Shariatpur": (23.2423, 90.4348),
    "Chandpur": (23.2333, 90.6712), "Faridpur": (23.6070, 89.8429),
    "Dhaka": (23.8103, 90.4125), "Comilla": (23.4607, 91.1809),
    "Sylhet": (24.8949, 91.8687), "Rajshahi": (24.3745, 88.6042),
    "Rangpur": (25.7439, 89.2752), "Bogura": (24.8465, 89.3776),
}

rows = []
for _ in range(N_SAMPLES):
    district = RNG.choice(list(DISTRICTS.keys()))
    vuln = DISTRICTS[district]  # base vulnerability factor
    year = int(RNG.integers(2025, 2101))
    year_frac = (year - 2025) / (2100 - 2025)  # 0..1 progression

    # ---- Input (environmental) variables ----
    temperature_increase_c = float(np.clip(RNG.normal(1.0 + 3.5 * year_frac, 0.8), 0, 6))
    sea_level_rise_m = float(np.clip(RNG.normal(0.3 + 3.2 * year_frac * vuln, 0.5), 0, 5))
    rainfall_change_pct = float(np.clip(RNG.normal(10 + 30 * year_frac, 15), -20, 60))
    cyclone_intensity_index = float(np.clip(RNG.normal(3 + 5 * year_frac + 2 * vuln, 1.6), 0, 10))
    humidity_pct = float(np.clip(RNG.normal(75 + 8 * year_frac, 6), 40, 100))
    river_overflow_index = float(np.clip(RNG.normal(30 + 40 * year_frac * (0.5 + vuln / 2), 15), 0, 100))
    deforestation_pct = float(np.clip(RNG.normal(15 + 20 * year_frac, 8), 0, 80))

    # ---- Non-linear interaction terms (deliberately complex, not a
    # simple weighted sum, so the ML models must learn real structure) ----
    coastal_stress = (sea_level_rise_m ** 1.4) * (0.5 + vuln)
    storm_stress = (cyclone_intensity_index ** 1.3) * (0.4 + 0.6 * vuln)
    heat_rain_interaction = np.tanh(temperature_increase_c / 3) * (1 + rainfall_change_pct / 100)
    river_land_interaction = (river_overflow_index / 100) * (1 + deforestation_pct / 100) ** 1.5

    # ---- Target 1: Flood Risk % ----
    flood_risk_pct = (
        6
        + 4.2 * coastal_stress
        + 0.22 * river_overflow_index
        + 1.8 * storm_stress
        + 6 * heat_rain_interaction
        + 5 * river_land_interaction
        + RNG.normal(0, 6)
    )
    flood_risk_pct = float(np.clip(flood_risk_pct, 0, 100))

    # ---- Target 2: Crop Loss % ----
    crop_loss_pct = (
        4
        + 0.38 * flood_risk_pct * (0.6 + 0.4 * vuln)
        + 0.6 * abs(rainfall_change_pct) * 0.22
        + 1.8 * storm_stress
        + 0.18 * deforestation_pct
        + RNG.normal(0, 6)
    )
    crop_loss_pct = float(np.clip(crop_loss_pct, 0, 100))

    # ---- Target 3: Migration (people) ----
    base_pop_at_risk = 40000 + vuln * 260000
    migration_people = (
        base_pop_at_risk
        * (0.15 + 0.011 * flood_risk_pct)
        * (0.5 + 0.008 * crop_loss_pct)
        * (1 + 0.05 * storm_stress)
    )
    migration_people = float(max(0, migration_people * RNG.normal(1.0, 0.18)))

    # ---- Target 4: Disease Outbreak Risk % ----
    disease_risk_pct = (
        4
        + 0.28 * flood_risk_pct
        + 0.14 * humidity_pct
        + 0.09 * river_overflow_index
        + 1.1 * storm_stress
        + RNG.normal(0, 6)
    )
    disease_risk_pct = float(np.clip(disease_risk_pct, 0, 100))

    # ---- Target 5: Economic Damage (USD) ----
    economic_damage_usd = (
        (2_000_000 + vuln * 8_000_000)
        * (1 + flood_risk_pct / 40)
        * (1 + crop_loss_pct / 60)
        * (1 + storm_stress / 8)
        * RNG.normal(1.0, 0.2)
    )
    economic_damage_usd = float(max(0, economic_damage_usd))

    lat, lng = LAT_LNG[district]

    rows.append(dict(
        district=district, year=year, lat=lat, lng=lng,
        temperature_increase_c=round(temperature_increase_c, 2),
        sea_level_rise_m=round(sea_level_rise_m, 2),
        rainfall_change_pct=round(rainfall_change_pct, 2),
        cyclone_intensity_index=round(cyclone_intensity_index, 2),
        humidity_pct=round(humidity_pct, 2),
        river_overflow_index=round(river_overflow_index, 2),
        deforestation_pct=round(deforestation_pct, 2),
        flood_risk_pct=round(flood_risk_pct, 2),
        crop_loss_pct=round(crop_loss_pct, 2),
        migration_people=int(migration_people),
        disease_risk_pct=round(disease_risk_pct, 2),
        economic_damage_usd=round(economic_damage_usd, 2),
    ))

df = pd.DataFrame(rows)
df.to_csv("bangladesh_climate_ai_1000.csv", index=False)
print(f"Generated {len(df)} rows -> bangladesh_climate_ai_1000.csv")
print(df.describe().T[["mean", "min", "max"]])
