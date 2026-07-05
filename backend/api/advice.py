"""
advice.py
---------
Generates Golem's chat-style explanation of a prediction result, using
either a locally running Ollama model (default: gemma:2b), Google's
Gemini API, or OpenAI -- picked at runtime based on which environment
variables are set. Golem talks like a sharp, friendly climate analyst
-- not a form letter -- and returns one flowing markdown message so the
frontend can render it in a chat bubble with a typewriter/streaming
effect.

Provider selection priority (mirrors the JS getOpenAIClient() pattern):
  1. OLLAMA_HOST set        -> native Ollama generate API at that host
  2. GEMINI_API_KEY set     -> Gemini via its OpenAI-compatible endpoint
  3. OPENAI_API_KEY set     -> OpenAI chat completions
  4. none of the above      -> default local Ollama (http://localhost:11434)

If the selected provider call fails for any reason, we fall back to a
templated message so the demo never breaks, but the primary path is a
genuine LLM call.
"""

import os
import json
import urllib.request
import urllib.error


def _env(name, default=None):
    return os.environ.get(name, default)


# --- Ollama config -----------------------------------------------------
OLLAMA_HOST = _env("OLLAMA_HOST")  # e.g. "http://some-remote-host:11434"
OLLAMA_URL = _env("OLLAMA_URL", f"{OLLAMA_HOST or 'http://localhost:11434'}/api/generate")
OLLAMA_MODEL = _env("OLLAMA_MODEL", "gemma:2b")

# --- Gemini config (via OpenAI-compatible endpoint) ---------------------
GEMINI_API_KEY = _env("GEMINI_API_KEY")
GEMINI_MODEL = _env("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_BASE_URL = _env(
    "GEMINI_BASE_URL",
    "https://generativelanguage.googleapis.com/v1beta/openai/",
)

# --- OpenAI config -------------------------------------------------------
OPENAI_API_KEY = _env("OPENAI_API_KEY")
OPENAI_MODEL = _env("OPENAI_MODEL", "gpt-5-mini")
OPENAI_BASE_URL = _env("OPENAI_BASE_URL", "https://api.openai.com/v1/")

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


def _call_ollama_generate(prompt: str, url: str, model: str, timeout=30):
    """Native Ollama /api/generate call (raw completion, not chat)."""
    body = json.dumps({
        "model": model,
        "prompt": prompt,
        "stream": False,
    }).encode("utf-8")

    req = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = json.loads(resp.read().decode("utf-8"))
        return raw.get("response", "").strip()


def _call_openai_compatible(base_url: str, api_key: str, model: str, prompt: str,
                             extra_body=None, timeout=30):
    """
    Chat-completions call against any OpenAI-compatible endpoint
    (used for both real OpenAI and Gemini's OpenAI-compat layer).
    """
    url = base_url.rstrip("/") + "/chat/completions"
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
    }
    if extra_body:
        payload.update(extra_body)

    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = json.loads(resp.read().decode("utf-8"))
        choices = raw.get("choices", [])
        if not choices:
            return ""
        return (choices[0].get("message", {}).get("content") or "").strip()


def _resolve_provider():
    """
    Mirrors the JS getOpenAIClient() priority:
      1. OLLAMA_HOST set   -> ollama
      2. GEMINI_API_KEY    -> gemini
      3. OPENAI_API_KEY    -> openai
      4. default           -> ollama (localhost)
    """
    print(type(OLLAMA_HOST), OLLAMA_HOST)
    if OLLAMA_HOST:
        return "ollama"
    if GEMINI_API_KEY:
        return "gemini"
    if OPENAI_API_KEY:
        return "openai"
    return "ollama"


def generate_advice(prediction: dict, inputs: dict, district=None):
    prompt = _build_prompt(prediction, inputs, district)
    provider = _resolve_provider()
    print(provider)

    try:
        if provider == "gemini":
            text = _call_openai_compatible(
                GEMINI_BASE_URL,
                GEMINI_API_KEY,
                GEMINI_MODEL,
                prompt,
                extra_body={
                    "extra_body": {
                        "google": {
                            "thinking_config": {
                                "thinking_level": "minimal"
                            }
                        }
                    }
                },
            )
            source = f"gemini:{GEMINI_MODEL}"

        elif provider == "openai":
            text = _call_openai_compatible(
                OPENAI_BASE_URL,
                OPENAI_API_KEY,
                OPENAI_MODEL,
                prompt,
            )
            source = f"openai:{OPENAI_MODEL}"

        else:  # ollama
            text = _call_ollama_generate(prompt, OLLAMA_URL, OLLAMA_MODEL)
            source = f"ollama:{OLLAMA_MODEL}"

        if not text:
            return _fallback_advice(prediction, district)
        return {"message": text, "source": source}

    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError,
            ConnectionRefusedError, OSError, KeyError, ValueError) as exc:
        print(exc)
        print(f"[advice] {provider} call failed: {exc} -- using fallback template")
        return _fallback_advice(prediction, district)