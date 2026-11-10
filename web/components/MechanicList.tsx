"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SourceTags, htmlLang, setUrlParams } from "@/components/lang";
import { KIND_LABEL, MechanicEntry, MechanicKind, MechanicSection, MechanicText, STAT_LABEL } from "@/lib/mechanics";
import { Lang, pickText } from "@/lib/relics";

const KIND_COLOR: Record<MechanicKind, string> = {
  debuff: "var(--relic-curse)",
  buff: "var(--series-1)",
  mixed: "var(--ink-2)",
  item: "var(--kind-item)",
};

const chip = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-sm border px-3 py-1 text-sm transition-colors ${
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
export function MechanicList({
  sections,
  lang,
  iconDir = "/mechanics",
}: {
  sections: MechanicSection[];
  lang: Lang;
  /** where entry icons live: <iconDir>/<id>.webp */
  iconDir?: string;
}) {
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
      <p className="rounded-sm border border-dashed border-[var(--border)] p-10 text-center text-[var(--muted)]">
        Nothing here yet.
      </p>
    );
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 rounded-sm border border-[var(--border)] bg-[var(--surface-1)] p-4">
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
                className="rounded-sm border border-[var(--border)] px-3 py-1 text-sm text-[var(--ink-2)] hover:border-[var(--ink-2)]"
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
        <p className="rounded-sm border border-dashed border-[var(--border)] p-10 text-center text-[var(--muted)]">
          Nothing matches “{query}”.
        </p>
      ) : (
        sections.map((s) => <Section key={s.id} section={s} lang={lang} q={q} sort={sort} iconDir={iconDir} />)
      )}
    </div>
  );
}

function Section({
  section: s,
  lang,
  q,
  sort,
  iconDir,
}: {
  section: MechanicSection;
  lang: Lang;
  q: string;
  sort: Sort;
  iconDir: string;
}) {
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
          <h2 className="ak-heading text-xl font-bold tracking-tight">{s.title}</h2>
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
          <Grid entries={entries.filter((e) => e.group === g.id)} kind={s.kind} hideFlavor={s.hideFlavor} skillLayout={s.skillLayout} lang={lang} iconDir={iconDir} />
        </div>
      ))}
      {ungrouped.length > 0 && <Grid entries={ungrouped} kind={s.kind} hideFlavor={s.hideFlavor} skillLayout={s.skillLayout} lang={lang} iconDir={iconDir} />}
    </section>
  );
}

