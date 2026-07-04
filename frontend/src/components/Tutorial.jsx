import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfx } from "../utils/sound.js";

// Each step targets a DOM element via data-tour="<id>" so the spotlight
// is always accurate regardless of screen size (no hardcoded pixel math).
const STEPS = [
  {
    target: "map",
    title: "🗺️ The Big Green Map",
    body: [
      "This is Bangladesh, live. Every district glows a different color based on predicted risk. Wanna see what happens when the sea rises 3 meters? Click a district and find out. 👀",
      "This whole map updates in real time as you mess with the sliders. It's basically a crystal ball, but made of code.",
    ],
  },
  {
    target: "year",
    title: "🕐 Time Machine, Basically",
    body: [
      "Drag this to jump anywhere from 2025 to 2100. Yes, you can time-travel to a very soggy 2100 if you're feeling brave.",
      "Pick a year and hit auto-fill — the whole scenario snaps to what scientists project for that timeline. No cap.",
    ],
  },
  {
    target: "sliders",
    title: "⚙️ Break the Climate (Simulated, Promise)",
    body: [
      "Crank the temperature slider all the way up. Go on. We'll wait. See how fast the map turns red? That's not a bug, that's science. 🔥",
      "Every slider here feeds straight into 5 real trained AI models. Nothing here is hardcoded — it's all predictions, baby.",
    ],
  },
  {
    target: "chat",
    title: "✦ Say Hi to Golem",
    body: [
      "This is Golem, your AI analyst. Ask it what a scenario means and watch it actually type it out like it's thinking. Kinda unsettling, kinda cool.",
      "Click any district, then hit 'Ask Golem' — it'll break down the risk in plain English, no boomer jargon.",
    ],
  },
  {
    target: "stats",
    title: "📊 The Receipts",
    body: [
      "Flood risk, crop loss, migration, disease, economic damage — all right here, animating like a loot drop every time you change something.",
      "These numbers are the actual model outputs. Screenshot 'em, flex 'em, whatever you want.",
    ],
  },
];

