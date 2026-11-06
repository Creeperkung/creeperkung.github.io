"use client";

import { useEffect, useState } from "react";

/**
 * Light / dark only. With no saved choice the OS preference (prefers-color-scheme) applies;
 * the first click saves an explicit choice via <html data-theme>.
 */
type Mode = "light" | "dark";
const KEY = "rosmontis:theme";

/**
 * Runs in <head> before the page paints, so a saved choice never flashes the wrong theme.
 * Keep in sync with save() below.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

function effective(): Mode {
  const t = document.documentElement.dataset.theme;
  if (t === "light" || t === "dark") return t;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function save(mode: Mode) {
  document.documentElement.dataset.theme = mode;
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // storage blocked: the choice still applies until the page is closed
  }
}

/** Icon-only light/dark toggle for the top bar: shows the mode you'd switch to. */
export function ThemeToggle() {
  // unknown until mounted (the server can't know the OS theme); the button keeps its size
  const [mode, setMode] = useState<Mode | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from the pre-paint script / OS preference
    setMode(effective());
  }, []);

  const next: Mode = mode === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => {
        save(next);
        setMode(next);
      }}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--border)] text-[var(--series-1)] transition-colors hover:border-[var(--series-1)]"
    >
      {mode === null ? null : mode === "dark" ? (
        // sun: currently dark, click for light
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // moon: currently light, click for dark
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  );
}
