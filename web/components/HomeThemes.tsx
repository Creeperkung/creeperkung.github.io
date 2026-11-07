"use client";

import Link from "next/link";
import { htmlLang, useLang, withLang } from "@/components/lang";
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
  const [lang] = useLang();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href={withLang("/is/relics", lang)}
          className="rounded-sm border border-[var(--border)] px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-[var(--ink-2)] hover:border-[var(--series-1)] hover:text-[var(--series-1)]"
        >
          Search all relics →
        </Link>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaries.map(({ theme: t, banner, relics, effects, items }) => {
          const name = `${themeShort(t.id)} ${themeName(t, lang)}`;
          return (
            <li key={t.id}>
              {/* Rounded rectangle showing only the theme's art; IS number + name slide in on hover/focus */}
              <Link
                href={withLang(themeHref(t.id), lang)}
                aria-label={name}
                title={`${relics} relics · ${effects} buffs/debuffs · ${items} special items`}
                className="group relative block aspect-[2/1] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--icon-well)] shadow-sm transition-[border-color,box-shadow] hover:border-[var(--series-1)] hover:shadow-[0_0_0_3px_color-mix(in_srgb,var(--series-1)_35%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--series-1)]"
              >
                {banner ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/themes/${t.id}.webp`}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04] group-focus-visible:scale-[1.04]"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center p-4 text-center font-semibold">{name}</span>
                )}
                {banner && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 flex flex-col justify-end gap-1 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                  >
                    <span className="flex items-center gap-2">
                      <span className="bg-[var(--series-1)] px-2 py-0.5 font-mono text-xs font-bold tracking-widest text-[#0a0f1a]">
                        {themeShort(t.id)}
                      </span>
                      {!t.servers.includes("en") && (
                        <span className="border border-white/40 px-1 font-mono text-[10px] font-semibold uppercase tracking-widest">
                          CN only
                        </span>
                      )}
                    </span>
                    <span
                      className="translate-y-1 text-lg font-bold leading-snug drop-shadow transition-transform duration-200 group-hover:translate-y-0 group-focus-visible:translate-y-0"
                      lang={htmlLang(t.names[lang] ? lang : "en")}
                    >
                      {themeName(t, lang)}
                    </span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
