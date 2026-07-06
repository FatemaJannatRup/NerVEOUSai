# NerVEOUSai

A climate risk simulator for Bangladesh. Here's what you can actually do with it:

## Play with the sliders

Seven sliders control the scenario — temperature increase, sea level rise, rainfall change, cyclone intensity, humidity, river overflow, and deforestation. Move any of them and everything else on screen (the map, the stats, the chart) updates live, driven by real model predictions, not a lookup table.

## Jump to a year

There's a year slider from 2025 to 2100. Drag it and hit "Auto-fill" to instantly load climate values interpolated for that year. There are also four one-click presets: Today, Paris Target, Business as Usual, and Worst Case — each one sets all seven sliders at once to a realistic scenario for that future.

## Hit randomize

One button scrambles all seven sliders to random values, if you just want to see what an extreme or weird scenario looks like.

## Explore the map

A real map of Bangladesh with all 64 districts, color-coded by risk (green = safe, red = severe). You can:

- Zoom and pan around the country
- Hover over any district to see its division, whether it's coastal, and its current risk score
- Click a district to select it — the map highlights it and the rest of the app (like Golem) starts talking about that specific district instead of the whole country
- District labels thin out automatically as you zoom out so it doesn't turn into text soup, and thicken back up as you zoom in

## Read the stats

Below the map, five live numbers: flood risk, crop loss, migration, disease risk, and economic damage, all animating/counting up as they change. There's also an overall severity rating (shown as a row of hearts, like a video game health bar) and a small chart showing how risk trends from 2025 to 2100 for reference.

## Ask Golem

There's an AI chat panel on the side. Click "Ask Golem about [district/Bangladesh]" and it writes an explanation of what the current scenario actually means in plain language — streamed out character by character like it's typing. If you've selected a district, it talks about that district specifically; otherwise it talks about the country as a whole. It quietly tells you whether the answer came from a real local AI model or a canned fallback, so you always know what you're reading.

## Resize the layout

The three main panels (controls, map, chat) and the stats strip at the bottom can all be resized by dragging the dividers between them. Your layout preference is remembered.

## First-time walkthrough

The very first time you open the app in a tab, you get a short animated intro and a guided tour pointing out what each panel does. Refresh the page and it won't replay — open a brand new tab and it will.

## Sound

Small 8-bit sound effects play for clicks, slider drags, and messages, giving the whole thing a retro game feel. No audio files involved — it's all generated on the fly.

## 2. Requirements

- Python 3.10+
- Node.js 18+
- (Optional, for real AI-generated chat responses) [Ollama](https://ollama.com) running
  locally with the `gemma:2b` model pulled

## 3. Backend setup

```bash
cd backend
uv sync                # install uv before
uv run uvicorn main:app --reload --port 8000
```

Models are already trained and included in `backend/models/*.pkl`. To regenerate the
dataset and retrain from scratch:

```bash
cd data && python generate_dataset.py && cd ..
cd train && python train_all_models.py && cd ..
```

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
