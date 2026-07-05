const API_BASE = import.meta.env.VITE_API_BASE || "";

async function post(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export function fetchPrediction(inputs) {
  return post("/predict", inputs);
}

export function fetchDistrictPredictions(inputs) {
  return post("/predict/districts", inputs);
}

export function fetchAdvice(inputs, district) {
  return post("/advice", { ...inputs, district: district || null });
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
