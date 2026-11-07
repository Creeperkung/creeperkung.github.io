import { SITE_LINKS } from "@/lib/site";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

/** Ko-fi and Feedback buttons. Each one only renders once its URL is set in lib/site.ts. */
export function SupportLinks({ size = "lg" }: { size?: "lg" | "sm" }) {
  const { kofi, feedback } = SITE_LINKS;
  if (!kofi && !feedback) return null;
  const big = size === "lg";
  const base = `inline-flex items-center gap-2 rounded-xl border font-semibold transition-[background-color,border-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 ${
    big ? "px-4 py-2 text-base" : "px-2.5 py-1 text-xs"
  }`;
  const icon = big ? "h-5 w-5" : "h-3.5 w-3.5";

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {kofi && (
        <a
          href={kofi}
          {...external}
          className={`${base} border-[#ff5e5b]/60 bg-[#ff5e5b] text-white shadow-[0_0_18px_rgba(255,94,91,0.25)] hover:bg-[#ff4744] hover:shadow-[0_0_26px_rgba(255,94,91,0.45)] focus-visible:outline-[#ff5e5b]`}
        >
          {/* coffee cup with a heart */}
          <svg aria-hidden viewBox="0 0 24 24" className={icon} fill="currentColor">
            <path d="M3 5h14v7a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6V5Zm14 2h1.5a3.5 3.5 0 0 1 0 7H17v-2h1.5a1.5 1.5 0 0 0 0-3H17V7Z" />
            <path fill="#ff5e5b" d="M10 15.2 7.3 12.6a1.6 1.6 0 0 1 2.3-2.3l.4.4.4-.4a1.6 1.6 0 0 1 2.3 2.3L10 15.2Z" />
          </svg>
          Support on Ko-fi
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      )}
      {feedback && (
        <a
          href={feedback}
          {...external}
          className={`${base} border-[var(--series-1)]/60 bg-[#141b2a] text-[var(--ink)] hover:border-[var(--series-1)] hover:bg-[#1c2436] hover:shadow-[0_0_22px_color-mix(in_srgb,var(--series-1)_35%,transparent)] focus-visible:outline-[var(--series-1)]`}
        >
          {/* speech bubble */}
          <svg aria-hidden viewBox="0 0 24 24" className={`${icon} text-[var(--series-1)]`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
            <path d="M4 5h16v11H9l-5 4V5Z" />
            <path d="M8 9.5h8M8 12.5h5" strokeLinecap="round" />
          </svg>
          Send feedback
          <span className="sr-only">(opens a form in a new tab)</span>
        </a>
      )}
    </div>
  );
}