function Grid({
  entries,
  kind,
  hideFlavor,
  skillLayout,
  lang,
  iconDir,
}: {
  entries: MechanicEntry[];
  kind: MechanicKind;
  hideFlavor?: boolean;
  skillLayout?: boolean;
  lang: Lang;
  iconDir: string;
}) {
  return (
    <ul
      className={
        skillLayout
          ? // cards keep their own height (items-start), so expanding one never stretches the others
            "grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] items-start gap-4"
          : "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      }
    >
      {entries.map((e) => (
        <Card key={e.id} entry={e} kind={kind} hideFlavor={hideFlavor} skillLayout={skillLayout} lang={lang} iconDir={iconDir} />
      ))}
    </ul>
  );
}

function Card({
  entry: e,
  kind,
  hideFlavor,
  skillLayout,
  lang,
  iconDir,
}: {
  entry: MechanicEntry;
  kind: MechanicKind;
  hideFlavor?: boolean;
  skillLayout?: boolean;
  lang: Lang;
  iconDir: string;
}) {
  const { text, lang: shown, fallback } = pickText<MechanicText>(e.text, lang);
  const textLang = htmlLang(shown);
  const effective: MechanicKind = e.positive === undefined ? kind : e.positive ? "buff" : "debuff";
  return (
    <li
      className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] border-t-2 bg-[var(--surface-1)] p-4"
      style={{ borderTopColor: KIND_COLOR[effective] }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[var(--icon-well)]">
          {e.icon ? (
            // Static, pre-sized 128px WebP files; next/image optimization adds nothing here.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`${iconDir}/${e.id}.webp`} alt="" width={48} height={48} loading="lazy" decoding="async" />
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
            {e.stats?.map((s) => (
              <span key={s.key} className="rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[var(--ink-2)]">
                {STAT_LABEL[s.key][lang] ?? STAT_LABEL[s.key].en} {s.value}
              </span>
            ))}
            <SourceTags tl={shown === "en" ? e.text.en.tl : undefined} fallback={fallback} />
          </div>
        </div>
      </div>
      {skillLayout && text.effect && <Skills text={text.effect} lang={textLang} />}
      {skillLayout &&
        text.levels?.map((l, i) => <ClampedLevel key={i} label={l.label ?? `Lv ${i + 1}`} text={l.effect} lang={textLang} />)}
      {!skillLayout && text.effect && (
        <p className="whitespace-pre-line text-sm leading-relaxed" lang={textLang}>
          {text.effect}
        </p>
      )}
      {!skillLayout && text.levels && (
        <dl className="flex flex-col gap-1.5 text-sm" lang={textLang}>
          {text.levels.map((l, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr] gap-2">
              <dt className="min-w-12 font-medium text-[var(--ink-2)]">{l.label ?? `Lv ${i + 1}`}</dt>
              <dd className="whitespace-pre-line leading-relaxed">{l.effect}</dd>
            </div>
          ))}
        </dl>
      )}
      {text.flavor && (hideFlavor ? <HiddenFlavor text={text.flavor} lang={textLang} /> : <Flavor text={text.flavor} lang={textLang} />)}
    </li>
  );
}

/** "[Name] text" (EN) / "【Name】：text" (JP) / "【Name】text" (CN): a named skill. */
const SKILL_LINE = /^[\[【]([^\]】]+)[\]】][：:]?\s*([\s\S]*)$/;

function splitSkills(text: string) {
  const plain: string[] = [];
  const skills: { name: string; text: string }[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const m = line.match(SKILL_LINE);
    if (m) skills.push({ name: m[1], text: m[2] });
    else plain.push(line);
  }
  return { plain, skills };
}

/** Ability lines: plain sentences first, then one block per named skill (heading + muted text). */
function Skills({ text, lang }: { text: string; lang?: string }) {
  const { plain, skills } = splitSkills(text);
  return (
    <div className="flex flex-col gap-2.5 text-[13px] leading-[1.45]" lang={lang}>
      {plain.map((p, i) => (
        <p key={`p${i}`}>{p}</p>
      ))}
      {skills.map((s, i) => (
        <div key={`s${i}`} className="flex flex-col gap-0.5">
          <h5 className="font-semibold text-[var(--ink)]">{s.name}</h5>
          {s.text && <p className="text-[var(--ink-2)]">{s.text}</p>}
        </div>
      ))}
    </div>
  );
}

/**
 * A labelled ability block (Hidden Core): label above the text, clamped to 4 lines with a fade.
 * The Show more toggle only appears when the text actually overflows the clamp.
 */
export function ClampedLevel({ label, text, lang }: { label: string; text: string | null; lang?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    // ResizeObserver fires once on observe, then on every width change (font load, resize)
    const ro = new ResizeObserver(() => setOverflows(el.scrollHeight > el.clientHeight + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, text]);
  const clamped = !open && overflows;
  return (
    <section className="flex flex-col gap-1.5 border-t border-[var(--border)] pt-2.5">
      <h5 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--series-1)]">{label}</h5>
      {text && (
        <div
          ref={ref}
          // 4 lines of 13px × 1.45; a plain max-height clamp (not -webkit-line-clamp) so it also
          // clamps text split across several skill blocks
          className={open ? "" : "max-h-[calc(13px*1.45*4)] overflow-hidden"}
          style={
            clamped
              ? { maskImage: "linear-gradient(to bottom, #000 55%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, #000 55%, transparent)" }
              : undefined
          }
        >
          <Skills text={text} lang={lang} />
        </div>
      )}
      {(overflows || open) && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="self-start font-mono text-xs uppercase tracking-wider text-[var(--muted)] hover:text-[var(--series-1)]"
        >
          {open ? "▾ Show less" : "▸ Show more"}
        </button>
      )}
    </section>
  );
}

function Flavor({ text, lang }: { text: string; lang?: string }) {
  return (
    <p className="whitespace-pre-line text-sm italic leading-relaxed text-[var(--muted)]" lang={lang}>
      {text}
    </p>
  );
}

/** Lore kept out of the way until asked for: a button that reveals it, and hides it again. */
export function HiddenFlavor({ text, lang }: { text: string; lang?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="self-start font-mono text-xs uppercase tracking-wider text-[var(--muted)] hover:text-[var(--series-1)]"
      >
        {open ? "▾ Hide description" : "▸ Show description"}
      </button>
      {open && <Flavor text={text} lang={lang} />}
    </div>
  );
}
