"use client";

import { useLang } from "@/components/lang";
import { RelicBrowser } from "@/components/RelicBrowser";
import { RelicData } from "@/lib/relics";

/** /is/relics: every theme's relics in one searchable list (language comes from the top bar). */
export function AllRelics({ data }: { data: RelicData }) {
  const [lang] = useLang();
  return <RelicBrowser data={data} lang={lang} />;
}
