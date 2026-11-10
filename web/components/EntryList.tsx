"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SourceTags, htmlLang, setUrlParams } from "@/components/lang";
import { ClampedLevel, HiddenFlavor } from "@/components/MechanicList";
import { TierBadge, TraitBlock, chip, rowLabel, toggled } from "@/components/OperatorList";
import { MechanicEntry, MechanicSection, MechanicText, STAT_LABEL } from "@/lib/mechanics";
import { Lang, pickText } from "@/lib/relics";

/** "tier3" → 3; anything else (arts, faction, …) → 0 */
const tierOf = (group?: string) => Number(group?.match(/^tier(\d)$/)?.[1] ?? 0);

/**
 * One effect line → a labelled block when it starts with a condition or a name:
 * "<With 6 different [Yan] Operators on field> text" / "[Wills As One] Passive: text" (EN),
 * "<在场6名…>text" / "【众志合一】text" (CN). Other lines stay plain.
 */
const LABELLED = /^(?:<([^<>]+)>|\[([^\]]+)\]|【([^】]+)】)[：:]?\s*([\s\S]+)$/;
function splitLines(text: string, anyName = false) {
  const plain: string[] = [];
  const blocks: { label: string; text: string }[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const m = line.match(LABELLED);
    // "[Yan] Operators' ATK +23%" is a sentence about the alliance, not a name: only treat a
    // bracketed name as a label when nothing more follows on the same word (a colon or "Passive:")
    if (m && (m[1] || anyName || /^(Passive|Active|Drag|Tap|被动|主动|拖拽|点击)/.test(m[4]))) blocks.push({ label: m[1] ?? m[2] ?? m[3], text: m[4] });
    else plain.push(line);
  }
  return { plain, blocks };
}

// name and effect text (not the description), all languages, lowercased
const searchCache = new WeakMap<MechanicEntry, string>();
function searchText(e: MechanicEntry) {
  let s = searchCache.get(e);
  if (s === undefined) {
    s = Object.values(e.text)
      .flatMap((t) => (t ? [t.name, t.effect, ...(t.levels ?? []).map((l) => l.effect)] : []))
      .filter(Boolean)
      .join("\n")
      .toLowerCase();
    searchCache.set(e, s);
  }
  return s;
}

/**
 * A Stronghold section laid out like the operator pool: search (?q=), a chip row for the
 * section's groups (tier badges for tierN groups), entries grouped under headings, and cards
 * with the art down the left. Used for Alliances, Strategies and Equipment. The description
 * (flavor) is hidden behind a toggle unless `flavorNote` shows it as a short visible note
 * (strategy unlock conditions). Needs <Suspense> (useSearchParams).
 */
