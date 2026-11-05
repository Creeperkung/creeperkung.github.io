"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  RARITY_LABEL,
  Rarity,
  Relic,
  RelicData,
  RelicKind,
  themeShort,
} from "@/lib/relics";

type Sort = "no" | "name" | "rarity";
const RARITIES: Rarity[] = ["normal", "rare", "superRare"];
const RARITY_RANK: Record<Rarity, number> = { normal: 0, rare: 1, superRare: 2 };

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1 text-sm transition-colors ${
    active
      ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--page)]"
      : "border-[var(--border)] text-[var(--ink-2)] hover:border-[var(--ink-2)]"
  }`;

export function RelicBrowser({ data }: { data: RelicData }) {
  const newest = data.themes[data.themes.length - 1]?.id ?? "all";
  // Shareable state: ?theme=rogue_2&q=shield (rendered client-side under <Suspense>)
  const params = useSearchParams();
  const [theme, setTheme] = useState<string>(() => {
    const t = params.get("theme");
    return t && (t === "all" || data.themes.some((x) => x.id === t)) ? t : newest;
  });
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [rarities, setRarities] = useState<Set<Rarity>>(new Set());
  const [kind, setKind] = useState<RelicKind | "any">("any");
  const [sort, setSort] = useState<Sort>("no");

  useEffect(() => {
    const p = new URLSearchParams();
    if (theme !== newest) p.set("theme", theme);
    if (query) p.set("q", query);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [theme, query, newest]);

  const themeName = useMemo(
    () => Object.fromEntries(data.themes.map((t) => [t.id, t.name])),
    [data.themes]
  );

  const inTheme = useMemo(
    () => (theme === "all" ? data.relics : data.relics.filter((r) => r.theme === theme)),
    [data.relics, theme]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = inTheme.filter(
      (r) =>
        (rarities.size === 0 || rarities.has(r.rarity)) &&
        (kind === "any" || r.kind === kind) &&
        (!q ||
          r.name.toLowerCase().includes(q) ||
          r.effect.toLowerCase().includes(q) ||
          r.flavor.toLowerCase().includes(q))
    );
    if (sort === "name") out.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "rarity")
      out.sort((a, b) => RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity] || a.no - b.no);
    return out;
  }, [inTheme, query, rarities, kind, sort]);

  const kindsInTheme = useMemo(() => new Set(inTheme.map((r) => r.kind)), [inTheme]);

  function toggleRarity(r: Rarity) {
    setRarities((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Integrated Strategies theme" className="flex flex-wrap gap-2">
        {data.themes.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`rounded-lg border px-4 py-2 text-left transition-colors ${
              theme === t.id
                ? "border-[var(--series-1)] bg-[var(--surface-1)] shadow-sm"
                : "border-[var(--border)] hover:border-[var(--ink-2)]"
            }`}
            aria-pressed={theme === t.id}
          >
            <span className="block font-mono text-xs text-[var(--muted)]">{themeShort(t.id)}</span>
            <span className="block text-sm font-medium">{t.name}</span>
          </button>
        ))}
        <button
          onClick={() => setTheme("all")}
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            theme === "all"
              ? "border-[var(--series-1)] bg-[var(--surface-1)] shadow-sm"
              : "border-[var(--border)] hover:border-[var(--ink-2)]"
          }`}
          aria-pressed={theme === "all"}
        >
          All themes
        </button>
      </nav>

      <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, effect or description… (e.g. “ATK”, “Hope”, “Ingots”)"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--page)] px-3 py-2 outline-none focus:border-[var(--series-1)]"
          aria-label="Search relics"
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs uppercase tracking-wide text-[var(--muted)]">Rarity</span>
          {RARITIES.map((r) => (
            <button key={r} onClick={() => toggleRarity(r)} className={chip(rarities.has(r))} aria-pressed={rarities.has(r)}>
              {RARITY_LABEL[r]}
            </button>
          ))}
          {(kindsInTheme.has("curse") || kindsInTheme.has("secret")) && (
            <>
              <span className="ml-3 mr-1 text-xs uppercase tracking-wide text-[var(--muted)]">Type</span>
              {(["any", "standard", "curse", "secret"] as const)
                .filter((k) => k === "any" || kindsInTheme.has(k))
                .map((k) => (
                  <button key={k} onClick={() => setKind(k)} className={chip(kind === k)} aria-pressed={kind === k}>
                    {k === "any" ? "All" : k === "curse" ? "Cursed" : k[0].toUpperCase() + k.slice(1)}
                  </button>
                ))}
            </>
          )}
          <label className="ml-auto flex items-center gap-2 text-sm text-[var(--ink-2)]">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-md border border-[var(--border)] bg-[var(--page)] px-2 py-1"
            >
              <option value="no">Collection #</option>
              <option value="rarity">Rarity</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>
      </div>

      <p className="text-sm text-[var(--ink-2)]" aria-live="polite">
        Showing <strong className="text-[var(--ink)]">{visible.length}</strong> of {inTheme.length} relics
        {theme !== "all" && <> in {themeName[theme]}</>}
      </p>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--muted)]">
          No relics match those filters.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((r) => (
            <RelicCard key={r.id} relic={r} showTheme={theme === "all"} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RelicCard({ relic: r, showTheme }: { relic: Relic; showTheme: boolean }) {
  const accent = r.kind === "curse" ? "var(--relic-curse)" : `var(--rarity-${r.rarity})`;
  return (
    <li
      className="flex flex-col gap-2 rounded-xl border border-[var(--border)] border-l-4 bg-[var(--surface-1)] p-4"
      style={{ borderLeftColor: accent }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug">{r.name}</h3>
        <span className="shrink-0 font-mono text-xs text-[var(--muted)]">
          {showTheme && `${themeShort(r.theme)} · `}#{String(r.no).padStart(3, "0")}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 text-xs font-medium">
        <span className="rounded border px-1.5 py-0.5" style={{ color: `var(--rarity-${r.rarity})`, borderColor: "currentColor" }}>
          {RARITY_LABEL[r.rarity]}
        </span>
        {r.kind === "curse" && (
          <span className="rounded border px-1.5 py-0.5" style={{ color: "var(--relic-curse)", borderColor: "currentColor" }}>
            Cursed
          </span>
        )}
        {r.kind === "secret" && (
          <span className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[var(--ink-2)]">Secret</span>
        )}
      </div>
      <p className="text-sm leading-relaxed">{r.effect}</p>
      {r.flavor && (
        <p className="whitespace-pre-line text-sm italic leading-relaxed text-[var(--muted)]">{r.flavor}</p>
      )}
      {r.unlock && (
        <p className="mt-auto border-t border-[var(--border)] pt-2 text-xs text-[var(--ink-2)]">
          <span className="font-medium">Unlock:</span> {r.unlock}
        </p>
      )}
    </li>
  );
}
