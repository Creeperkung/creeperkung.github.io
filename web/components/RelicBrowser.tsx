"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SourceTags, htmlLang, setUrlParams } from "@/components/lang";
import {
  Lang,
  RARITY_LABEL,
  Rarity,
  Relic,
  RelicData,
  RelicKind,
  UpgradeText,
  pickText,
  relicText,
  themeName,
  themeShort,
} from "@/lib/relics";

type Sort = "no" | "name" | "rarity";
const RARITIES: Rarity[] = ["normal", "rare", "superRare"];
const RARITY_RANK: Record<Rarity, number> = { normal: 0, rare: 1, superRare: 2 };
const chip = (active: boolean) =>
  `rounded-sm border px-3 py-1 text-sm transition-colors ${
    active
      ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--page)]"
      : "border-[var(--border)] text-[var(--ink-2)] hover:border-[var(--ink-2)]"
  }`;

/**
 * Relic list with search and filters. With a single theme in `data` the theme
 * tabs are hidden. Shareable state: ?theme=rogue_2&q=shield (needs <Suspense>).
 */
export function RelicBrowser({ data, lang }: { data: RelicData; lang: Lang }) {
  const single = data.themes.length === 1;
  const newest = data.themes[data.themes.length - 1]?.id ?? "all";
  const params = useSearchParams();
  const [theme, setTheme] = useState<string>(() => {
    const t = params.get("theme");
    return t && (t === "all" || data.themes.some((x) => x.id === t)) ? t : newest;
  });
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [rarities, setRarities] = useState<Set<Rarity>>(new Set());
  const [kind, setKind] = useState<RelicKind | "any">("any");
  const [sort, setSort] = useState<Sort>("no");
  const [upgradableOnly, setUpgradableOnly] = useState(false);

  useEffect(() => {
    setUrlParams({ theme: single || theme === newest ? null : theme, q: query || null });
  }, [theme, query, newest, single]);

  const currentTheme = data.themes.find((t) => t.id === theme);

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
        (!upgradableOnly || Boolean(r.upgrades)) &&
        (!q || searchText(r).includes(q))
    );
    if (sort === "name") {
      const name = (r: Relic) => relicText(r, lang).text.name;
      out.sort((a, b) => name(a).localeCompare(name(b), htmlLang(lang)));
    } else if (sort === "rarity")
      out.sort((a, b) => RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity] || a.no - b.no);
    return out;
  }, [inTheme, query, rarities, kind, upgradableOnly, sort, lang]);

  const kindsInTheme = useMemo(() => new Set(inTheme.map((r) => r.kind)), [inTheme]);
  const upgradableInTheme = useMemo(() => inTheme.filter((r) => r.upgrades).length, [inTheme]);

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
      {!single && (
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
              <span className="flex items-center gap-1.5 font-mono text-xs text-[var(--muted)]">
                {themeShort(t.id)}
                {!t.servers.includes("en") && (
                  <span
                    className="rounded border border-[var(--border)] px-1 text-[10px] font-semibold text-[var(--ink-2)]"
                    title="Only released on the CN server so far"
                  >
                    CN only
                  </span>
                )}
              </span>
              <span className="block text-sm font-medium" lang={htmlLang(t.names[lang] ? lang : "en")}>
                {themeName(t, lang)}
              </span>
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
      )}

      <div className="flex flex-col gap-3 rounded-sm border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search names, effects and unlock conditions in English, 日本語 or 中文 (e.g. “ATK”, “Hope”, “希望”)"
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
          {upgradableInTheme > 0 && (
            <button
              onClick={() => setUpgradableOnly((v) => !v)}
              className={`ml-3 ${chip(upgradableOnly)}`}
              aria-pressed={upgradableOnly}
              title="Relics that get stronger -α/-β/-γ versions at higher difficulty"
            >
              Difficulty upgrades <span className="opacity-70">{upgradableInTheme}</span>
            </button>
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
        {currentTheme && !single && <> in {themeName(currentTheme, lang)}</>}
      </p>

      {visible.length === 0 ? (
        <p className="rounded-sm border border-dashed border-[var(--border)] p-10 text-center text-[var(--muted)]">
          No relics match those filters.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((r) => (
            <RelicCard key={r.id} relic={r} lang={lang} showTheme={theme === "all"} />
          ))}
        </ul>
      )}
    </div>
  );
}

