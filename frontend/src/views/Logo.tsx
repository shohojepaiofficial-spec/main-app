import Link from "next/link";
import { SITE_NAME } from "@/lib/seo";

// A generic "SP" monogram mark — no external image asset, so it's crisp at
// any size and follows the theme's own color tokens (bg-primary/
// primary-foreground) rather than a hardcoded color, same convention as the
// rest of the app (see docs/ARCHITECTURE.md's "Theming"). Used wherever the
// brand wordmark previously appeared as plain "Shop." text (Navbar, Footer).
// Splits off the last word of the site name to give it the primary-color
// accent below — derived from SITE_NAME rather than hardcoded, so this stays
// correct if the name ever changes instead of silently drifting out of sync.
// A single-word name just renders whole in the accent color, which still
// reads fine.
function splitWordmark(name: string): [string, string] {
  const words = name.trim().split(/\s+/);
  const accent = words.pop() ?? name;
  return [words.join(" "), accent];
}

export function Logo({
  className = "",
  wordmarkClassName = "text-foreground",
  showWordmark = true,
}: {
  className?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
}) {
  const [lead, accent] = splitWordmark(SITE_NAME);

  return (
    <Link href="/" className={`flex shrink-0 items-center gap-2 ${className}`}>
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <text
          x="50%"
          y="50%"
          dy="0.35em"
          textAnchor="middle"
          className="fill-primary-foreground"
          style={{ fontSize: 13, fontWeight: 700 }}
        >
          SP
        </text>
      </svg>
      {showWordmark && (
        <span className={`text-xl font-bold tracking-tight ${wordmarkClassName}`}>
          {lead && `${lead} `}
          <span className="text-primary">{accent}</span>
        </span>
      )}
    </Link>
  );
}
