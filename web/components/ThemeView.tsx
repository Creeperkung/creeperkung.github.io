"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { htmlLang, setUrlParams, useLang } from "@/components/lang";
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
  const [lang] = useLang();
  const params = useSearchParams();
  const [tab, setTabState] = useState<Tab>(() => {
    const t = params.get("tab");
    return TABS.some((x) => x.id === t) ? (t as Tab) : "relics";
  });
  // Page backdrop (--art): this theme's banner while the page is open
  useEffect(() => {
    if (!banner) return;
    const root = document.documentElement;
    root.style.setProperty("--art", `url("/themes/${theme.id}.webp")`);
    return () => {
      root.style.removeProperty("--art");
    };
  }, [banner, theme.id]);

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
            className="aspect-[3/1] w-full rounded-sm border border-[var(--border)] object-cover"
          />
        )}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="flex items-center gap-2">
              <span className="ak-kicker">Integrated Strategies · {themeShort(theme.id)}</span>
              {!theme.servers.includes("en") && (
                <span className="border border-[var(--border)] px-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ink-2)]">
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
        </div>
      </header>

      <nav aria-label="Theme sections" className="flex flex-wrap gap-1 border-b border-[var(--border)]">
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
            {t.label} <span className="ml-1 text-[var(--series-1)]">{String(count[t.id]).padStart(2, "0")}</span>
          </button>
        ))}
      </nav>

      {tab === "relics" && <RelicBrowser data={data} lang={lang} />}
      {tab === "effects" && <MechanicList sections={effects} lang={lang} />}
      {tab === "items" && <MechanicList sections={items} lang={lang} />}
    </div>
  );
}
