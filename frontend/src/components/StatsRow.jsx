import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { interpolateForYear } from "./ControlPanel.jsx";
import { severityLabel } from "../utils/riskStyle.js";

function useCountUp(target, decimals = 0) {
  const [val, setVal] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const start = prev.current;
    prev.current = target;
    const t0 = performance.now();
    const dur = 700;
    let raf;
    function tick(now) {
      const t = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(start + (target - start) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString();
}

const META = [
  { key: "flood_risk_pct", label: "Flood Risk", icon: "🌊", unit: "%" },
  { key: "crop_loss_pct", label: "Crop Loss", icon: "🌾", unit: "%" },
  { key: "migration_people", label: "Migration", icon: "🚶", unit: "" },
  { key: "disease_risk_pct", label: "Disease Risk", icon: "🦠", unit: "%" },
  { key: "economic_damage_usd", label: "Econ. Damage", icon: "💰", unit: "" },
];

function StatSlot({ id, value }) {
  const meta = META.find((m) => m.key === id);
  const isCurrency = id === "economic_damage_usd";
  const isPeople = id === "migration_people";
  const numericTarget = isCurrency ? (value ?? 0) / 1_000_000 : value ?? 0;
  const display = useCountUp(numericTarget, isCurrency ? 1 : 0);

  const formatted = isCurrency ? `$${display}M` : isPeople ? display : `${display}${meta.unit}`;

  return (
    <motion.div layout whileHover={{ y: -3 }} className="item-slot" style={{ minWidth: 130, flex: 1 }}>
      <div style={{ fontSize: 20 }}>{meta.icon}</div>
      <div className="mono" style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>{meta.label}</div>
      <div className="font-pixel" style={{ fontSize: 15, color: "var(--text-primary)", marginTop: 6 }}>{formatted}</div>
    </motion.div>
  );
}

function HeartsRow({ severity }) {
  const filled = { safe: 8, moderate: 6, high: 3, severe: 1 }[severity] ?? 5;
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={`pixel-heart ${i < filled ? "" : "empty"}`} />
      ))}
    </div>
  );
}

export default function StatsRow({ prediction, year }) {
  const sev = prediction?.severity || "moderate";
  const sevMeta = severityLabel(prediction?.composite_score);

  const trendData = [2025, 2040, 2055, 2070, 2085, 2100].map((y) => {
    const v = interpolateForYear(y);
    const proxy = v.temperature_increase_c * 6 + v.sea_level_rise_m * 8 + v.cyclone_intensity_index * 3;
    return { year: y, risk: Math.round(Math.min(100, proxy)) };
  });

  return (
    <div data-tour="stats" className="mc-panel" style={{ padding: 14 }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "stretch" }}>
        <div className="mc-panel-inset" style={{ padding: 12, display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 150 }}>
          <div className="mono" style={{ fontSize: 12, color: "var(--text-tertiary)" }}>overall severity</div>
          <div className="font-pixel" style={{ fontSize: 13, color: sevMeta.color, margin: "6px 0" }}>{sevMeta.label}</div>
          <HeartsRow severity={sev} />
        </div>

        {META.map((m) => (
          <StatSlot key={m.key} id={m.key} value={prediction?.[m.key]} />
        ))}

        <div className="mc-panel-inset" style={{ padding: "8px 12px", flex: "1 1 240px", minWidth: 220 }}>
          <div className="mono" style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 2 }}>
            illustrative risk trajectory (2025 → 2100)
          </div>
          <ResponsiveContainer width="100%" height={70}>
            <LineChart data={trendData} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#8f8a7a" }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: "#211c30", border: "2px solid #000", fontSize: 12 }}
                labelStyle={{ color: "#4ce9e0" }}
              />
              <Line type="monotone" dataKey="risk" stroke="#4ce9e0" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
