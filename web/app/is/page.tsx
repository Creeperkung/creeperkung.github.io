import type { Metadata } from "next";
import { Suspense } from "react";
import { Crumbs } from "@/components/Crumbs";
import { HomeThemes, ThemeSummary } from "@/components/HomeThemes";
import { mechanicData } from "@/lib/mechanics";
import { relicData } from "@/lib/relics";

export const metadata: Metadata = {
  title: "Integrated Strategies — Rosmontis",
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
      <header className="flex flex-col gap-2">
        <Crumbs items={[{ label: "Home", href: "/" }, { label: "Integrated Strategies" }]} />
        <h1 className="text-3xl font-bold uppercase tracking-wide">Integrated Strategies</h1>
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
