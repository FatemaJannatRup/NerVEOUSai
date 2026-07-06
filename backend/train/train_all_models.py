"""
train_all_models.py
--------------------
Trains all five DeltaMind AI prediction models on the synthetic
Bangladesh climate dataset and saves them as .pkl files under
backend/models/.

Models
------
1. Flood Risk %          -> XGBoost Regressor
2. Crop Loss %            -> Random Forest Regressor
3. Migration (people)     -> XGBoost Regressor
4. Disease Outbreak Risk %-> Neural Network (MLPRegressor, scikit-learn)
   NOTE: the brief recommended a TensorFlow neural net. We use
   scikit-learn's MLPRegressor here instead so the whole project installs
   and trains in seconds with zero extra system dependencies (TensorFlow
   adds a 500MB+ install and GPU/CPU wheel headaches that aren't worth it
   for a hackathon judge trying to `pip install -r requirements.txt` in
   two minutes). It is a genuine multi-layer perceptron neural network
   trained with backprop (Adam optimizer) -- architecturally the same
   idea, just a lighter-weight implementation. Swapping in
   tensorflow.keras.Sequential is a drop-in change (see comment at the
   bottom of this file) if you want the literal TF version.
5. Economic Damage (USD)  -> Random Forest Regressor

Run:
    python train_all_models.py
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.neural_network import MLPRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.preprocessing import StandardScaler
import xgboost as xgb

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(HERE, "..", "data", "bangladesh_climate_ai_1000.csv")
MODELS_DIR = os.path.join(HERE, "..", "models")
os.makedirs(MODELS_DIR, exist_ok=True)

FEATURES = [
    "temperature_increase_c",
    "sea_level_rise_m",
    "rainfall_change_pct",
    "cyclone_intensity_index",
    "humidity_pct",
    "river_overflow_index",
    "deforestation_pct",
]

TARGETS = {
    "flood_risk_pct": "flood_model.pkl",
    "crop_loss_pct": "crop_model.pkl",
    "migration_people": "migration_model.pkl",
    "disease_risk_pct": "disease_model.pkl",
    "economic_damage_usd": "economic_model.pkl",
}


def train_and_eval(name, model, X_train, X_test, y_train, y_test):
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)
    print(f"  {name:<28} MAE={mae:,.2f}   R2={r2:.3f}")
    return model


def main():
    print(f"Loading dataset from {DATA_PATH} ...")
    df = pd.read_csv(DATA_PATH)
    X = df[FEATURES].values

    print(f"Training on {len(df)} rows, {len(FEATURES)} features.\n")

    results = {}

    # ---- Model 1: Flood Risk -> XGBoost Regressor ----
    y = df["flood_risk_pct"].values
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = xgb.XGBRegressor(
        n_estimators=400, max_depth=5, learning_rate=0.05,
        subsample=0.85, colsample_bytree=0.85, random_state=42,
    )
    train_and_eval("flood_risk_pct (XGBoost)", model, X_train, X_test, y_train, y_test)
    joblib.dump(model, os.path.join(MODELS_DIR, TARGETS["flood_risk_pct"]))

    # ---- Model 2: Crop Loss -> Random Forest Regressor ----
    y = df["crop_loss_pct"].values
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = RandomForestRegressor(n_estimators=400, max_depth=10, random_state=42, n_jobs=-1)
    train_and_eval("crop_loss_pct (RandomForest)", model, X_train, X_test, y_train, y_test)
    joblib.dump(model, os.path.join(MODELS_DIR, TARGETS["crop_loss_pct"]))

    # ---- Model 3: Migration -> XGBoost Regressor ----
    y = df["migration_people"].values
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = xgb.XGBRegressor(
        n_estimators=500, max_depth=6, learning_rate=0.04,
        subsample=0.85, colsample_bytree=0.85, random_state=42,
    )
    train_and_eval("migration_people (XGBoost)", model, X_train, X_test, y_train, y_test)
    joblib.dump(model, os.path.join(MODELS_DIR, TARGETS["migration_people"]))

    # ---- Model 4: Disease Risk -> Neural Network (MLP) ----
    y = df["disease_risk_pct"].values
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    scaler = StandardScaler().fit(X_train)
    X_train_s, X_test_s = scaler.transform(X_train), scaler.transform(X_test)
    mlp = MLPRegressor(
        hidden_layer_sizes=(64, 32, 16), activation="relu", solver="adam",
        alpha=1e-3, learning_rate_init=1e-3, max_iter=2000, random_state=42,
    )
    train_and_eval("disease_risk_pct (NeuralNet)", mlp, X_train_s, X_test_s, y_train, y_test)
    # Bundle the scaler with the model since NNs need scaled input
    joblib.dump({"model": mlp, "scaler": scaler}, os.path.join(MODELS_DIR, TARGETS["disease_risk_pct"]))

    # ---- Model 5: Economic Damage -> Random Forest Regressor ----
    y = df["economic_damage_usd"].values
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = RandomForestRegressor(n_estimators=400, max_depth=12, random_state=42, n_jobs=-1)
    train_and_eval("economic_damage_usd (RandomForest)", model, X_train, X_test, y_train, y_test)
    joblib.dump(model, os.path.join(MODELS_DIR, TARGETS["economic_damage_usd"]))

    print(f"\nAll 5 models saved to {MODELS_DIR}/")


if __name__ == "__main__":
    main()

# ---------------------------------------------------------------------
# To use a literal TensorFlow/Keras network for the disease model instead
# of MLPRegressor, replace the "Model 4" block above with:
#
#   import tensorflow as tf
#   model = tf.keras.Sequential([
#       tf.keras.layers.Dense(64, activation="relu", input_shape=(len(FEATURES),)),
#       tf.keras.layers.Dense(32, activation="relu"),
#       tf.keras.layers.Dense(16, activation="relu"),
#       tf.keras.layers.Dense(1),
#   ])
#   model.compile(optimizer="adam", loss="mse", metrics=["mae"])
#   model.fit(X_train_s, y_train, epochs=100, batch_size=16, verbose=0)
#   model.save(os.path.join(MODELS_DIR, "disease_model.keras"))
#
# and update api/predict.py to load it with tf.keras.models.load_model()
# instead of joblib.load().
# ---------------------------------------------------------------------