// Lowercased name, effect and unlock condition in every language, cached per relic.
// The flavor text (the grey description) is left out on purpose: it matches too loosely.
const searchCache = new WeakMap<Relic, string>();
function searchText(r: Relic) {
  let s = searchCache.get(r);
  if (s === undefined) {
    s = [
      ...Object.values(r.text).flatMap((t) => (t ? [t.name, t.effect, t.unlock] : [])),
      ...(r.upgrades ?? []).flatMap((u) => Object.values(u.text).flatMap((t) => (t ? [t.name, t.effect] : []))),
    ]
      .filter(Boolean)
      .join("\n")
      .toLowerCase();
    searchCache.set(r, s);
  }
  return s;
}

function RelicCard({ relic: r, lang, showTheme }: { relic: Relic; lang: Lang; showTheme: boolean }) {
  const accent = r.kind === "curse" ? "var(--relic-curse)" : `var(--rarity-${r.rarity})`;
  const { text, lang: shown, fallback } = relicText(r, lang);
  const textLang = htmlLang(shown);
  return (
    <li
      className="ak-brackets flex flex-col gap-2 rounded-sm border border-[var(--border)] border-l-4 bg-[var(--surface-1)] p-4"
      style={{ borderLeftColor: accent }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[var(--icon-well)]">
          {r.icon ? (
            // Static, pre-sized 128px WebP files; next/image optimization adds nothing here.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/relics/${r.id}.webp`} alt="" width={56} height={56} loading="lazy" decoding="async" />
          ) : (
            <span className="text-xl text-[var(--muted)]" aria-hidden>
              ?
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 font-semibold leading-snug" lang={textLang}>
              {text.name}
            </h3>
            <span className="shrink-0 font-mono text-xs text-[var(--muted)]">
              {showTheme && `${themeShort(r.theme)} · `}#{String(r.no).padStart(3, "0")}
            </span>
          </div>
          <RelicTags relic={r} shown={shown} fallback={fallback} />
        </div>
      </div>
      <p className="text-sm leading-relaxed" lang={textLang}>
        {text.effect}
      </p>
      {text.flavor && (
        <p className="whitespace-pre-line text-sm italic leading-relaxed text-[var(--muted)]" lang={textLang}>
          {text.flavor}
        </p>
      )}
      {r.upgrades && <Upgrades relic={r} lang={lang} />}
      {text.unlock && (
        <p className="mt-auto border-t border-[var(--border)] pt-2 text-xs text-[var(--ink-2)]">
          <span className="font-medium">Unlock:</span> <span lang={textLang}>{text.unlock}</span>
        </p>
      )}
    </li>
  );
}

/** The -α/-β/-γ versions that replace this relic at higher difficulty. Collapsed by default. */
function Upgrades({ relic: r, lang }: { relic: Relic; lang: Lang }) {
  const base = relicText(r, lang).text.name;
  return (
    <details className="group rounded-lg border border-[var(--border)] text-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 font-medium text-[var(--ink-2)] hover:text-[var(--ink)]">
        <span>Difficulty upgrades</span>
        <span className="text-xs font-normal text-[var(--muted)]">
          from {r.upgrades!.map((u) => u.grade).join(" / ")}
          <span aria-hidden className="ml-1.5 inline-block transition-transform group-open:rotate-90">
            ›
          </span>
        </span>
      </summary>
      <dl className="flex flex-col gap-2 border-t border-[var(--border)] px-3 py-2">
        {r.upgrades!.map((u) => {
          const { text, lang: shown, fallback } = pickText<UpgradeText>(u.text, lang);
          // "Topographical Map - α" → "α"
          const tier = text.name.startsWith(base) ? text.name.slice(base.length).replace(/^[\s\-－·・]+/, "") : text.name;
          return (
            <div key={u.id} className="flex flex-col gap-0.5">
              <dt className="flex flex-wrap items-center gap-1.5 font-medium">
                <span lang={htmlLang(shown)} title={text.name}>
                  {tier || text.name}
                </span>
                <span className="text-xs font-normal text-[var(--muted)]">Difficulty {u.grade}+</span>
                <SourceTags tl={shown === "en" ? u.text.en.tl : undefined} fallback={fallback} />
              </dt>
              <dd className="leading-relaxed" lang={htmlLang(shown)}>
                {text.effect}
              </dd>
            </div>
          );
        })}
      </dl>
    </details>
  );
}

function RelicTags({ relic: r, shown, fallback }: { relic: Relic; shown: Lang; fallback: boolean }) {
  return (
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
      {r.upgrades && (
        <span
          className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[var(--ink-2)]"
          title={`Gets stronger at difficulty ${r.upgrades.map((u) => u.grade).join(", ")} and above`}
        >
          Upgradable
        </span>
      )}
      <SourceTags tl={shown === "en" ? r.text.en.tl : undefined} fallback={fallback} />
    </div>
  );
}
