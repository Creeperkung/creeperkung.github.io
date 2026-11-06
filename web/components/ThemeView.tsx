"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { LangSwitch, htmlLang, setUrlParams, useLang } from "@/components/lang";
import { MechanicList } from "@/components/MechanicList";
import { RelicBrowser } from "@/components/RelicBrowser";
import { MechanicSection } from "@/lib/mechanics";
import { RelicData, themeName, themeShort } from "@/lib/relics";

const TABS = [
  { id: "relics", label: "Relics" },
  { id: "effects", label: "Buffs & Debuffs" },
  { id: "items", label: "Special Items" },
] as const;
type Tab = (typeof TABS)[number]["id"];

/** One theme: header, language switch and Relics / Buffs & Debuffs / Special Items tabs (?tab=). */
export function ThemeView({
  data,
  sections,
  banner,
}: {
  /** this theme's relics only */
  data: RelicData;
  sections: MechanicSection[];
  banner: boolean;
}) {
  const theme = data.themes[0];
  const [lang, setLang] = useLang();
  const params = useSearchParams();
  const [tab, setTabState] = useState<Tab>(() => {
    const t = params.get("tab");
    return TABS.some((x) => x.id === t) ? (t as Tab) : "relics";
  });
  function setTab(t: Tab) {
    setTabState(t);
    setUrlParams({ tab: t === "relics" ? null : t, q: null });
  }

  const effects = sections.filter((s) => s.kind !== "item");
  const items = sections.filter((s) => s.kind === "item");
  const count: Record<Tab, number> = {
    relics: data.relics.length,
    effects: effects.reduce((n, s) => n + s.entries.length, 0),
    items: items.reduce((n, s) => n + s.entries.length, 0),
  };
  const others = (["en", "ja", "zh"] as const).filter((l) => l !== lang && theme.names[l]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        {banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/themes/${theme.id}.webp`}
            alt=""
            className="aspect-[3/1] w-full rounded-xl border border-[var(--border)] object-cover"
          />
        )}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[var(--muted)]">
              {themeShort(theme.id)}
              {!theme.servers.includes("en") && (
                <span className="rounded border border-[var(--border)] px-1 text-[10px] font-semibold normal-case tracking-normal text-[var(--ink-2)]">
                  CN only
                </span>
              )}
            </p>
            <h1 className="text-3xl font-bold tracking-tight" lang={htmlLang(theme.names[lang] ? lang : "en")}>
              {themeName(theme, lang)}
            </h1>
            <p className="text-sm text-[var(--muted)]">
              {others.map((l, i) => (
                <span key={l} lang={htmlLang(l)}>
                  {i > 0 && " · "}
                  {theme.names[l]}
                </span>
              ))}
              {theme.enNameOfficial === false && " · English name unofficial"}
            </p>
          </div>
          <LangSwitch lang={lang} onChange={setLang} />
        </div>
      </header>

      <nav aria-label="Theme sections" className="flex flex-wrap gap-1 border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-[var(--series-1)] text-[var(--ink)]"
                : "border-transparent text-[var(--ink-2)] hover:text-[var(--ink)]"
            }`}
          >
            {t.label} <span className="text-[var(--muted)]">{count[t.id]}</span>
          </button>
        ))}
      </nav>

      {tab === "relics" && <RelicBrowser data={data} lang={lang} />}
      {tab === "effects" && <MechanicList sections={effects} lang={lang} />}
      {tab === "items" && <MechanicList sections={items} lang={lang} />}
    </div>
  );
}
