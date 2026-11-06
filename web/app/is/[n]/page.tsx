import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ThemeView } from "@/components/ThemeView";
import { mechanicData } from "@/lib/mechanics";
import { relicData, themeIdFromNo, themeNo, themeShort } from "@/lib/relics";

// /is/2 … /is/7, by community IS number
export const dynamicParams = false;
export function generateStaticParams() {
  return relicData.themes.map((t) => ({ n: String(themeNo(t.id)) }));
}

const themeFor = (n: string) => relicData.themes.find((t) => t.id === themeIdFromNo(n));

export async function generateMetadata({ params }: PageProps<"/is/[n]">): Promise<Metadata> {
  const theme = themeFor((await params).n);
  return theme ? { title: `${themeShort(theme.id)} ${theme.names.en} — Relic Index` } : {};
}

export default async function ThemePage({ params }: PageProps<"/is/[n]">) {
  const theme = themeFor((await params).n);
  if (!theme) notFound();
  // Only this theme's data goes to the client.
  const data = { ...relicData, themes: [theme], relics: relicData.relics.filter((r) => r.theme === theme.id) };
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
      <ThemeView
        data={data}
        sections={mechanicData.themes[theme.id] ?? []}
        banner={Boolean(mechanicData.banners[theme.id])}
      />
    </Suspense>
  );
}
