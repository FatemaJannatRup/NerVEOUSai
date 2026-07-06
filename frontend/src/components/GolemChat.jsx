import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { sfx } from "../utils/sound.js";

function TypewriterMarkdown({ text, onDone }) {
  const [shown, setShown] = useState("");
  const idxRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    setShown("");
    idxRef.current = 0;
    doneRef.current = false;
    let raf;
    let lastTick = performance.now();
    const CHARS_PER_TICK = 2;
    const TICK_MS = 12;

    function step(now) {
      if (now - lastTick >= TICK_MS) {
        lastTick = now;
        idxRef.current = Math.min(text.length, idxRef.current + CHARS_PER_TICK);
        setShown(text.slice(0, idxRef.current));
        if (idxRef.current % 6 === 0 && idxRef.current < text.length) sfx.message();
        if (idxRef.current >= text.length && !doneRef.current) {
          doneRef.current = true;
          onDone && onDone();
        }
      }
      if (idxRef.current < text.length) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const isTyping = shown.length < text.length;

  return (
    <div style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--text-secondary)" }}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p style={{ margin: "0 0 10px 0" }}>{children}</p>,
          strong: ({ children }) => <strong style={{ color: "var(--diamond)" }}>{children}</strong>,
          ul: ({ children }) => <ul style={{ margin: "0 0 10px 0", paddingLeft: 18 }}>{children}</ul>,
          li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
        }}
      >
        {shown}
      </ReactMarkdown>
      {isTyping && <span className="typing-cursor" />}
    </div>
  );
}

export default function GolemChat({ messages, loading, onAsk, selectedDistrict, onMessageDone }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  return (
    <div
      data-tour="chat"
      className="mc-panel"
      style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", minWidth: 0 }}
    >
      <div style={{ padding: "12px 16px", borderBottom: "3px solid #000", display: "flex", alignItems: "center", gap: 10 }}>
        <div
          className="pulse-anim"
          style={{
            width: 30, height: 30, background: "var(--enderman)", border: "3px solid #000",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0,
          }}
        >
          ✦
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="font-pixel" style={{ fontSize: 12, color: "var(--enderman)" }}>GOLEM</div>
          <div className="mono" style={{ fontSize: 12, color: "var(--text-tertiary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            climate analyst AI · {selectedDistrict || "Bangladesh"}
          </div>
        </div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mc-panel-inset"
              style={{ padding: 14 }}
            >
              {m.role === "user" ? (
                <div style={{ fontSize: 13, color: "var(--gold)" }}>
                  <span className="font-pixel" style={{ fontSize: 9, marginRight: 6 }}>YOU:</span>
                  {m.text}
                </div>
              ) : (
                <>
                  {m.source && (
                    <div
                      className="mono"
                      style={{
                        fontSize: 10,
                        letterSpacing: 0.4,
                        marginBottom: 8,
                        color: m.source.startsWith("ollama") ? "var(--diamond)" : "var(--text-tertiary)",
                      }}
                    >
                      {m.source.startsWith("ollama")
                        ? `⚡ live model · ${m.source.replace("ollama:", "")}`
                        : "📄 offline fallback — Ollama not reachable"}
                    </div>
                  )}
                  {m.streaming ? (
                    <TypewriterMarkdown text={m.text} onDone={() => onMessageDone && onMessageDone(m.id)} />
                  ) : (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p style={{ margin: "0 0 10px 0", fontSize: 13.5, lineHeight: 1.65, color: "var(--text-secondary)" }}>{children}</p>,
                        strong: ({ children }) => <strong style={{ color: "var(--diamond)" }}>{children}</strong>,
                        ul: ({ children }) => <ul style={{ margin: "0 0 10px 0", paddingLeft: 18, fontSize: 13.5, color: "var(--text-secondary)" }}>{children}</ul>,
                        li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
                      }}
                    >
                      {m.text}
                    </ReactMarkdown>
                  )}
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mc-panel-inset" style={{ padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                  style={{ width: 6, height: 6, background: "var(--enderman)", display: "inline-block" }}
                />
              ))}
            </div>
            <span className="mono" style={{ fontSize: 14, color: "var(--text-tertiary)" }}>Golem is thinking...</span>
          </motion.div>
        )}
      </div>

      <div style={{ padding: 14, borderTop: "3px solid #000" }}>
        <button
          className="mc-btn mc-btn-accent"
          style={{ width: "100%" }}
          disabled={loading}
          onClick={() => {
            sfx.click();
            onAsk();
          }}
        >
          {loading ? "..." : `✦ Ask Golem about ${selectedDistrict || "Bangladesh"}`}
        </button>
      </div>
    </div>
  );
}
