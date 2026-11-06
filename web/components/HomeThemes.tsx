"use client";

import Link from "next/link";
import { LangSwitch, htmlLang, useLang, withLang } from "@/components/lang";
import { Theme, themeHref, themeName, themeShort } from "@/lib/relics";

export interface ThemeSummary {
  theme: Theme;
  banner: boolean;
  relics: number;
  effects: number;
  items: number;
}

/** Home page: one clickable card per IS theme, newest first. */
export function HomeThemes({ summaries }: { summaries: ThemeSummary[] }) {
  const [lang, setLang] = useLang();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LangSwitch lang={lang} onChange={setLang} />
        <Link
          href={withLang("/is/relics", lang)}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--ink-2)] hover:border-[var(--ink-2)]"
        >
          Search all relics →
        </Link>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaries.map(({ theme: t, banner, relics, effects, items }) => (
          <li key={t.id}>
            <Link
              href={withLang(themeHref(t.id), lang)}
              className="group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)] transition-colors hover:border-[var(--series-1)]"
            >
              <div className="aspect-[2/1] w-full bg-[var(--icon-well)]">
                {banner && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/themes/${t.id}.webp`}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-4">
                <p className="flex items-center gap-2 font-mono text-xs text-[var(--muted)]">
                  {themeShort(t.id)}
                  {!t.servers.includes("en") && (
                    <span className="rounded border border-[var(--border)] px-1 text-[10px] font-semibold text-[var(--ink-2)]">
                      CN only
                    </span>
                  )}
                </p>
                <h2 className="text-lg font-semibold leading-snug" lang={htmlLang(t.names[lang] ? lang : "en")}>
                  {themeName(t, lang)}
                </h2>
                <p className="mt-auto pt-2 text-sm text-[var(--ink-2)]">
                  {relics} relics · {effects} buffs/debuffs · {items} special items
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
