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
          {relicData.relics.length} total), including themes so far only on the CN server, with
          effects, descriptions and unlock conditions in English, Japanese and Chinese. Filter by
          theme, rarity and type.
        </p>
      </header>

      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading relics…</p>}>
        <RelicBrowser data={relicData} />
      </Suspense>

      <footer className="border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
        Data from the EN, JP and CN game clients ({relicData.generatedAt}) via{" "}
        <a className="underline" href="https://github.com/ArknightsAssets/ArknightsGamedata">
          ArknightsGamedata
        </a>
        ; icons via ArknightsAssets,{" "}
        <a className="underline" href="https://prts.wiki">
          PRTS
        </a>{" "}
        and the{" "}
        <a className="underline" href="https://arknights.wiki.gg">
          Arknights Terra Wiki
        </a>
        . Text for CN-only relics is the official EN wording where the relic was reprinted from an
        earlier theme, and an unofficial fan translation otherwise. CN-only theme names are
        unofficial. Fan-made, not affiliated with Hypergryph or Yostar.
      </footer>
    </main>
  );
}
