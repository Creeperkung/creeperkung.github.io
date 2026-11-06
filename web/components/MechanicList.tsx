"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SourceTags, htmlLang, setUrlParams } from "@/components/lang";
import { KIND_LABEL, MechanicEntry, MechanicKind, MechanicSection, MechanicText } from "@/lib/mechanics";
import { Lang, pickText } from "@/lib/relics";

const KIND_COLOR: Record<MechanicKind, string> = {
  debuff: "var(--relic-curse)",
  buff: "var(--series-1)",
  mixed: "var(--ink-2)",
  item: "var(--kind-item)",
};

const chip = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
    active
      ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--page)]"
      : "border-[var(--border)] text-[var(--ink-2)] hover:border-[var(--ink-2)]"
  }`;

type Sort = "default" | "name";

// Lowercased name, effect and stage text in every language, cached per entry.
// Flavor text is left out on purpose, as in the relic search.
const searchCache = new WeakMap<MechanicEntry, string>();
function searchText(e: MechanicEntry) {
  let s = searchCache.get(e);
  if (s === undefined) {
    s = Object.values(e.text)
      .flatMap((t) => (t ? [t.name, t.effect, ...(t.levels ?? []).flatMap((l) => [l.label, l.effect])] : []))
      .filter(Boolean)
      .join("\n")
      .toLowerCase();
    searchCache.set(e, s);
  }
  return s;
}

/**
 * Every section of one theme of the given kinds, each with its entries, plus a search box
 * (?q=, needs <Suspense>) and a sort. Sections with groups get group filter chips.
 */
export function MechanicList({ sections, lang }: { sections: MechanicSection[]; lang: Lang }) {
  const params = useSearchParams();
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [sort, setSort] = useState<Sort>("default");
  useEffect(() => setUrlParams({ q: query || null }), [query]);

  const q = query.trim().toLowerCase();
  const total = sections.reduce((n, s) => n + s.entries.length, 0);
  const matching = useMemo(
    () => (q ? sections.reduce((n, s) => n + s.entries.filter((e) => searchText(e).includes(q)).length, 0) : total),
    [sections, q, total],
  );

  if (sections.length === 0)
    return (
      <p className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--muted)]">
        Nothing here for this theme yet.
      </p>
    );
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search names and effects in English, 日本語 or 中文"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--page)] px-3 py-2 outline-none focus:border-[var(--series-1)]"
          aria-label="Search"
        />
        <div className="flex flex-wrap items-center gap-2">
          {sections.length > 1 &&
            sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-full border border-[var(--border)] px-3 py-1 text-sm text-[var(--ink-2)] hover:border-[var(--ink-2)]"
              >
                {s.title} <span className="text-[var(--muted)]">{s.entries.length}</span>
              </a>
            ))}
          <label className="ml-auto flex items-center gap-2 text-sm text-[var(--ink-2)]">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-md border border-[var(--border)] bg-[var(--page)] px-2 py-1"
            >
              <option value="default">Collection order</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>
      </div>
      {q && (
        <p className="-mt-4 text-sm text-[var(--ink-2)]" aria-live="polite">
          Showing <strong className="text-[var(--ink)]">{matching}</strong> of {total}
        </p>
      )}
      {q && matching === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--muted)]">
          Nothing matches “{query}”.
        </p>
      ) : (
        sections.map((s) => <Section key={s.id} section={s} lang={lang} q={q} sort={sort} />)
      )}
    </div>
  );
}

function Section({ section: s, lang, q, sort }: { section: MechanicSection; lang: Lang; q: string; sort: Sort }) {
  // group filter: empty = all groups
  const [only, setOnly] = useState<Set<string>>(new Set());
  const groups = s.groups?.filter((g) => s.entries.some((e) => e.group === g.id)) ?? [];
  const groupName = (g: (typeof groups)[number]) => g.name[lang] ?? g.name.en ?? g.id;

  const entries = useMemo(() => {
    const out = s.entries.filter(
      (e) => (!q || searchText(e).includes(q)) && (only.size === 0 || (e.group !== undefined && only.has(e.group))),
    );
    if (sort === "name") {
      const name = (e: MechanicEntry) => pickText<MechanicText>(e.text, lang).text.name.replace(/^[“"'‘]/, "");
      out.sort((a, b) => name(a).localeCompare(name(b), htmlLang(lang)));
    }
    return out;
  }, [s.entries, q, only, sort, lang]);

  if (q && entries.length === 0) return null;
  const shownGroups = groups.filter((g) => entries.some((e) => e.group === g.id));
  const ungrouped = entries.filter((e) => !groups.some((g) => g.id === e.group));

  function toggle(id: string) {
    setOnly((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section id={s.id} className="flex scroll-mt-6 flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight">{s.title}</h2>
          <span
            className="rounded border px-1.5 py-0.5 text-xs font-medium"
            style={{ color: KIND_COLOR[s.kind], borderColor: "currentColor" }}
          >
            {KIND_LABEL[s.kind]}
          </span>
          <span className="text-sm text-[var(--muted)]">
            {entries.length === s.entries.length ? s.entries.length : `${entries.length} of ${s.entries.length}`}
          </span>
        </div>
        {s.summary && <p className="max-w-3xl text-sm text-[var(--ink-2)]">{s.summary}</p>}
      </header>
      {groups.length > 1 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Filter ${s.title}`}>
          <button onClick={() => setOnly(new Set())} className={chip(only.size === 0)} aria-pressed={only.size === 0}>
            All
          </button>
          {groups.map((g) => (
            <button key={g.id} onClick={() => toggle(g.id)} className={chip(only.has(g.id))} aria-pressed={only.has(g.id)}>
              {g.icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/mechanics/group-${s.id}-${g.id}.webp`} alt="" width={18} height={18} className="-ml-1" />
              )}
              <span lang={htmlLang(g.name[lang] ? lang : "en")}>{groupName(g)}</span>
              <span className="opacity-70">{s.entries.filter((e) => e.group === g.id).length}</span>
            </button>
          ))}
        </div>
      )}
      {shownGroups.map((g) => (
        <div key={g.id} className="flex flex-col gap-3">
          <h3 className="flex items-center gap-2.5 text-sm font-semibold text-[var(--ink-2)]">
            {g.icon && (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--icon-well)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/mechanics/group-${s.id}-${g.id}.webp`} alt="" width={30} height={30} loading="lazy" decoding="async" />
              </span>
            )}
            <span>
              <span lang={htmlLang(g.name[lang] ? lang : "en")}>{groupName(g)}</span>
              {g.note && (
                <span className="ml-2 font-normal text-[var(--muted)]" lang={htmlLang(g.note[lang] ? lang : "en")}>
                  — {g.note[lang] ?? g.note.en}
                </span>
              )}
            </span>
          </h3>
          <Grid entries={entries.filter((e) => e.group === g.id)} kind={s.kind} lang={lang} />
        </div>
      ))}
      {ungrouped.length > 0 && <Grid entries={ungrouped} kind={s.kind} lang={lang} />}
    </section>
  );
}

