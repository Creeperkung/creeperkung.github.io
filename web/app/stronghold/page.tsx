import type { Metadata } from "next";
import { Crumbs } from "@/components/Crumbs";

export const metadata: Metadata = {
  title: "Stronghold Protocol — Relic Index",
  description: "Arknights Stronghold Protocol: coming soon",
};

/** /stronghold: placeholder until the mode is out on the CN server and its data can be extracted. */
export default function StrongholdHome() {
  return (
    <>
      <header className="flex flex-col gap-2">
        <Crumbs items={[{ label: "Home", href: "/" }, { label: "Stronghold Protocol" }]} />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Stronghold Protocol</h1>
          <span className="rounded border border-[var(--border)] px-1.5 py-0.5 text-xs font-medium text-[var(--ink-2)]">
            Coming soon
          </span>
        </div>
      </header>
      <p className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--muted)]">
        This mode isn&apos;t out on the CN server yet. Its data will be added here once it is.
      </p>
    </>
  );
}
