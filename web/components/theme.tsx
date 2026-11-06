"use client";

import { useEffect, useState } from "react";

/**
 * Light / dark / art. With no saved choice the OS preference (prefers-color-scheme) picks
 * light or dark; a click saves an explicit choice via <html data-theme>. "art" is dark with
 * see-through panels over blurred IS banner art (see globals.css).
 */
type Mode = "light" | "dark" | "art";
const KEY = "rosmontis:theme";
const MODES: Mode[] = ["light", "dark", "art"];
const isMode = (x: unknown): x is Mode => MODES.includes(x as Mode);

/**
 * Runs in <head> before the page paints, so a saved choice never flashes the wrong theme.
 * Keep in sync with save() below.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark"||t==="art")document.documentElement.dataset.theme=t}catch(e){}`;

function effective(): Mode {
  const t = document.documentElement.dataset.theme;
  if (isMode(t)) return t;
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

const LABEL: Record<Mode, string> = { light: "Light mode", dark: "Dark mode", art: "Art background" };

function Icon({ mode }: { mode: Mode }) {
  const common = { "aria-hidden": true, viewBox: "0 0 24 24", className: "h-4 w-4", fill: "none", stroke: "currentColor", strokeWidth: 1.8 } as const;
  if (mode === "light")
    return (
      <svg {...common} strokeLinecap="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  if (mode === "dark")
    return (
      <svg {...common} strokeLinejoin="round">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
    );
  return (
    <svg {...common} strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m3 17 5-5 4 4 3-3 6 6" />
    </svg>
  );
}

/** Icon-only Light / Dark / Art switch for the top bar. */
export function ThemeToggle() {
  // unknown until mounted (the server can't know the OS theme); buttons keep their size
  const [mode, setMode] = useState<Mode | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from the pre-paint script / OS preference
    setMode(effective());
  }, []);

  return (
    <div role="radiogroup" aria-label="Color theme" className="flex rounded-sm border border-[var(--border)] p-0.5">
      {MODES.map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          aria-label={LABEL[m]}
          title={LABEL[m]}
          onClick={() => {
            save(m);
            setMode(m);
          }}
          className={`flex h-7 w-7 items-center justify-center rounded-sm transition-colors ${
            mode === m
              ? "bg-[var(--series-1)] text-[var(--page)]"
              : "text-[var(--series-1)] hover:bg-[var(--surface-1)]"
          }`}
        >
          <Icon mode={m} />
        </button>
      ))}
    </div>
  );
}
