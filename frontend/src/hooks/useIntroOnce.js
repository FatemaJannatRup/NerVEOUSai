import { useState, useEffect } from "react";

// sessionStorage persists across a page refresh but is cleared when the
// tab/window closes and does NOT carry over to a new tab -- exactly the
// "show welcome only on a truly fresh visit" behavior we want.
const KEY = "nerveous_intro_seen_v1";

export function useIntroOnce() {
  const [seen, setSeen] = useState(() => {
    try {
      return sessionStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });

  const markSeen = () => {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setSeen(true);
  };

  return [seen, markSeen];
}
