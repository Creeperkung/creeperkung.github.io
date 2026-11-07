import Link from "next/link";
import { SupportLinks } from "@/components/SupportLinks";
import { MODES } from "@/lib/modes";
import { SITE_LINKS } from "@/lib/site";

export default function Home() {
  return (
    <>
      {/* full-screen background image for the home page (see .home-backdrop in globals.css) */}
      <div className="home-backdrop" aria-hidden />
      <header className="flex flex-col items-center gap-3 py-6 text-center sm:py-10">
        <p className="flex items-center gap-3">
          <span className="home-rule" aria-hidden />
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--series-1)]">Arknights · Database</span>
          <span className="home-rule flip" aria-hidden />
        </p>
        <h1 className="home-title text-5xl font-black uppercase tracking-[0.08em] sm:text-7xl">ROSMEOWTIS</h1>
        <p className="max-w-2xl text-[var(--ink-2)]">
          Reference pages for Arknights game modes.
        </p>
        <p className="mt-3 flex flex-wrap items-center justify-center gap-3 font-mono text-sm uppercase tracking-[0.2em] text-[var(--ink-2)]">
          Created by
          <a
            href={SITE_LINKS.youtube}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2.5 rounded-xl border border-[#ff4e5b]/60 bg-[#141b2a] py-2 pl-2 pr-4 text-lg font-semibold normal-case tracking-normal text-[var(--ink)] shadow-[0_0_18px_rgba(255,0,51,0.18)] transition-[background-color,border-color,box-shadow] hover:border-[#ff4e5b] hover:bg-[#1c2436] hover:shadow-[0_0_26px_rgba(255,0,51,0.4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4e5b]"
          >
            {/* channel profile picture (public/youtube-avatar.webp, from the YouTube channel) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/youtube-avatar.webp"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg ring-2 ring-[#ff4e5b]/70 transition-transform group-hover:scale-110"
            />
            RosMeowTis
            {/* YouTube logo: red rounded rectangle with a white play triangle */}
            <svg aria-hidden viewBox="0 0 28 20" className="ml-1 h-5 w-7">
              <path fill="#ff0033" d="M27.4 3.1A3.5 3.5 0 0 0 25 .6C22.8 0 14 0 14 0S5.2 0 3 .6A3.5 3.5 0 0 0 .6 3.1C0 5.3 0 10 0 10s0 4.7.6 6.9A3.5 3.5 0 0 0 3 19.4c2.2.6 11 .6 11 .6s8.8 0 11-.6a3.5 3.5 0 0 0 2.4-2.5c.6-2.2.6-6.9.6-6.9s0-4.7-.6-6.9Z" />
              <path fill="#fff" d="M11.2 14.3 18.5 10l-7.3-4.3v8.6Z" />
            </svg>
            <span className="sr-only">(YouTube channel, opens in a new tab)</span>
          </a>
        </p>
        <SupportLinks />
      </header>
      {/* Same art-only rounded tiles as the IS theme list (HomeThemes), two per row so they're bigger */}
      <ul className="grid gap-6 sm:grid-cols-2">
        {MODES.map((m) => {
          const label = m.comingSoon ? `${m.name} (coming soon)` : m.name;
          return (
            <li key={m.id}>
              <Link
                href={m.href}
                aria-label={label}
                title={m.blurb}
                className="group relative block aspect-[2/1] overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--icon-well)] shadow-sm transition-[border-color,box-shadow] hover:border-[var(--series-1)] hover:shadow-[0_0_0_3px_color-mix(in_srgb,var(--series-1)_35%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--series-1)]"
              >
                {m.image ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.image}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04] group-focus-visible:scale-[1.04]"
                    />
                    {/* name and blurb slide in on hover/focus */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 flex flex-col justify-end gap-1.5 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-5 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                    >
                      <span className="translate-y-1 text-2xl font-bold leading-snug drop-shadow transition-transform duration-200 group-hover:translate-y-0 group-focus-visible:translate-y-0">
                        {m.name}
                      </span>
                      <span className="max-w-xl text-sm text-white/85">{m.blurb}</span>
                    </span>
                  </>
                ) : (
                  // no art yet: show the name (and Coming soon) in the tile itself
                  <span className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                    <span className="text-2xl font-bold">{m.name}</span>
                    {m.comingSoon && (
                      <span className="border border-[var(--border)] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ink-2)]">
                        Coming soon
                      </span>
                    )}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
