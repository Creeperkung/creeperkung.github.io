import type { Metadata } from "next";
import { Suspense } from "react";
import { Crumbs } from "@/components/Crumbs";
import { HomeThemes, ThemeSummary } from "@/components/HomeThemes";
import { mechanicData } from "@/lib/mechanics";
import { relicData } from "@/lib/relics";

export const metadata: Metadata = {
  title: "Integrated Strategies — ROSMEOWTIS",
  description: "Every Arknights Integrated Strategies theme: relics, buffs, debuffs and special mechanic items",
};

/** /is: Integrated Strategies home, one card per theme. */
export default function IsHome() {
  const summaries: ThemeSummary[] = [...relicData.themes].reverse().map((theme) => {
    const sections = mechanicData.themes[theme.id] ?? [];
    const sum = (item: boolean) =>
      sections.filter((s) => (s.kind === "item") === item).reduce((n, s) => n + s.entries.length, 0);
    return {
      theme,
      banner: Boolean(mechanicData.banners[theme.id]),
      relics: relicData.relics.filter((r) => r.theme === theme.id).length,
      effects: sum(false),
      items: sum(true),
    };
  });

  return (
    <>
      <Crumbs items={[{ label: "Home", href: "/" }, { label: "Integrated Strategies" }]} />
      {/* centered gradient title, same style as the home page header */}
      <header className="-mt-4 flex flex-col items-center gap-3 pb-4 text-center sm:pb-6">
        <p className="flex items-center gap-3">
          <span className="home-rule" aria-hidden />
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--series-1)]">Arknights · Roguelike</span>
          <span className="home-rule flip" aria-hidden />
        </p>
        <h1 className="home-title text-4xl font-black uppercase tracking-[0.08em] sm:text-6xl">Integrated Strategies</h1>
        <p className="max-w-2xl text-[var(--ink-2)]">
          {`Every Integrated Strategies theme, including those so far only on the CN server: all ${relicData.relics.length} relics, plus each theme's own buffs, debuffs and special mechanic items.`}
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
        <HomeThemes summaries={summaries} />
      </Suspense>
    </>
  );
}
