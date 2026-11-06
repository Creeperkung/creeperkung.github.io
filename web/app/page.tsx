import { Suspense } from "react";
import { HomeThemes, ThemeSummary } from "@/components/HomeThemes";
import { mechanicData } from "@/lib/mechanics";
import { relicData } from "@/lib/relics";

export default function Home() {
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
      <header className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--muted)]">
          Arknights · Integrated Strategies
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Relic Index</h1>
        <p className="max-w-2xl text-[var(--ink-2)]">
          {`Every Integrated Strategies theme, including those so far only on the CN server: all ${relicData.relics.length} relics, plus each theme's own buffs, debuffs and special mechanic items, in English, Japanese and Chinese. Pick a theme to start.`}
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
        <HomeThemes summaries={summaries} />
      </Suspense>
    </>
  );
}
