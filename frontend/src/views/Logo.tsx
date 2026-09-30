import Image from "next/image";
import Link from "next/link";
import { SITE_NAME } from "@/lib/seo";

// The real brand mark — a cart/checkmark/arrow icon, cropped out of the
// supplied logo.png (which also had a "Shohoje Pai" wordmark baked into the
// same image) and re-exported as its own transparent asset at
// public/logo-icon.png. Kept as an image rather than tracing it as an SVG so
// its actual gradient gets used as-is; the wordmark next to it stays live
// text (see splitWordmark below) rather than being cropped from the same
// image too, so it still follows the theme's color tokens and dark mode
// instead of a fixed raster color.
const ICON_WIDTH = 47;
const ICON_HEIGHT = 32;

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
  onDarkBackground = false,
}: {
  className?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
  /**
   * The icon's cart and box are solid black, so on a dark band (the footer)
   * they vanish into it. Rather than recoloring the brand mark, this sets it
   * on a small white tile — the usual way a dark logo sits on a dark surface —
   * so every part keeps its real color. Fixed white, not a theme token: the
   * tile has to stay light whatever theme is on.
   */
  onDarkBackground?: boolean;
}) {
  const [lead, accent] = splitWordmark(SITE_NAME);

  const icon = (
    <Image
      src="/logo-icon.png"
      alt=""
      width={ICON_WIDTH}
      height={ICON_HEIGHT}
      priority
      className="shrink-0 object-contain"
    />
  );

  return (
    <Link href="/" className={`flex shrink-0 items-center gap-2 ${className}`}>
      {onDarkBackground ? (
        <span className="flex shrink-0 items-center justify-center rounded-lg bg-white px-1.5 py-1 shadow-sm ring-1 ring-black/5">
          {icon}
        </span>
      ) : (
        icon
      )}
      {showWordmark && (
        <span className={`text-xl font-bold tracking-tight ${wordmarkClassName}`}>
          {lead && `${lead} `}
          <span className="text-primary">{accent}</span>
        </span>
      )}
    </Link>
  );
}
