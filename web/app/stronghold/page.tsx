import type { Metadata } from "next";
import { Crumbs } from "@/components/Crumbs";
import { HomeSeasons, SeasonSummary } from "@/components/HomeSeasons";
import { ArtBackdrop } from "@/components/ArtBackdrop";
import { seasonBanner, seasonMeta, strongholdData, tabCount } from "@/lib/stronghold";

export const metadata: Metadata = {
  title: "Stronghold Protocol — ROSMEOWTIS",
  description: "Arknights Stronghold Protocol: every season's operators, alliances, strategies and bosses",
};

/** /stronghold: Stronghold Protocol home, one card per season. Mirrors /is. */
export default function StrongholdHome() {
  const newest = strongholdData.seasons.at(-1);
  const summaries: SeasonSummary[] = [...strongholdData.seasons].reverse().map((s) => ({
    season: seasonMeta(s),
    stats: (["operators", "alliances", "strategies", "equipment", "enemies"] as const).map((t) => `${tabCount(s, t)} ${t}`),
  }));

  return (
    <>
      <ArtBackdrop src={newest?.banner ? seasonBanner(newest.id) : undefined} />
      <Crumbs items={[{ label: "Home", href: "/" }, { label: "Stronghold Protocol" }]} />
      <header className="-mt-4 flex flex-col items-center gap-3 pb-4 text-center sm:pb-6">
        <p className="flex items-center gap-3">
          <span className="home-rule" aria-hidden />
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--series-1)]">Arknights · Auto-battler</span>
          <span className="home-rule flip" aria-hidden />
        </p>
        <h1 className="home-title text-4xl font-black uppercase tracking-[0.08em] sm:text-6xl">Stronghold Protocol</h1>
        <p className="max-w-2xl text-[var(--ink-2)]">
          Every Stronghold Protocol season: its operator pool, alliances, opening strategies, bosses and special enemy types, in English, 日本語 and 中文.
        </p>
      </header>
      <HomeSeasons summaries={summaries} />
    </>
  );
}
