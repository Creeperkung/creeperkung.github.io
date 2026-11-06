import Link from "next/link";
import { MODES } from "@/lib/modes";

export default function Home() {
  return (
    <>
      <header className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--muted)]">Arknights</p>
        <h1 className="text-3xl font-bold tracking-tight">Relic Index</h1>
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
              <div className="aspect-[2/1] w-full bg-[var(--icon-well)]">
                {m.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.image} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h2 className="text-lg font-semibold leading-snug group-hover:underline">{m.name}</h2>
                <p className="text-sm text-[var(--ink-2)]">{m.blurb}</p>
                <p className="mt-auto text-xs text-[var(--muted)]">{m.stats.join(" · ")}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
