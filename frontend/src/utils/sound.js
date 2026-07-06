// sound.js — tiny WebAudio synth for chunky 8-bit-style UI sound effects.
// No external audio files: everything is generated on the fly, so the
// app works offline and ships with zero binary assets.

let ctx = null;
let enabled = true;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function setSoundEnabled(v) {
  enabled = v;
}

export function isSoundEnabled() {
  return enabled;
}

function beep({ freq = 440, duration = 0.08, type = "square", volume = 0.06, slideTo = null, delay = 0 }) {
  if (!enabled) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    const t0 = c.currentTime + delay;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  } catch (e) {
    /* audio not available - fail silently */
  }
}

export const sfx = {
  click: () => beep({ freq: 320, duration: 0.05, type: "square", volume: 0.05 }),
  hover: () => beep({ freq: 880, duration: 0.03, type: "square", volume: 0.02 }),
  toggle: () => beep({ freq: 220, duration: 0.06, type: "triangle", slideTo: 440, volume: 0.05 }),
  success: () => {
    beep({ freq: 523, duration: 0.1, type: "square", volume: 0.05 });
    beep({ freq: 659, duration: 0.1, type: "square", volume: 0.05, delay: 0.1 });
    beep({ freq: 784, duration: 0.15, type: "square", volume: 0.05, delay: 0.2 });
  },
  alert: () => {
    beep({ freq: 200, duration: 0.12, type: "sawtooth", volume: 0.06 });
    beep({ freq: 160, duration: 0.16, type: "sawtooth", volume: 0.06, delay: 0.14 });
  },
  pop: () => beep({ freq: 700, duration: 0.04, type: "square", volume: 0.04, slideTo: 900 }),
  place: () => beep({ freq: 150, duration: 0.05, type: "square", volume: 0.05 }),
  message: () => beep({ freq: 1000, duration: 0.03, type: "sine", volume: 0.03 }),
  ejected: () => {
    beep({ freq: 440, duration: 0.3, type: "sawtooth", volume: 0.06, slideTo: 90 });
  },
  whoosh: () => beep({ freq: 100, duration: 0.4, type: "sine", volume: 0.05, slideTo: 400 }),
};