function EjectionIntro({ onDone }) {
  const [phase, setPhase] = useState(0); // 0 = flying, 1 = text reveal

  useEffect(() => {
    sfx.whoosh();
    const t1 = setTimeout(() => {
      sfx.ejected();
      setPhase(1);
    }, 1400);
    const t2 = setTimeout(onDone, 3400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="intro-stage">
      <div className="intro-stars" />
      <motion.div
        initial={{ x: -200, y: 0, rotate: 0, opacity: 1 }}
        animate={{ x: [-200, 40, 500], y: [0, -30, 260], rotate: [0, 540, 900] }}
        transition={{ duration: 1.4, ease: "easeIn" }}
        style={{ position: "absolute" }}
      >
        <div className="crewmate">
          <div className="crewmate-backpack" />
          <div className="crewmate-body">
            <div className="crewmate-visor" />
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {phase === 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 14 }}
            style={{ textAlign: "center", zIndex: 2 }}
          >
            <div style={{ fontFamily: "var(--font-pixel)", fontSize: 22, color: "var(--redstone)", marginBottom: 10 }}>
              CLIMATE DENIAL
            </div>
            <div style={{ fontFamily: "var(--font-pixel)", fontSize: 14, color: "var(--text-secondary)" }}>
              WAS EJECTED.
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, color: "var(--diamond)", marginTop: 18 }}>
              loading real data instead...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WelcomeCard({ onStart, onSkip }) {
  return (
    <div className="intro-stage" style={{ background: "rgba(10, 8, 16, 0.92)" }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 18 }}
        className="mc-panel"
        style={{ width: "min(520px, 90vw)", padding: 28, textAlign: "center" }}
      >
        <div style={{ fontSize: 40, marginBottom: 6 }} className="float-anim">🧊</div>
        <div className="font-pixel" style={{ fontSize: 20, color: "var(--diamond)", marginBottom: 6 }}>
          NerVEOUS<span style={{ color: "var(--gold)" }}>ai</span>
        </div>
        <div className="mono" style={{ fontSize: 15, color: "var(--text-tertiary)", marginBottom: 18, letterSpacing: 1 }}>
          BANGLADESH CLIMATE CRAFT — RISK SIMULATOR
        </div>
        <div className="mc-panel-inset" style={{ padding: 16, fontSize: 14, lineHeight: 1.6, color: "var(--text-secondary)", marginBottom: 18 }}>
          Slide into any future scenario, watch 5 real AI models predict what happens to
          Bangladesh, and let Golem explain it like your smartest friend. No cap, no boring
          spreadsheets. <strong style={{ color: "var(--text-primary)" }}>Just click stuff and see what happens.</strong>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20, textAlign: "left" }}>
          {[
            "Click anywhere on the map to pick a district",
            "Drag sliders / pick a year to build a scenario",
            "Ask Golem — it explains it live, typing and everything",
          ].map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span className="mc-panel-inset" style={{ fontFamily: "var(--font-pixel)", fontSize: 10, padding: "4px 8px", flexShrink: 0 }}>
                {i + 1}
              </span>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            className="mc-btn mc-btn-primary"
            onClick={() => {
              sfx.click();
              onStart();
            }}
          >
            Show Me How →
          </button>
          <button
            className="mc-btn mc-btn-ghost"
            onClick={() => {
              sfx.click();
              onSkip();
            }}
          >
            Skip, I've Got It
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function SpotlightStep({ step, index, total, onNext, onSkip }) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    function measure() {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12 });
      }
    }
    measure();
    window.addEventListener("resize", measure);
    const t = setTimeout(measure, 50);
    return () => {
      window.removeEventListener("resize", measure);
      clearTimeout(t);
    };
  }, [step]);

  const body = step.body[index % step.body.length];

  let cardStyle = { top: 100, left: 100 };
  if (rect) {
    const cardWidth = 300;
    const preferRight = rect.left + rect.width + 20 + cardWidth < window.innerWidth;
    cardStyle = {
      top: Math.min(Math.max(rect.top, 16), window.innerHeight - 260),
      left: preferRight ? rect.left + rect.width + 20 : Math.max(16, rect.left - cardWidth - 20),
    };
  }

  return (
    <div className="tutorial-backdrop">
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(4,4,8,0.78)",
          zIndex: 8000,
          clipPath: rect
            ? `polygon(0% 0%, 0% 100%, ${rect.left}px 100%, ${rect.left}px ${rect.top}px, ${rect.left + rect.width}px ${rect.top}px, ${rect.left + rect.width}px ${rect.top + rect.height}px, ${rect.left}px ${rect.top + rect.height}px, ${rect.left}px 100%, 100% 100%, 100% 0%)`
            : undefined,
        }}
      />
      {rect && <div className="tutorial-spotlight" style={rect} />}
      <div className="tutorial-card" style={cardStyle}>
        <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                height: 5,
                flex: 1,
                background: i <= index ? "var(--diamond)" : "rgba(255,255,255,0.15)",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>
        <div className="font-pixel" style={{ fontSize: 12, color: "var(--diamond)", marginBottom: 10 }}>
          {step.title}
        </div>
        <div style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
          {body}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="mono" style={{ fontSize: 15, color: "var(--text-tertiary)" }}>
            {index + 1} / {total}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="mc-btn mc-btn-ghost" style={{ fontSize: 9, padding: "8px 10px" }} onClick={onSkip}>
              Skip
            </button>
            <button
              className="mc-btn mc-btn-primary"
              style={{ fontSize: 9, padding: "8px 12px" }}
              onClick={() => {
                sfx.pop();
                onNext();
              }}
            >
              {index >= total - 1 ? "Let's gooo" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Tutorial({ onDone }) {
  // phase: 'eject' -> 'welcome' -> 'steps' -> done
  const [phase, setPhase] = useState("eject");
  const [stepIndex, setStepIndex] = useState(0);

  if (phase === "eject") {
    return <EjectionIntro onDone={() => setPhase("welcome")} />;
  }

  if (phase === "welcome") {
    return (
      <WelcomeCard
        onStart={() => setPhase("steps")}
        onSkip={() => {
          sfx.toggle();
          onDone();
        }}
      />
    );
  }

  if (phase === "steps") {
    return (
      <SpotlightStep
        step={STEPS[stepIndex]}
        index={stepIndex}
        total={STEPS.length}
        onNext={() => {
          if (stepIndex >= STEPS.length - 1) {
            sfx.success();
            onDone();
          } else {
            setStepIndex((s) => s + 1);
          }
        }}
        onSkip={() => {
          sfx.toggle();
          onDone();
        }}
      />
    );
  }

  return null;
}
