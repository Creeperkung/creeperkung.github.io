"use client";

import { useEffect, useState } from "react";

/** "system" follows the OS (prefers-color-scheme); light/dark force it via <html data-theme>. */
export type ThemeChoice = "system" | "light" | "dark";
const KEY = "rosmontis:theme";
const CHOICES: { id: ThemeChoice; label: string; icon: string }[] = [
  { id: "system", label: "System", icon: "◐" },
  { id: "light", label: "Light", icon: "☀" },
  { id: "dark", label: "Dark", icon: "☾" },
];

/**
 * Runs in <head> before the page paints, so a saved choice never flashes the wrong theme.
 * Keep in sync with apply() below.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
  try {
    if (choice === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // storage blocked: the choice still applies until the page is closed
  }
}

/** System / Light / Dark switch for the top bar. */
export function ThemeSwitch() {
  // Server render and first client render both use "system"; the real choice is read after mount.
  const [choice, setChoice] = useState<ThemeChoice>("system");
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from the pre-paint script's result
    if (t === "light" || t === "dark") setChoice(t);
  }, []);

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="ml-auto flex rounded-lg border border-[var(--border)] p-0.5 text-xs"
    >
      {CHOICES.map((c) => (
        <button
          key={c.id}
          role="radio"
          aria-checked={choice === c.id}
          title={c.label}
          onClick={() => {
            setChoice(c.id);
            apply(c.id);
          }}
          className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
            choice === c.id ? "bg-[var(--ink)] text-[var(--page)]" : "text-[var(--ink-2)] hover:text-[var(--ink)]"
          }`}
        >
          <span aria-hidden>{c.icon}</span>
          <span className="hidden sm:inline">{c.label}</span>
        </button>
      ))}
    </div>
  );
}