function Grid({ entries, kind, lang }: { entries: MechanicEntry[]; kind: MechanicKind; lang: Lang }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {entries.map((e) => (
        <Card key={e.id} entry={e} kind={kind} lang={lang} />
      ))}
    </ul>
  );
}

function Card({ entry: e, kind, lang }: { entry: MechanicEntry; kind: MechanicKind; lang: Lang }) {
  const { text, lang: shown, fallback } = pickText<MechanicText>(e.text, lang);
  const textLang = htmlLang(shown);
  const effective: MechanicKind = e.positive === undefined ? kind : e.positive ? "buff" : "debuff";
  return (
    <li
      className="flex flex-col gap-2 rounded-xl border border-[var(--border)] border-l-4 bg-[var(--surface-1)] p-4"
      style={{ borderLeftColor: KIND_COLOR[effective] }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[var(--icon-well)]">
          {e.icon ? (
            // Static, pre-sized 128px WebP files; next/image optimization adds nothing here.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/mechanics/${e.id}.webp`} alt="" width={48} height={48} loading="lazy" decoding="async" />
          ) : (
            <span className="text-lg font-semibold text-[var(--muted)]" aria-hidden lang={textLang}>
              {[...text.name.replace(/^[“"'‘]/, "")][0]}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h4 className="font-semibold leading-snug" lang={textLang}>
            {text.name}
          </h4>
          <div className="flex flex-wrap gap-1.5 text-xs font-medium">
            {e.positive !== undefined && (
              <span
                className="rounded border px-1.5 py-0.5"
                style={{ color: KIND_COLOR[effective], borderColor: "currentColor" }}
              >
                {e.positive ? "Positive" : "Negative"}
              </span>
            )}
            {e.sp && <span className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[var(--ink-2)]">Special</span>}
            <SourceTags tl={shown === "en" ? e.text.en.tl : undefined} fallback={fallback} />
          </div>
        </div>
      </div>
      {text.effect && (
        <p className="text-sm leading-relaxed" lang={textLang}>
          {text.effect}
        </p>
      )}
      {text.levels && (
        <dl className="flex flex-col gap-1.5 text-sm" lang={textLang}>
          {text.levels.map((l, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr] gap-2">
              <dt className="min-w-12 font-medium text-[var(--ink-2)]">{l.label ?? `Lv ${i + 1}`}</dt>
              <dd className="leading-relaxed">{l.effect}</dd>
            </div>
          ))}
        </dl>
      )}
      {text.flavor && (
        <p className="whitespace-pre-line text-sm italic leading-relaxed text-[var(--muted)]" lang={textLang}>
          {text.flavor}
        </p>
      )}
    </li>
  );
}
