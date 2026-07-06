import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ControlPanel, { interpolateForYear } from "../components/ControlPanel.jsx";
import RiskMap from "../components/RiskMap.jsx";
import GolemChat from "../components/GolemChat.jsx";
import StatsRow from "../components/StatsRow.jsx";
import Tutorial from "../components/Tutorial.jsx";
import { useIntroOnce } from "../hooks/useIntroOnce.js";
import { fetchPrediction, fetchDistrictPredictions, fetchAdvice } from "../api.js";
import { sfx } from "../utils/sound.js";

const LAYOUT_KEY = "nerveousai-layout-v1";
const DEFAULT_LAYOUT = { left: 300, right: 400, stats: 148 };

function loadLayout() {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_LAYOUT, ...parsed };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function ResizeHandleX({ onDrag, onDone }) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const onMouseDown = (e) => {
    e.preventDefault();
    dragging.current = true;
    lastX.current = e.clientX;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (ev) => {
      if (!dragging.current) return;
      const delta = ev.clientX - lastX.current;
      lastX.current = ev.clientX;
      onDrag(delta);
    };
    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      onDone && onDone();
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div className="resize-handle-x" onMouseDown={onMouseDown} title="Drag to resize">
      <div className="resize-grip" />
    </div>
  );
}

function ResizeHandleY({ onDrag, onDone }) {
  const dragging = useRef(false);
  const lastY = useRef(0);

  const onMouseDown = (e) => {
    e.preventDefault();
    dragging.current = true;
    lastY.current = e.clientY;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (ev) => {
      if (!dragging.current) return;
      const delta = ev.clientY - lastY.current;
      lastY.current = ev.clientY;
      onDrag(delta);
    };
    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      onDone && onDone();
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div className="resize-handle-y" onMouseDown={onMouseDown} title="Drag to resize">
      <div className="resize-grip" />
    </div>
  );
}

const DEFAULT_VALUES = {
  temperature_increase_c: 3.2,
  sea_level_rise_m: 1.4,
  rainfall_change_pct: 20,
  cyclone_intensity_index: 7,
  humidity_pct: 81,
  river_overflow_index: 50,
  deforestation_pct: 14,
};

function round1(n) {
  return Math.round(n * 10) / 10;
}

let msgCounter = 0;
function nextId() {
  msgCounter += 1;
  return `m${Date.now()}_${msgCounter}`;
}

