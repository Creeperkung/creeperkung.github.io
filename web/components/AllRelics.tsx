"use client";

import { LangSwitch, useLang } from "@/components/lang";
import { RelicBrowser } from "@/components/RelicBrowser";
import { RelicData } from "@/lib/relics";

/** /relics: every theme's relics in one searchable list. */
export function AllRelics({ data }: { data: RelicData }) {
  const [lang, setLang] = useLang();
  return (
    <div className="flex flex-col gap-6">
      <LangSwitch lang={lang} onChange={setLang} />
      <RelicBrowser data={data} lang={lang} />
    </div>
  );
}
