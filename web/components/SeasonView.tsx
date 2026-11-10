"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArtBackdrop } from "@/components/ArtBackdrop";
import { htmlLang, setUrlParams, useLang } from "@/components/lang";
import { EntryList } from "@/components/EntryList";
import { MechanicList } from "@/components/MechanicList";
import { OperatorList } from "@/components/OperatorList";
import { Season, StrongholdOperator, StrongholdSection, StrongholdTab, seasonBanner, seasonName } from "@/lib/stronghold";

const TABS: { id: StrongholdTab; label: string }[] = [
  { id: "operators", label: "Operators" },
  { id: "alliances", label: "Alliances" },
  { id: "strategies", label: "Strategies" },
  { id: "equipment", label: "Equipment" },
  { id: "enemies", label: "Enemies" },
];

// tabs laid out like the operator pool (one section each, same id as the tab)
const LIST_TABS: Partial<Record<StrongholdTab, { placeholder: string; flavorNote?: boolean; skills?: boolean }>> = {
  alliances: { placeholder: "Search alliances and effects in English, 日本語 or 中文" },
  // a strategy's flavor is its unlock condition: short and useful, so it stays visible
  strategies: { placeholder: "Search strategies, leaders and effects in English, 日本語 or 中文", flavorNote: true },
  equipment: { placeholder: "Search equipment and effects in English, 日本語 or 中文" },
  enemies: { placeholder: "Search bosses, enemy types and abilities in English, 日本語 or 中文", skills: true },
};

/**
 * The one section a list tab shows. A tab with several sections (Enemies: Bosses + Special Enemy
 * Types) becomes one section whose groups are those sections, so they get a chip row.
 */
function listSection(sections: StrongholdSection[], tab: StrongholdTab): StrongholdSection | undefined {
  const own = sections.filter((s) => s.tab === tab);
  if (own.length <= 1) return own[0];
  return {
    ...own[0],
    id: tab,
    summary: null,
    groups: own.map((s) => ({ id: s.id, name: { en: s.title } })),
    entries: own.flatMap((s) => s.entries.map((e) => ({ ...e, group: s.id }))),
  };
}


/** One Stronghold Protocol season: header, run dates and Operators / Alliances / Strategies / Enemies tabs (?tab=). Mirrors ThemeView. */
export function SeasonView({
  season,
  sections,
  operators,
  operatorsSource,
}: {
  season: Season;
  sections: StrongholdSection[];
  operators: StrongholdOperator[];
  operatorsSource: string;
}) {
  const [lang] = useLang();
  const params = useSearchParams();
  const [tab, setTabState] = useState<StrongholdTab>(() => {
    const t = params.get("tab");
    return TABS.some((x) => x.id === t) ? (t as StrongholdTab) : "operators";
  });

  function setTab(t: StrongholdTab) {
    setTabState(t);
    setUrlParams({ tab: t === "operators" ? null : t, q: null, alliance: null });
  }

  const count = (t: StrongholdTab) =>
    t === "operators"
      ? operators.length
      : sections.filter((s) => s.tab === t).reduce((n, s) => n + s.entries.length, 0);
  const others = (["en", "ja", "zh"] as const).filter((l) => l !== lang && season.names[l]);

  return (
    <div className="flex flex-col gap-6">
      <ArtBackdrop src={season.banner ? seasonBanner(season.id) : undefined} />
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="ak-kicker">Stronghold Protocol · Season</p>
          <h1 className="text-3xl font-bold tracking-tight" lang={htmlLang(season.names[lang] ? lang : "en")}>
            {seasonName(season, lang)}
          </h1>
          <p className="text-sm text-[var(--muted)]">
            {others.map((l, i) => (
              <span key={l} lang={htmlLang(l)}>
                {i > 0 && " · "}
                {season.names[l]}
              </span>
            ))}
          </p>
        </div>
      </header>

      <nav aria-label="Season sections" className="flex flex-wrap gap-1 border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
              tab === t.id
                ? "border-[var(--series-1)] bg-[var(--surface-1)] text-[var(--ink)]"
                : "border-transparent text-[var(--ink-2)] hover:text-[var(--ink)]"
            }`}
          >
            {t.label} <span className="ml-1 text-[var(--series-1)]">{String(count(t.id)).padStart(2, "0")}</span>
          </button>
        ))}
      </nav>

      {tab === "operators" ? (
        <OperatorList
          operators={operators}
          alliances={sections.find((s) => s.id === "alliances")}
          lang={lang}
          source={operatorsSource}
        />
      ) : LIST_TABS[tab] && listSection(sections, tab) ? (
        <EntryList key={tab} section={listSection(sections, tab)!} lang={lang} {...LIST_TABS[tab]} />
      ) : (
        <MechanicList key={tab} sections={sections.filter((s) => s.tab === tab)} lang={lang} iconDir="/stronghold" />
      )}
    </div>
  );
}