export function EntryList({
  section,
  lang,
  placeholder,
  flavorNote,
  skills,
}: {
  section: MechanicSection;
  lang: Lang;
  placeholder: string;
  /** show the flavor text as a visible muted note instead of hiding it */
  flavorNote?: boolean;
  /** boss abilities: every "[Name] …" line is a named skill, and levels (Hidden Core) clamp to 4 lines */
  skills?: boolean;
}) {
  const params = useSearchParams();
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  useEffect(() => setUrlParams({ q: query || null }), [query]);

  const groupList = useMemo(
    () => (section.groups ?? []).filter((g) => section.entries.some((e) => e.group === g.id)),
    [section],
  );
  const groupName = (id: string) => {
    const g = groupList.find((x) => x.id === id);
    return g ? (g.name[lang] ?? g.name.en ?? id) : id;
  };
  const tiered = groupList.some((g) => tierOf(g.id));

  const q = query.trim().toLowerCase();
  const shown = section.entries.filter(
    (e) => (!q || searchText(e).includes(q)) && (picked.size === 0 || picked.has(e.group ?? "")),
  );
  const filtered = shown.length !== section.entries.length;
  const grid = (entries: MechanicEntry[]) => (
    // boss cards vary a lot in length: let each keep its own height (expanding one never stretches the others)
    <ul className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-3 ${skills ? "items-start" : ""}`}>
      {entries.map((e) => (
        <Card key={e.id} entry={e} lang={lang} flavorNote={flavorNote} skills={skills} />
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col gap-8">
      {section.summary && <p className="-mb-4 text-sm text-[var(--ink-2)]">{section.summary}</p>}
      <div className="flex flex-col gap-3 rounded-sm border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--page)] px-3 py-2 outline-none focus:border-[var(--series-1)]"
          aria-label={placeholder}
        />
        {groupList.length > 1 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <span className={`${rowLabel} sm:pt-1.5`}>{tiered ? "Tier" : "Type"}</span>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Filter by ${tiered ? "tier" : "type"}`}>
              <button onClick={() => setPicked(new Set())} className={chip(picked.size === 0)} aria-pressed={picked.size === 0}>
                All
              </button>
              {groupList.map((g) => {
                const t = tierOf(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() => setPicked((s) => toggled(s, g.id))}
                    className={`${chip(picked.has(g.id))} ${t ? "!px-2" : ""}`}
                    aria-pressed={picked.has(g.id)}
                    aria-label={groupName(g.id)}
                    title={groupName(g.id)}
                  >
                    {t ? <TierBadge tier={t} size={28} /> : groupName(g.id)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {filtered && (
        <p className="-mt-4 text-sm text-[var(--ink-2)]" aria-live="polite">
          Showing <strong className="text-[var(--ink)]">{shown.length}</strong> of {section.entries.length}
        </p>
      )}
      {shown.length === 0 ? (
        <p className="rounded-sm border border-dashed border-[var(--border)] p-10 text-center text-[var(--muted)]">
          Nothing matches.
        </p>
      ) : groupList.length ? (
        <>
          {groupList
            .filter((g) => shown.some((e) => e.group === g.id))
            .map((g) => (
              <section key={g.id} id={g.id} className="flex scroll-mt-6 flex-col gap-4">
                <h2 className="ak-heading text-xl font-bold tracking-tight" lang={htmlLang(g.name[lang] ? lang : "en")}>
                  {groupName(g.id)}
                </h2>
                {grid(shown.filter((e) => e.group === g.id))}
              </section>
            ))}
          {shown.some((e) => !groupList.some((g) => g.id === e.group)) &&
            grid(shown.filter((e) => !groupList.some((g) => g.id === e.group)))}
        </>
      ) : (
        grid(shown)
      )}
    </div>
  );
}

function Card({
  entry: e,
  lang,
  flavorNote,
  skills,
}: {
  entry: MechanicEntry;
  lang: Lang;
  flavorNote?: boolean;
  skills?: boolean;
}) {
  const { text, lang: shown, fallback } = pickText<MechanicText>(e.text, lang);
  const textLang = htmlLang(shown);
  const tier = tierOf(e.group);
  const { plain, blocks } = splitLines(text.effect ?? "", skills);
  const levels = (text.levels ?? []).filter((l) => l.effect);
  return (
    <li
      className="flex overflow-hidden rounded-xl border border-[var(--border)] border-t-2 bg-[var(--surface-1)]"
      style={{ borderTopColor: tier ? `var(--tier-${tier})` : "var(--series-1)" }}
    >
      {/* art down the left side: a leader's E2 portrait, else the entry's icon */}
      <div className="relative flex w-28 shrink-0 items-start justify-center bg-[var(--icon-well)] pt-4 sm:w-32" aria-hidden>
        {e.portrait ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/stronghold/portrait-${e.id}.webp`}
            alt=""
            width={180}
            height={360}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        ) : e.icon ? (
          // Static, pre-sized 128px WebP files; next/image optimization adds nothing here.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/stronghold/${e.id}.webp`} alt="" width={96} height={96} loading="lazy" decoding="async" />
        ) : (
          <span className="pt-6 text-2xl font-semibold text-[var(--muted)]" lang={textLang}>
            {[...text.name][0]}
          </span>
        )}
        <span
          className="absolute inset-0"
          style={{ background: `linear-gradient(to right, transparent ${e.portrait ? 60 : 70}%, var(--surface-1))` }}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-4">
        <div className="flex flex-col gap-1.5">
          <h3 className="font-semibold leading-snug" lang={textLang}>
            {text.name}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
            {tier > 0 && <TierBadge tier={tier} size={36} />}
            {e.sp && <span className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[var(--ink-2)]">Special</span>}
            {e.stats?.map((s) => (
              <span key={s.key} className="rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[var(--ink-2)]">
                {STAT_LABEL[s.key][lang] ?? STAT_LABEL[s.key].en} {s.value}
              </span>
            ))}
            {fallback && <SourceTags fallback />}
          </div>
        </div>
        {(plain.length > 0 || blocks.length > 0 || levels.length > 0) && (
          <div className="flex flex-col gap-2.5 text-[13px] leading-[1.45]" lang={textLang}>
            {plain.map((p, i) => (
              <p key={`p${i}`} className="whitespace-pre-line">
                {p}
              </p>
            ))}
            {[...blocks, ...(skills ? [] : levels.map((l, i) => ({ label: l.label ?? `Lv ${i + 1}`, text: l.effect as string })))].map((b, i) => (
              <TraitBlock key={`b${i}`} label={b.label} text={b.text} separated={i > 0 || plain.length > 0} />
            ))}
          </div>
        )}
        {skills &&
          levels.map((l, i) => <ClampedLevel key={i} label={l.label ?? `Lv ${i + 1}`} text={l.effect} lang={textLang} />)}
        {text.flavor &&
          (flavorNote ? (
            <p className="text-xs text-[var(--muted)]" lang={textLang}>
              {text.flavor}
            </p>
          ) : (
            <HiddenFlavor text={text.flavor} lang={textLang} />
          ))}
      </div>
    </li>
  );
}
