import { Suspense } from "react";
import { RelicBrowser } from "@/components/RelicBrowser";
import { relicData } from "@/lib/relics";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--muted)]">
          Arknights · Integrated Strategies
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Relic Index</h1>
        <p className="max-w-2xl text-[var(--ink-2)]">
          Every collectible relic from all {relicData.themes.length} Integrated Strategies themes (
          {relicData.relics.length} total), with effects, descriptions and unlock conditions. Search
          and filter by theme, rarity and type.
        </p>
      </header>

      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading relics…</p>}>
        <RelicBrowser data={relicData} />
      </Suspense>

      <footer className="border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
        Data from the EN game client ({relicData.generatedAt}) via{" "}
        <a className="underline" href="https://github.com/Kengxxiao/ArknightsGameData_YoStar">
          ArknightsGameData_YoStar
        </a>
        . Fan-made, not affiliated with Hypergryph or Yostar.
      </footer>
    </main>
  );
}
