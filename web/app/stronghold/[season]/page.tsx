import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Crumbs } from "@/components/Crumbs";
import { SeasonView } from "@/components/SeasonView";
import { seasonMeta, strongholdData } from "@/lib/stronghold";

// /stronghold/alliance, … one page per season
export const dynamicParams = false;
export function generateStaticParams() {
  return strongholdData.seasons.map((s) => ({ season: s.id }));
}

const seasonFor = (id: string) => strongholdData.seasons.find((s) => s.id === id);

export async function generateMetadata({ params }: PageProps<"/stronghold/[season]">): Promise<Metadata> {
  const season = seasonFor((await params).season);
  return season ? { title: `Stronghold Protocol: ${season.names.en ?? season.names.zh} — ROSMEOWTIS` } : {};
}

export default async function SeasonPage({ params }: PageProps<"/stronghold/[season]">) {
  const season = seasonFor((await params).season);
  if (!season) notFound();
  return (
    <>
      <Crumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Stronghold Protocol", href: "/stronghold" },
          { label: season.names.en ?? season.names.zh },
        ]}
      />
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
        <SeasonView
          season={seasonMeta(season)}
          sections={season.sections}
          operators={season.operators}
          operatorsSource={season.operatorsSource}
        />
      </Suspense>
    </>
  );
}