export default function Home() {
  const [introSeen, markIntroSeen] = useIntroOnce();
  const [values, setValues] = useState(DEFAULT_VALUES);
  const [year, setYear] = useState(2060);
  const [prediction, setPrediction] = useState(null);
  const [districtRisk, setDistrictRisk] = useState({});
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: nextId(),
      role: "assistant",
      text: "Hey! I'm **Golem**. Move some sliders, pick a district on the map, then hit *Ask Golem* and I'll break down what your scenario actually means. 🌍",
      streaming: false,
    },
  ]);
  const [loadingPredict, setLoadingPredict] = useState(false);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [toast, setToast] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [layout, setLayout] = useState(loadLayout);
  const prevSeverity = useRef(null);
  const debounceRef = useRef(null);

  const persistLayout = useCallback((next) => {
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors (e.g. private browsing)
    }
  }, []);

  const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

  const handleChange = (patch) => setValues((v) => ({ ...v, ...patch }));

  const handleApplyYear = () => {
    const suggested = interpolateForYear(year);
    const rounded = Object.fromEntries(Object.entries(suggested).map(([k, v]) => [k, round1(v)]));
    setValues(rounded);
  };

  const runPrediction = useCallback(async () => {
    setLoadingPredict(true);
    setApiError(null);
    try {
      const [pred, districtData] = await Promise.all([
        fetchPrediction(values),
        fetchDistrictPredictions(values),
      ]);
      setPrediction(pred);
      setDistrictRisk(districtData.districts);

      if (prevSeverity.current && prevSeverity.current !== pred.severity) {
        sfx.alert();
        setToast(`Risk shifted: ${prevSeverity.current.toUpperCase()} → ${pred.severity.toUpperCase()}`);
        setTimeout(() => setToast(null), 3200);
      }
      prevSeverity.current = pred.severity;
    } catch (e) {
      setApiError(
        "Can't reach the NerVEOUSai backend. Run `uvicorn main:app --reload --port 8000` inside /backend."
      );
    } finally {
      setLoadingPredict(false);
    }
  }, [values]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runPrediction, 350);
    return () => clearTimeout(debounceRef.current);
  }, [values, runPrediction]);

  const askGolem = useCallback(async () => {
    const userMsg = {
      id: nextId(),
      role: "user",
      text: selectedDistrict
        ? `What does this scenario mean for ${selectedDistrict}?`
        : "What does this scenario mean for Bangladesh overall?",
    };
    setMessages((m) => [...m, userMsg]);
    setLoadingAdvice(true);
    try {
      const result = await fetchAdvice(values, selectedDistrict);
      const aiMsg = { id: nextId(), role: "assistant", text: result.message, streaming: true, source: result.source };
      setMessages((m) => [...m, aiMsg]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { id: nextId(), role: "assistant", text: "Hmm, I couldn't reach my brain (the backend). Try again in a sec?", streaming: false },
      ]);
    } finally {
      setLoadingAdvice(false);
    }
  }, [values, selectedDistrict]);

  const handleMessageDone = (id) => {
    setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, streaming: false } : msg)));
  };

  return (
    <div style={{ height: "100vh", padding: "16px", display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>
      {!introSeen && <Tutorial onDone={markIntroSeen} />}

      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="float-anim" style={{ fontSize: 30 }}>🧊</div>
          <div>
            <div className="font-pixel" style={{ fontSize: 16, color: "var(--diamond)" }}>
              NerVEOUS<span style={{ color: "var(--gold)" }}>ai</span>
            </div>
            <div className="mono" style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              bangladesh climate craft — risk simulator
            </div>
          </div>
        </div>
        <button
          className="mc-btn mc-btn-ghost"
          onClick={() => {
            sfx.toggle();
            setValues({
              temperature_increase_c: round1(Math.random() * 6),
              sea_level_rise_m: round1(Math.random() * 5),
              rainfall_change_pct: round1(Math.random() * 80 - 20),
              cyclone_intensity_index: round1(Math.random() * 10),
              humidity_pct: round1(40 + Math.random() * 60),
              river_overflow_index: round1(Math.random() * 100),
              deforestation_pct: round1(Math.random() * 80),
            });
          }}
        >
          🎲 Randomize
        </button>
      </motion.header>

      {apiError && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mc-panel" style={{ padding: 12, borderColor: "var(--redstone)", color: "var(--redstone)", fontSize: 13, flexShrink: 0 }}>
          ⚠️ {apiError}
        </motion.div>
      )}

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div style={{ width: layout.left, flexShrink: 0, minWidth: 220 }}>
          <ControlPanel values={values} year={year} onChange={handleChange} onYearChange={setYear} onApplyYear={handleApplyYear} />
        </div>

        <ResizeHandleX
          onDrag={(delta) =>
            setLayout((l) => ({ ...l, left: clamp(l.left + delta, 220, 520) }))
          }
          onDone={() => persistLayout(layout)}
        />

        <div style={{ flex: 1, minWidth: 300 }}>
          <RiskMap
            riskByDistrict={districtRisk}
            selectedDistrict={selectedDistrict}
            onSelectDistrict={(name) => {
              sfx.pop();
              setSelectedDistrict(name);
            }}
            loading={loadingPredict && Object.keys(districtRisk).length === 0}
          />
        </div>

        <ResizeHandleX
          onDrag={(delta) =>
            setLayout((l) => ({ ...l, right: clamp(l.right - delta, 280, 640) }))
          }
          onDone={() => persistLayout(layout)}
        />

        <div style={{ width: layout.right, flexShrink: 0, minWidth: 280 }}>
          <GolemChat
            messages={messages}
            loading={loadingAdvice}
            onAsk={askGolem}
            selectedDistrict={selectedDistrict}
            onMessageDone={handleMessageDone}
          />
        </div>
      </div>

      <ResizeHandleY
        onDrag={(delta) =>
          setLayout((l) => ({ ...l, stats: clamp(l.stats - delta, 90, 340) }))
        }
        onDone={() => persistLayout(layout)}
      />

      <div style={{ height: layout.stats, flexShrink: 0, overflowY: "auto", overflowX: "hidden" }}>
        <StatsRow prediction={prediction} year={year} />
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 40, x: "-50%" }}
            className="mc-toast"
            style={{ position: "fixed", bottom: 20, left: "50%", zIndex: 5000 }}
          >
            ⚡ {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
