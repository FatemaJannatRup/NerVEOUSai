import { motion } from "framer-motion";
import { sfx } from "../utils/sound.js";

const SLIDERS = [
  { key: "temperature_increase_c", label: "Temperature", unit: "°C", min: 0, max: 6, step: 0.1, icon: "🔥" },
  { key: "sea_level_rise_m", label: "Sea Level", unit: "m", min: 0, max: 5, step: 0.1, icon: "🌊" },
  { key: "rainfall_change_pct", label: "Rainfall", unit: "%", min: -20, max: 60, step: 1, icon: "🌧️" },
  { key: "cyclone_intensity_index", label: "Cyclone", unit: "/10", min: 0, max: 10, step: 0.1, icon: "🌀" },
  { key: "humidity_pct", label: "Humidity", unit: "%", min: 40, max: 100, step: 1, icon: "💧" },
  { key: "river_overflow_index", label: "River Overflow", unit: "/100", min: 0, max: 100, step: 1, icon: "🏞️" },
  { key: "deforestation_pct", label: "Deforestation", unit: "%", min: 0, max: 80, step: 1, icon: "🌳" },
];

export const YEAR_PRESETS = [
  { year: 2025, name: "Today", values: { temperature_increase_c: 1.0, sea_level_rise_m: 0.3, rainfall_change_pct: 8, cyclone_intensity_index: 3.5, humidity_pct: 76, river_overflow_index: 32, deforestation_pct: 16 } },
  { year: 2050, name: "Paris Target", values: { temperature_increase_c: 2.0, sea_level_rise_m: 1.1, rainfall_change_pct: 20, cyclone_intensity_index: 5.5, humidity_pct: 80, river_overflow_index: 48, deforestation_pct: 24 } },
  { year: 2075, name: "Business as Usual", values: { temperature_increase_c: 3.6, sea_level_rise_m: 2.4, rainfall_change_pct: 32, cyclone_intensity_index: 7.2, humidity_pct: 84, river_overflow_index: 62, deforestation_pct: 32 } },
  { year: 2100, name: "Worst Case", values: { temperature_increase_c: 5.4, sea_level_rise_m: 3.8, rainfall_change_pct: 48, cyclone_intensity_index: 9, humidity_pct: 90, river_overflow_index: 78, deforestation_pct: 42 } },
];

export function interpolateForYear(year) {
  const pts = YEAR_PRESETS;
  if (year <= pts[0].year) return pts[0].values;
  if (year >= pts[pts.length - 1].year) return pts[pts.length - 1].values;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (year >= a.year && year <= b.year) {
      const t = (year - a.year) / (b.year - a.year);
      const out = {};
      Object.keys(a.values).forEach((k) => {
        out[k] = a.values[k] + t * (b.values[k] - a.values[k]);
      });
      return out;
    }
  }
  return pts[0].values;
}

export default function ControlPanel({ values, year, onChange, onYearChange, onApplyYear }) {
  return (
    <div className="mc-panel" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: "3px solid #000" }}>
        <div className="font-pixel" style={{ fontSize: 11, color: "var(--gold)" }}>⚒ CRAFTING TABLE</div>
        <div className="mono" style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 4 }}>
          build your climate scenario
        </div>
      </div>

      <div style={{ padding: 14, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        <div data-tour="year" className="mc-panel-inset" style={{ padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>🕐 Future Year</span>
            <motion.span
              key={year}
              initial={{ scale: 1.4, color: "#4ce9e0" }}
              animate={{ scale: 1, color: "#f4f1e8" }}
              className="font-pixel"
              style={{ fontSize: 14 }}
            >
              {year}
            </motion.span>
          </div>
          <input
            type="range"
            className="mc-range"
            min={2025}
            max={2100}
            step={1}
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            onMouseUp={() => sfx.pop()}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }} className="mono">
            <span>2025</span>
            <span>2100</span>
          </div>
          <button
            className="mc-btn mc-btn-accent"
            style={{ width: "100%", marginTop: 10, fontSize: 9 }}
            onClick={() => {
              sfx.success();
              onApplyYear();
            }}
          >
            ✨ Auto-fill for {year}
          </button>
        </div>

        

        <div data-tour="sliders" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {SLIDERS.map((s) => (
            <div key={s.key}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{s.icon}</span> {s.label}
                </span>
                <span className="font-pixel" style={{ fontSize: 10, color: "var(--diamond)" }}>
                  {values[s.key]}{s.unit}
                </span>
              </div>
              <input
                type="range"
                className="mc-range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={values[s.key]}
                onChange={(e) => onChange({ [s.key]: Number(e.target.value) })}
                onMouseUp={() => sfx.pop()}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
