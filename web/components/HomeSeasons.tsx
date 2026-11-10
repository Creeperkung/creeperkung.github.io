"use client";

import Link from "next/link";
import { htmlLang, useLang, withLang } from "@/components/lang";
import { Season, seasonBanner, seasonHref, seasonName } from "@/lib/stronghold";

export interface SeasonSummary {
  season: Season;
  /** "23 alliances", "41 strategies", … */
  stats: string[];
}

/**
 * Stronghold Protocol home: one card per season, newest first. Same tiles as the IS theme cards:
 * only the season's banner, with its name sliding in on hover/focus.
 */
export function HomeSeasons({ summaries }: { summaries: SeasonSummary[] }) {
  const [lang] = useLang();
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {summaries.map(({ season: s, stats }) => {
        const name = seasonName(s, lang);
        return (
          <li key={s.id}>
            <Link
              href={withLang(seasonHref(s.id), lang)}
              aria-label={name}
              title={stats.join(" · ")}
              className="group relative block aspect-[2/1] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--icon-well)] shadow-sm transition-[border-color,box-shadow] hover:border-[var(--series-1)] hover:shadow-[0_0_0_3px_color-mix(in_srgb,var(--series-1)_35%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--series-1)]"
            >
              {s.banner ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={seasonBanner(s.id)}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04] group-focus-visible:scale-[1.04]"
                />
              ) : (
                <span className="flex h-full items-center justify-center p-4 text-center font-semibold">{name}</span>
              )}
              {s.banner && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 flex flex-col justify-end gap-1 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  <span className="flex items-center gap-2">
                    <span className="bg-[var(--series-1)] px-2 py-0.5 font-mono text-xs font-bold tracking-widest text-[#0a0f1a]">
                      Season
                    </span>
                    {!s.servers.includes("en") && (
                      <span className="border border-white/40 px-1 font-mono text-[10px] font-semibold uppercase tracking-widest">
                        CN only
                      </span>
                    )}
                  </span>
                  <span
                    className="translate-y-1 text-lg font-bold leading-snug drop-shadow transition-transform duration-200 group-hover:translate-y-0 group-focus-visible:translate-y-0"
                    lang={htmlLang(s.names[lang] ? lang : "en")}
                  >
                    {name}
                  </span>
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
