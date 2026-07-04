"""
advice.py
---------
Generates Golem's chat-style explanation of a prediction result, using
a locally running Ollama model (default: gemma:2b). Golem talks like a
sharp, friendly climate analyst -- not a form letter -- and returns one
flowing markdown message so the frontend can render it in a chat bubble
with a typewriter/streaming effect.

If Ollama isn't running, we fall back to a templated message so the
demo never breaks, but the primary path is a genuine LLM call.
"""

import os
import json
import urllib.request
import urllib.error


def _env(name, default):
    return os.environ.get(name, default)


OLLAMA_URL = _env("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = _env("OLLAMA_MODEL", "gemma:2b")


def _build_prompt(prediction: dict, inputs: dict, district):
    where = f" focused on {district} district" if district else " for Bangladesh overall"
    return f"""You are Golem, an upbeat but scientifically sharp climate-risk analyst AI
built into NerVEOUSai, a Bangladesh climate simulation dashboard. A user just moved some
sliders and is looking at your prediction{where}. Explain it to them like a smart friend,
not a government report. Keep it real, keep it clear, no fluff, no corporate tone.

SCENARIO INPUTS:
- Temperature increase: {inputs.get('temperature_increase_c')}°C
- Sea level rise: {inputs.get('sea_level_rise_m')} m
- Rainfall change: {inputs.get('rainfall_change_pct')}%
- Cyclone intensity: {inputs.get('cyclone_intensity_index')}/10
- Humidity: {inputs.get('humidity_pct')}%
- River overflow index: {inputs.get('river_overflow_index')}/100
- Deforestation: {inputs.get('deforestation_pct')}%

AI MODEL PREDICTIONS:
- Flood Risk: {prediction['flood_risk_pct']}%
- Crop Loss: {prediction['crop_loss_pct']}%
- Migration: {prediction['migration_people']:,} people
- Disease Outbreak Risk: {prediction['disease_risk_pct']}%
- Economic Damage: ${prediction['economic_damage_usd']:,.0f}
- Overall Severity: {prediction['severity'].upper()}

Write a single response in Markdown, 180-260 words, structured with short bolded
mini-headers (like **What's happening** / **Who's most at risk** / **What to actually do**),
using bullet points where useful. Be concrete and specific to the numbers above. End with
one short punchy line. Do not use JSON. Do not wrap in code fences. Just write the message."""


def _fallback_advice(prediction: dict, district):
    sev = prediction["severity"]
    flood = prediction["flood_risk_pct"]
    crop = prediction["crop_loss_pct"]
    migration = prediction["migration_people"]
    disease = prediction["disease_risk_pct"]
    damage_m = prediction["economic_damage_usd"] / 1_000_000
    where = district or "Bangladesh"

    sev_line = {
        "safe": "Honestly? Not bad. This scenario is pretty manageable.",
        "moderate": "This one's worth paying attention to -- not a crisis yet, but trending that way.",
        "high": "Okay, this is a serious scenario. The numbers are climbing fast.",
        "severe": "This is about as bad as it gets in the simulation. Full alert territory.",
    }[sev]

    message = f"""**What's happening in {where}**
{sev_line} At {flood}% flood risk and {crop}% crop loss, water and food security are both under real pressure here.

**Who's most at risk**
Low-lying and coastal communities take the hit first. The model estimates around **{migration:,} people** could be pushed to migrate under these conditions, and disease outbreak risk sits at **{disease}%** as flooding and stagnant water create breeding grounds for waterborne illness.

**The money side**
Projected economic damage: **${damage_m:.1f}M**. That's infrastructure, crops, and lost productivity all adding up.

**What to actually do**
- Keep an emergency kit and 3+ days of clean water on hand
- Shift toward salt-tolerant, flood-resistant crop varieties
- Know your nearest cyclone shelter and evacuation route
- Push for embankments + mangrove restoration in vulnerable zones

Bottom line: the sliders you picked point to a {sev} scenario -- small changes now beat big losses later."""

    return {"message": message, "source": "fallback-template"}


def generate_advice(prediction: dict, inputs: dict, district=None):
    prompt = _build_prompt(prediction, inputs, district)
    body = json.dumps({
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
    }).encode("utf-8")

    req = urllib.request.Request(
        OLLAMA_URL, data=body, headers={"Content-Type": "application/json"}, method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
            text = raw.get("response", "").strip()
            if not text:
                return _fallback_advice(prediction, district)
            return {"message": text, "source": f"ollama:{OLLAMA_MODEL}"}
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, ConnectionRefusedError, OSError) as exc:
        print(f"[advice] Ollama call failed ({OLLAMA_MODEL} @ {OLLAMA_URL}): {exc} -- using fallback template")
        return _fallback_advice(prediction, district)
