// riskStyle.js — maps a 0-100 risk score to a blocky heatmap color ramp.

const STOPS = [
  { at: 0, color: [61, 220, 132] },    // emerald - safe
  { at: 30, color: [246, 196, 69] },   // gold - low/moderate
  { at: 55, color: [255, 149, 43] },   // amber - high
  { at: 75, color: [255, 75, 75] },    // redstone - severe
  { at: 100, color: [178, 24, 24] },   // deep red - catastrophic
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function riskColorForScore(score) {
  const s = Math.max(0, Math.min(100, score ?? 0));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (s >= a.at && s <= b.at) {
      const t = (s - a.at) / (b.at - a.at);
      const r = Math.round(lerp(a.color[0], b.color[0], t));
      const g = Math.round(lerp(a.color[1], b.color[1], t));
      const bl = Math.round(lerp(a.color[2], b.color[2], t));
      return `rgb(${r}, ${g}, ${bl})`;
    }
  }
  return `rgb(${STOPS[STOPS.length - 1].color.join(", ")})`;
}

export function severityLabel(score) {
  const s = score ?? 0;
  if (s < 30) return { label: "SAFE", color: "var(--emerald)" };
  if (s < 55) return { label: "MODERATE", color: "var(--gold)" };
  if (s < 75) return { label: "HIGH RISK", color: "#ff953b" };
  return { label: "SEVERE", color: "var(--redstone)" };
}
