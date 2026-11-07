import type { Metadata } from "next";
import { Suspense } from "react";
import { AllRelics } from "@/components/AllRelics";
import { Crumbs } from "@/components/Crumbs";
import { relicData } from "@/lib/relics";

export const metadata: Metadata = {
  title: "All Relics — ROSMEOWTIS",
  description: "Search every Arknights Integrated Strategies relic across all themes",
};

export default function RelicsPage() {
  return (
    <>
      <Crumbs
        items={[{ label: "Home", href: "/" }, { label: "Integrated Strategies", href: "/is" }, { label: "All relics" }]}
      />
      {/* centered gradient title, same style as the home and IS pages */}
      <header className="-mt-4 flex flex-col items-center gap-3 pb-2 text-center">
        <p className="flex items-center gap-3">
          <span className="home-rule" aria-hidden />
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--series-1)]">Integrated Strategies</span>
          <span className="home-rule flip" aria-hidden />
        </p>
        <h1 className="home-title text-4xl font-black uppercase tracking-[0.08em] sm:text-6xl">All relics</h1>
        <p className="max-w-2xl text-[var(--ink-2)]">
          {relicData.relics.length} relics from {relicData.themes.length} themes. Search in English, Japanese or
          Chinese.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading relics…</p>}>
        <AllRelics data={relicData} />
      </Suspense>
    </>
  );
}
