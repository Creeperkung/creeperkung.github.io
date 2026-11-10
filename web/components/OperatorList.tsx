"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SourceTags, htmlLang, setUrlParams } from "@/components/lang";
import { MechanicSection } from "@/lib/mechanics";
import { Lang } from "@/lib/relics";
import {
  OperatorTrait,
  PROFESSION_LABEL,
  StrongholdOperator,
  TIER_NUMERAL,
  TRAIT_TYPE_LABEL,
} from "@/lib/stronghold";

export const chip = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-sm border px-3 py-1 text-sm transition-colors ${
    active
      ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--page)]"
      : "border-[var(--border)] text-[var(--ink-2)] hover:border-[var(--ink-2)]"
  }`;
export const rowLabel =
  "w-24 shrink-0 font-mono text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]";

const opName = (o: StrongholdOperator, lang: Lang) =>
  o.names[lang] ?? o.names.en ?? o.names.zh;
const nameLang = (names: Partial<Record<Lang, string>>, lang: Lang): Lang =>
  names[lang] ? lang : names.en ? "en" : "zh";

/** The trait in `lang`: CN is the source; EN/JP use the EN text if there is one, else CN (flagged). */
function pickTrait(
  o: StrongholdOperator,
  lang: Lang,
): { trait: OperatorTrait; lang: Lang; untranslated: boolean; fan: boolean } {
  if (lang === "zh")
    return { trait: o.trait.zh, lang: "zh", untranslated: false, fan: false };
  if (o.trait.en)
    return {
      trait: o.trait.en,
      lang: "en",
      untranslated: false,
      fan: o.trait.tl === "fan",
    };
  return { trait: o.trait.zh, lang: "zh", untranslated: true, fan: false };
}

// names (all languages) and trait text, lowercased, cached per operator
const searchCache = new WeakMap<StrongholdOperator, string>();
function searchText(o: StrongholdOperator) {
  let s = searchCache.get(o);
  if (s === undefined) {
    s = [
      ...Object.values(o.names),
      ...Object.values(o.prototype?.names ?? {}),
      ...[o.trait.zh, o.trait.en].flatMap((t) => (t ? [t.base, t.elite] : [])),
    ]
      .filter(Boolean)
      .join("\n")
      .toLowerCase();
    searchCache.set(o, s);
  }
  return s;
}

export const toggled = <T,>(set: Set<T>, x: T) => {
  const next = new Set(set);
  if (next.has(x)) next.delete(x);
  else next.add(x);
  return next;
};

/**
 * A season's operator pool, grouped by tier, with search (?q=), tier chips, alliance chips
 * (?alliance=, Faction and Sub-faction rows) and a class filter. Within one chip row any picked
 * value matches; across rows all must match. Needs <Suspense> (useSearchParams).
 */
export function OperatorList({
  operators,
  alliances,
  lang,
  source,
}: {
  operators: StrongholdOperator[];
  /** the season's "alliances" section: names, and the faction / sub-faction groups */
  alliances?: MechanicSection;
  lang: Lang;
  /** PRTS page the pool came from */
  source: string;
}) {
  const params = useSearchParams();
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [tiers, setTiers] = useState<Set<number>>(new Set());
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set((params.get("alliance") ?? "").split(",").filter(Boolean)),
  );
  const [cls, setCls] = useState("");
  useEffect(
    () =>
      setUrlParams({
        q: query || null,
        alliance: picked.size ? [...picked].join(",") : null,
      }),
    [query, picked],
  );

  const entries = useMemo(() => alliances?.entries ?? [], [alliances]);
  const allianceName = (id: string) => {
    const a = entries.find((e) => e.id === id);
    return a ? (a.text[lang] ?? a.text.en).name : id;
  };
  // chip rows, one per alliance group (Faction, Sub-faction). Alliances no operator lists
  // (Elite counts every Elite copy) would filter to nothing, so they get no chip.
  const rows = useMemo(() => {
    const used = new Set(operators.flatMap((o) => o.alliances));
    return (alliances?.groups ?? []).map((g) => ({
      id: g.id,
      label: g.name[lang] ?? g.name.en ?? g.id,
      ids: entries
        .filter((e) => e.group === g.id && used.has(e.id))
        .map((e) => e.id),
    }));
  }, [alliances, entries, lang, operators]);
  const tierList = [...new Set(operators.map((o) => o.tier))].sort(
    (a, b) => a - b,
  );
  const classes = [
    ...new Set(
      operators.map((o) => o.profession).filter((p): p is string => Boolean(p)),
    ),
  ].sort((a, b) =>
    (PROFESSION_LABEL[a] ?? a).localeCompare(PROFESSION_LABEL[b] ?? b),
  );

  const q = query.trim().toLowerCase();
  const shown = useMemo(() => {
    const out = operators.filter(
      (o) =>
        (!q || searchText(o).includes(q)) &&
        (tiers.size === 0 || tiers.has(o.tier)) &&
        // each row with a pick must be matched by at least one of the operator's alliances
        rows.every((r) => {
          const inRow = r.ids.filter((id) => picked.has(id));
          return (
            inRow.length === 0 || inRow.some((id) => o.alliances.includes(id))
          );
        }) &&
        (!cls || o.profession === cls),
    );
    return out;
  }, [operators, q, tiers, picked, rows, cls]);

  const toggleAlliance = (id: string) => setPicked((p) => toggled(p, id));
  const clearRow = (ids: string[]) =>
    setPicked((p) => new Set([...p].filter((id) => !ids.includes(id))));

  if (operators.length === 0)
    return (
      <p className="rounded-sm border border-dashed border-[var(--border)] p-10 text-center text-[var(--muted)]">
        No operator data yet.
      </p>
    );
  const filtered = shown.length !== operators.length;
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 rounded-sm border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search operators and traits in English, 日本語 or 中文"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--page)] px-3 py-2 outline-none focus:border-[var(--series-1)]"
          aria-label="Search operators"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <span className={`${rowLabel} sm:pt-1.5`}>Tier</span>
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filter by tier"
          >
            <button
              onClick={() => setTiers(new Set())}
              className={chip(tiers.size === 0)}
              aria-pressed={tiers.size === 0}
            >
              All
            </button>
            {tierList.map((t) => (
              <button
                key={t}
                onClick={() => setTiers((s) => toggled(s, t))}
                className={`${chip(tiers.has(t))} !px-2`}
                aria-pressed={tiers.has(t)}
                aria-label={`Tier ${TIER_NUMERAL[t]}`}
                title={`Tier ${TIER_NUMERAL[t]}`}
              >
                <TierBadge tier={t} size={28} />
              </button>
            ))}
          </div>
        </div>
        {rows.map((r) => {
          const none = !r.ids.some((id) => picked.has(id));
          return (
            <div
              key={r.id}
              className="flex flex-col gap-2 sm:flex-row sm:items-start"
            >
              <span className={`${rowLabel} sm:pt-1.5`}>{r.label}</span>
              <div
                className="flex flex-wrap items-center gap-2"
                role="group"
                aria-label={`Filter by ${r.label}`}
              >
                <button
                  onClick={() => clearRow(r.ids)}
                  className={chip(none)}
                  aria-pressed={none}
                >
                  All
                </button>
                {r.ids.map((id) => (
                  <button
                    key={id}
                    onClick={() => toggleAlliance(id)}
                    className={`${chip(picked.has(id))} !px-2`}
                    aria-pressed={picked.has(id)}
                  >
                    <AllianceIcon id={id} size={28} active={picked.has(id)} />
                    <span>{allianceName(id)}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--ink-2)]">
          <span className={rowLabel}>Class</span>
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filter by class"
          >
            <button
              onClick={() => setCls("")}
              className={chip(!cls)}
              aria-pressed={!cls}
            >
              All
            </button>
            {classes.map((c) => (
              <button
                key={c}
                onClick={() => setCls((x) => (x === c ? "" : c))}
                className={`${chip(cls === c)} !px-2`}
                aria-pressed={cls === c}
              >
                <ClassIcon profession={c} size={28} active={cls === c} />
                <span>{PROFESSION_LABEL[c] ?? c}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered && (
        <p className="-mt-4 text-sm text-[var(--ink-2)]" aria-live="polite">
          Showing <strong className="text-[var(--ink)]">{shown.length}</strong>{" "}
          of {operators.length}
        </p>
      )}
      {shown.length === 0 ? (
        <p className="rounded-sm border border-dashed border-[var(--border)] p-10 text-center text-[var(--muted)]">
          No operators match.
        </p>
      ) : (
        tierList
          .filter((t) => shown.some((o) => o.tier === t))
          .map((t) => (
            <section
              key={t}
              id={`tier-${t}`}
              className="flex scroll-mt-6 flex-col gap-4"
            >
              <header className="flex flex-wrap items-center gap-2">
                <h2 className="ak-heading text-xl font-bold tracking-tight">
                  {t ? `Tier ${TIER_NUMERAL[t]}` : "Tier not set"}
                </h2>
                <span className="text-sm text-[var(--muted)]">
                  {shown.filter((o) => o.tier === t).length}
                </span>
              </header>
              <Grid
                operators={shown.filter((o) => o.tier === t)}
                lang={lang}
                allianceName={allianceName}
                picked={picked}
                onAlliance={toggleAlliance}
              />
            </section>
          ))
      )}
      <p className="text-xs text-[var(--muted)]">
        Operator pool, alliances and traits from the{" "}
        <a
          href={source}
          className="underline hover:text-[var(--ink)]"
          target="_blank"
          rel="noreferrer"
        >
          PRTS season record
        </a>{" "}
        (second half of the season), plus hand-filled entries. Traits are CN
        text until they get an English version.
      </p>
    </div>
  );
}

interface GridProps {
  lang: Lang;
  allianceName: (id: string) => string;
  picked: Set<string>;
  onAlliance: (id: string) => void;
}

function Grid({
  operators,
  ...rest
}: GridProps & { operators: StrongholdOperator[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {operators.map((o) => (
        <Card key={o.id} op={o} {...rest} />
      ))}
    </ul>
  );
}

function Card({
  op: o,
  lang,
  allianceName,
  picked,
  onAlliance,
}: GridProps & { op: StrongholdOperator }) {
  const nl = nameLang(o.names, lang);
  const { trait, lang: tl, untranslated } = pickTrait(o, lang);
  const typeLabel = TRAIT_TYPE_LABEL[o.traitType] ?? TRAIT_TYPE_LABEL.combat;
  return (
    <li
      className="flex overflow-hidden rounded-xl border border-[var(--border)] border-t-2 bg-[var(--surface-1)]"
      style={{
        borderTopColor: o.tier ? `var(--tier-${o.tier})` : "var(--border)",
      }}
    >
      {o.portrait && (
        // E2 half-body art down the left side, cropped from the top and faded into the card
        <div
          className="relative w-28 shrink-0 bg-[var(--icon-well)] sm:w-32"
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/stronghold/portrait-${o.id}.webp`}
            alt=""
            width={180}
            height={360}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
          <span
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, transparent 60%, var(--surface-1))",
            }}
          />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-start gap-3">
          {!o.portrait && (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--icon-well)]">
              {o.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/stronghold/${o.id}.webp`}
                  alt=""
                  width={64}
                  height={64}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span
                  className="text-lg font-semibold text-[var(--muted)]"
                  aria-hidden
                  lang={htmlLang(nl)}
                >
                  {[...opName(o, lang)][0]}
                </span>
              )}
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-snug" lang={htmlLang(nl)}>
                {opName(o, lang)}
              </h3>
              {o.alliances.length > 0 && (
                <div
                  className="flex shrink-0 gap-1"
                  role="group"
                  aria-label="Alliances"
                >
                  {o.alliances.map((a) => (
                    <button
                      key={a}
                      onClick={() => onAlliance(a)}
                      aria-pressed={picked.has(a)}
                      aria-label={allianceName(a)}
                      title={`${allianceName(a)}: ${picked.has(a) ? "remove from the filter" : "show operators in this alliance"}`}
                      className={`flex h-9 w-9 items-center justify-center rounded-sm border transition-colors ${
                        picked.has(a)
                          ? "border-[var(--series-1)] bg-[var(--series-1)]"
                          : "border-[var(--border)] bg-[var(--icon-well)] hover:border-[var(--series-1)]"
                      }`}
                    >
                      <AllianceIcon id={a} size={28} active={picked.has(a)} />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
              {o.tier > 0 && <TierBadge tier={o.tier} size={36} />}
              {o.profession && (
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-sm border border-[var(--border)] bg-[var(--icon-well)]"
                  title={PROFESSION_LABEL[o.profession] ?? o.profession}
                >
                  <ClassIcon profession={o.profession} size={28} />
                  <span className="sr-only">
                    {PROFESSION_LABEL[o.profession] ?? o.profession}
                  </span>
                </span>
              )}
              <span
                className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[var(--ink-2)]"
                lang={htmlLang(typeLabel[lang] ? lang : "en")}
              >
                {typeLabel[lang] ?? typeLabel.en}
              </span>
            </div>
          </div>
        </div>
        {(trait.base || trait.elite) && (
          <div
            className="flex flex-col gap-2.5 text-[13px] leading-[1.45]"
            lang={htmlLang(tl)}
          >
            {trait.base && <TraitBlock label="Base" text={trait.base} />}
            {trait.elite && (
              <TraitBlock
                label="Elite"
                text={trait.elite}
                separated={Boolean(trait.base)}
              />
            )}
          </div>
        )}
        {(o.prototype || untranslated || o.manual) && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {o.prototype && (
              <span
                className="text-[var(--muted)]"
                lang={htmlLang(nameLang(o.prototype.names, lang))}
              >
                Prototype:{" "}
                {o.prototype.names[lang] ??
                  o.prototype.names.en ??
                  o.prototype.names.zh}
              </span>
            )}
            {untranslated && <SourceTags tl="partial" fallback={false} />}
            {o.manual && (
              <span
                className="rounded border border-dashed border-[var(--border)] px-1.5 py-0.5 text-[var(--muted)]"
                title="Some fields were filled in by hand (data/stronghold-operators.json)"
              >
                Hand-filled
              </span>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/** One trait level, laid out like a boss ability block: accent label above, text below. */
export function TraitBlock({
  label,
  text,
  separated,
}: {
  label: string;
  text: string;
  separated?: boolean;
}) {
  return (
    <section
      className={`flex flex-col gap-1 ${separated ? "border-t border-[var(--border)] pt-2.5" : ""}`}
    >
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--series-1)]">
        {label}
      </h4>
      <p className="whitespace-pre-line">{text}</p>
    </section>
  );
}

/** An alliance emblem (public/stronghold/<id>.webp, white on transparent); dark when on a lit chip. */
function AllianceIcon({
  id,
  size,
  active,
}: {
  id: string;
  size: number;
  active?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/stronghold/${id}.webp`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={active ? "brightness-0" : undefined}
    />
  );
}

/** Tier as a badge: the roman numeral in the tier color, framed. */
export function TierBadge({ tier, size }: { tier: number; size: number }) {
  return (
    <span
      className="flex items-center justify-center rounded-sm border-2 bg-[var(--icon-well)] font-serif font-bold leading-none"
      style={{
        width: size,
        height: size,
        color: `var(--tier-${tier})`,
        borderColor: "currentColor",
        fontSize: size * 0.5,
      }}
      title={`Tier ${TIER_NUMERAL[tier]}`}
    >
      <span aria-hidden>{TIER_NUMERAL[tier]}</span>
      <span className="sr-only">Tier {TIER_NUMERAL[tier]}</span>
    </span>
  );
}

/** Class icon (public/stronghold/class-<PROFESSION>.webp, white); dark on a lit chip. */
function ClassIcon({
  profession,
  size,
  active,
}: {
  profession: string;
  size: number;
  active?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/stronghold/class-${profession}.webp`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={active ? "brightness-0" : undefined}
    />
  );
}
