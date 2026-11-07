import Link from "next/link";

/** Breadcrumb trail; the last item is the current page (no link). */
export function Crumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-[var(--muted)]">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>›</span>}
            {c.href ? (
              <Link href={c.href} className="hover:text-[var(--ink)] hover:underline">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-[var(--ink-2)]">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
