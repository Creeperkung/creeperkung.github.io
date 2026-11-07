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
/** One button inside a segmented group (see `Segment`). */
const seg = (active: boolean) =>
  `rounded-md px-3 py-1 text-sm font-medium transition-colors ${
    active ? "bg-[var(--series-1)] text-[#0a0f1a]" : "text-[var(--ink-2)] hover:bg-white/5 hover:text-[var(--ink)]"
  }`;

/** A labelled row of segmented buttons. */
function Segment({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</span>
      <div className="flex flex-wrap gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--page)]/60 p-0.5">{children}</div>
    </div>
  );
}

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

  const filtered = query !== "" || rarities.size > 0 || kind !== "any" || upgradableOnly;
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
        // compact theme picker, newest first: IS number only, full name in the tooltip and the results line
        <nav aria-label="Integrated Strategies theme" className="flex flex-wrap justify-center gap-2">
          {[
            { id: "all", label: "All themes", title: "Every theme", cn: false },
            ...[...data.themes].reverse().map((t) => ({
              id: t.id,
              label: themeShort(t.id),
              title: themeName(t, lang),
              cn: !t.servers.includes("en"),
            })),
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              title={t.cn ? `${t.title} (CN only)` : t.title}
              aria-pressed={theme === t.id}
              className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 font-mono text-sm font-semibold tracking-wider transition-colors ${
                theme === t.id
                  ? "border-[var(--series-1)] bg-[var(--series-1)] text-[#0a0f1a]"
                  : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--ink-2)] hover:border-[var(--series-1)] hover:text-[var(--ink)]"
              }`}
            >
              {t.label}
              {t.cn && <span className="text-[10px] opacity-70">CN</span>}
            </button>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 sm:p-4">
        <div className="relative">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search relics… (e.g. “ATK”, “Hope”, “希望”)"
            title="Searches names, effects and unlock conditions"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--page)] py-2.5 pl-9 pr-3 outline-none focus:border-[var(--series-1)]"
            aria-label="Search relics"
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Segment label="Rarity">
            {RARITIES.map((r) => (
              <button key={r} onClick={() => toggleRarity(r)} className={seg(rarities.has(r))} aria-pressed={rarities.has(r)}>
                {RARITY_LABEL[r]}
              </button>
            ))}
          </Segment>
          {(kindsInTheme.has("curse") || kindsInTheme.has("secret")) && (
            <Segment label="Type">
              {(["any", "standard", "curse", "secret"] as const)
                .filter((k) => k === "any" || kindsInTheme.has(k))
                .map((k) => (
                  <button key={k} onClick={() => setKind(k)} className={seg(kind === k)} aria-pressed={kind === k}>
                    {k === "any" ? "All" : k === "curse" ? "Cursed" : k[0].toUpperCase() + k.slice(1)}
                  </button>
                ))}
            </Segment>
          )}
          {upgradableInTheme > 0 && (
            <button
              onClick={() => setUpgradableOnly((v) => !v)}
              className={`rounded-lg border px-3 py-1 text-sm font-medium transition-colors ${
                upgradableOnly
                  ? "border-[var(--series-1)] bg-[var(--series-1)] text-[#0a0f1a]"
                  : "border-[var(--border)] text-[var(--ink-2)] hover:border-[var(--series-1)] hover:text-[var(--ink)]"
              }`}
              aria-pressed={upgradableOnly}
              title="Relics that get stronger -α/-β/-γ versions at higher difficulty"
            >
              Upgradable <span className="opacity-70">{upgradableInTheme}</span>
            </button>
          )}
          <label className="ml-auto flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-lg border border-[var(--border)] bg-[var(--page)] px-2 py-1 text-sm"
            >
              <option value="no">Collection #</option>
              <option value="rarity">Rarity</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>
      </div>

      <div className="-mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--ink-2)]">
        <p aria-live="polite">
          <strong className="text-[var(--ink)]">{visible.length}</strong> of {inTheme.length} relics
          {currentTheme && !single && (
            <span lang={htmlLang(currentTheme.names[lang] ? lang : "en")}> · {themeName(currentTheme, lang)}</span>
          )}
        </p>
        {filtered && (
          <button
            onClick={() => {
              setQuery("");
              setRarities(new Set());
              setKind("any");
              setUpgradableOnly(false);
            }}
            className="text-[var(--series-1)] hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

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
      className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] border-t-2 bg-[var(--surface-1)] p-4"
      style={{ borderTopColor: accent }}
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
        // flavor text collapsed by default so cards stay short
        <details className="group text-sm">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--ink-2)]">
            <span aria-hidden className="inline-block transition-transform group-open:rotate-90">
              ›
            </span>
            Description
          </summary>
          <p className="mt-1.5 whitespace-pre-line italic leading-relaxed text-[var(--muted)]" lang={textLang}>
            {text.flavor}
          </p>
        </details>
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
