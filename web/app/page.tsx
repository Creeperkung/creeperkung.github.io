import Link from "next/link";
import { MODES } from "@/lib/modes";

export default function Home() {
  return (
    <>
      <header className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--muted)]">Arknights</p>
        <h1 className="text-3xl font-bold tracking-tight">Rosmontis</h1>
        <p className="max-w-2xl text-[var(--ink-2)]">
          Reference pages for Arknights game modes, in English, Japanese and Chinese. Pick a mode to start.
        </p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((m) => (
          <li key={m.id}>
            <Link
              href={m.href}
              className="group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)] transition-colors hover:border-[var(--series-1)]"
            >
              <div className="flex aspect-[2/1] w-full items-center justify-center bg-[var(--icon-well)]">
                {m.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.image} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <span className="font-mono text-xs uppercase tracking-widest text-[var(--muted)]" aria-hidden>
                    {m.name}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold leading-snug group-hover:underline">{m.name}</h2>
                  {m.comingSoon && (
                    <span className="rounded border border-[var(--border)] px-1.5 py-0.5 text-xs font-medium text-[var(--ink-2)]">
                      Coming soon
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--ink-2)]">{m.blurb}</p>
                {m.stats.length > 0 && <p className="mt-auto text-xs text-[var(--muted)]">{m.stats.join(" · ")}</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
