import type { Metadata } from "next";
import { Suspense } from "react";
import { AllRelics } from "@/components/AllRelics";
import { Crumbs } from "@/components/Crumbs";
import { relicData } from "@/lib/relics";

export const metadata: Metadata = {
  title: "All Relics — Relic Index",
  description: "Search every Arknights Integrated Strategies relic across all themes",
};

export default function RelicsPage() {
  return (
    <>
      <header className="flex flex-col gap-2">
        <Crumbs
          items={[{ label: "Home", href: "/" }, { label: "Integrated Strategies", href: "/is" }, { label: "All relics" }]}
        />
        <h1 className="text-3xl font-bold tracking-tight">All relics</h1>
        <p className="max-w-2xl text-[var(--ink-2)]">
          All {relicData.relics.length} collectible relics from {relicData.themes.length} themes. Search names,
          effects and unlock conditions in English, Japanese or Chinese, and filter by theme, rarity and type.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading relics…</p>}>
        <AllRelics data={relicData} />
      </Suspense>
    </>
  );
}
