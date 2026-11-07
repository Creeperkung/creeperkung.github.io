"use client";

import { useSyncExternalStore } from "react";
import { LANGS, Lang } from "@/lib/relics";

const LANG_KEY = "relic-index:lang";
const isLang = (x: unknown): x is Lang => LANGS.some((l) => l.id === x);
export const htmlLang = (l: Lang) => LANGS.find((x) => x.id === l)!.htmlLang;

/**
 * Sets or clears query params on the current URL without navigating, leaving
 * params owned by other components alone.
 */
export function setUrlParams(updates: Record<string, string | null>) {
  const p = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(updates)) {
    if (v) p.set(k, v);
    else p.delete(k);
  }
  const qs = p.toString();
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}

/** Adds ?lang= to an internal link so the language survives navigation. */
export const withLang = (href: string, lang: Lang) => (lang === "en" ? href : `${href}?lang=${lang}`);

// One site-wide language, shared by the top-bar dropdown and every page.
// Source of truth: ?lang= on first load, else the last one this browser picked, else English.
let current: Lang | null = null;
const listeners = new Set<() => void>();

function readInitial(): Lang {
  const p = new URLSearchParams(window.location.search).get("lang");
  if (isLang(p)) return p;
  try {
    const saved = window.localStorage.getItem(LANG_KEY);
    if (isLang(saved)) return saved;
  } catch {
    // storage blocked: fall through
  }
  return "en";
}

function setLang(l: Lang) {
  current = l;
  setUrlParams({ lang: l === "en" ? null : l });
  try {
    window.localStorage.setItem(LANG_KEY, l);
  } catch {
    // storage blocked: the choice still lives in the URL
  }
  listeners.forEach((fn) => fn());
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const snapshot = () => (current ??= readInitial());

/**
 * The site-wide text language and its setter. Static HTML renders English; the saved
 * choice applies right after hydration. Safe outside <Suspense> (no useSearchParams).
 */
export function useLang(): [Lang, (l: Lang) => void] {
  const lang = useSyncExternalStore(subscribe, snapshot, () => "en" as Lang);
  return [lang, setLang];
}

/** Language dropdown for the top bar. */
export function LangSelect() {
  const [lang, set] = useLang();
  return (
    <label className="relative flex items-center text-[var(--series-1)]" title="Text language">
      <span className="sr-only">Text language</span>
      <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute left-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
      <select
        value={lang}
        onChange={(e) => set(e.target.value as Lang)}
        className="h-8 appearance-none rounded-sm border border-[var(--border)] bg-[var(--page)] pl-8 pr-7 font-mono text-xs font-semibold uppercase tracking-widest text-[var(--ink)] outline-none hover:border-[var(--series-1)] focus:border-[var(--series-1)]"
      >
        {LANGS.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label} · {l.title}
          </option>
        ))}
      </select>
      <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute right-2 h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
  );
}

/** Small dashed tags explaining where shown text came from. */
export function SourceTags({ tl, fallback }: { tl?: "fan" | "partial"; fallback: boolean }) {
  const cls = "rounded border border-dashed border-[var(--border)] px-1.5 py-0.5 text-[var(--muted)]";
  return (
    <>
      {fallback && (
        <span className={cls} title="This theme isn't on the JP server yet, so there's no Japanese text. Showing English instead.">
          No JP text yet
        </span>
      )}
      {tl && (
        <span
          className={cls}
          title={
            tl === "fan"
              ? "CN-only content: unofficial English translation. Switch to CN to see the original text."
              : "Some of this CN-only text hasn't been translated yet."
          }
        >
          {tl === "fan" ? "Fan translation" : "Untranslated"}
        </span>
      )}
    </>
  );
}
