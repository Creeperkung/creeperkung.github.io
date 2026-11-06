"use client";

import { SourceTags, htmlLang } from "@/components/lang";
import { KIND_LABEL, MechanicEntry, MechanicKind, MechanicSection, MechanicText } from "@/lib/mechanics";
import { Lang, pickText } from "@/lib/relics";

const KIND_COLOR: Record<MechanicKind, string> = {
  debuff: "var(--relic-curse)",
  buff: "var(--series-1)",
  mixed: "var(--ink-2)",
  item: "var(--rarity-superRare)",
};

/** Every section of one theme of the given kinds, each with its entries. */
export function MechanicList({ sections, lang }: { sections: MechanicSection[]; lang: Lang }) {
  if (sections.length === 0)
    return (
      <p className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--muted)]">
        Nothing here for this theme yet.
      </p>
    );
  return (
    <div className="flex flex-col gap-10">
      {sections.length > 1 && (
        <nav aria-label="Sections" className="flex flex-wrap gap-2 text-sm">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--ink-2)] hover:border-[var(--ink-2)]"
            >
              {s.title} <span className="text-[var(--muted)]">{s.entries.length}</span>
            </a>
          ))}
        </nav>
      )}
      {sections.map((s) => (
        <Section key={s.id} section={s} lang={lang} />
      ))}
    </div>
  );
}

function Section({ section: s, lang }: { section: MechanicSection; lang: Lang }) {
  const groups = s.groups?.filter((g) => s.entries.some((e) => e.group === g.id)) ?? [];
  const ungrouped = s.entries.filter((e) => !groups.some((g) => g.id === e.group));
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
          <span className="text-sm text-[var(--muted)]">{s.entries.length}</span>
        </div>
        {s.summary && <p className="max-w-3xl text-sm text-[var(--ink-2)]">{s.summary}</p>}
      </header>
      {groups.map((g) => (
        <div key={g.id} className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-[var(--ink-2)]">
            <span lang={htmlLang(g.name[lang] ? lang : "en")}>{g.name[lang] ?? g.name.en ?? g.id}</span>
            {g.note && (
              <span className="ml-2 font-normal text-[var(--muted)]" lang={htmlLang(g.note[lang] ? lang : "en")}>
                — {g.note[lang] ?? g.note.en}
              </span>
            )}
          </h3>
          <Grid entries={s.entries.filter((e) => e.group === g.id)} kind={s.kind} lang={lang} />
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
