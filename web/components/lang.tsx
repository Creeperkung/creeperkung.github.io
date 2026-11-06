"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
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

/**
 * Text language: ?lang=, else the last one this browser picked, else English.
 * Needs a <Suspense> boundary above it (useSearchParams).
 */
export function useLang(): [Lang, (l: Lang) => void] {
  const params = useSearchParams();
  const [lang, setLangState] = useState<Lang>(() => {
    const p = params.get("lang");
    if (isLang(p)) return p;
    try {
      const saved = window.localStorage.getItem(LANG_KEY);
      if (isLang(saved)) return saved;
    } catch {
      // storage blocked: fall through
    }
    return "en";
  });
  function setLang(l: Lang) {
    setLangState(l);
    setUrlParams({ lang: l === "en" ? null : l });
    try {
      window.localStorage.setItem(LANG_KEY, l);
    } catch {
      // storage blocked: the choice still lives in the URL
    }
  }
  return [lang, setLang];
}

export function LangSwitch({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Text language">
      <span className="mr-1 text-xs uppercase tracking-wide text-[var(--muted)]">Language</span>
      <div className="inline-flex overflow-hidden rounded-lg border border-[var(--border)]">
        {LANGS.map((l) => (
          <button
            key={l.id}
            onClick={() => onChange(l.id)}
            title={l.title}
            aria-pressed={lang === l.id}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              lang === l.id ? "bg-[var(--ink)] text-[var(--page)]" : "text-[var(--ink-2)] hover:bg-[var(--surface-1)]"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
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
