import { createElement } from "react";
import Link from "next/link";
import {
  Tag,
  Shirt,
  Watch,
  Home,
  Sparkles,
  Gamepad2,
  Utensils,
  Dumbbell,
  Gift,
  BookOpen,
  Baby,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

// Saturated two-stop gradients (not pastel tints) — cycled deterministically
// by category name (not index), so a category keeps the same color as the
// list re-sorts/filters instead of reshuffling on every reload. Shared by
// the homepage showcase and the full /categories page so both read as the
// same design language.
const TILE_GRADIENTS = [
  "linear-gradient(150deg, #1a9d57, #0d5c30)",
  "linear-gradient(150deg, #e08a3c, #a85a1a)",
  "linear-gradient(150deg, #2596a6, #145a68)",
  "linear-gradient(150deg, #8b5cc9, #5a3591)",
  "linear-gradient(150deg, #3a86c8, #1f5686)",
  "linear-gradient(150deg, #d1595f, #973638)",
];

// Best-effort icon per common category name, falling back to a generic tag
// — categories are free-text (no fixed taxonomy, see productController.ts),
// so this can never be exhaustive, but it covers the common storefront
// cases and a plain color tile is still fine for anything unmatched.
const ICON_KEYWORDS: [RegExp, LucideIcon][] = [
  [/cloth|apparel|fashion|wear/i, Shirt],
  [/watch|jewel|accessor/i, Watch],
  [/home|furnit|decor|kitchen/i, Home],
  [/beauty|cosmetic|skin/i, Sparkles],
  [/game|toy/i, Gamepad2],
  [/food|grocer|snack/i, Utensils],
  [/sport|fitness|gym/i, Dumbbell],
  [/gift/i, Gift],
  [/book|stationery/i, BookOpen],
  [/baby|kid|child/i, Baby],
  [/electronic|phone|gadget|tech/i, Smartphone],
];

function iconFor(category: string): LucideIcon {
  return ICON_KEYWORDS.find(([pattern]) => pattern.test(category))?.[1] ?? Tag;
}

function hashIndex(category: string, length: number) {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) | 0;
  return Math.abs(hash) % length;
}

export function CategoryTile({
  category,
  count,
  className = "",
}: {
  category: string;
  count: number;
  className?: string;
}) {
  const Icon = iconFor(category);
  const gradient = TILE_GRADIENTS[hashIndex(category, TILE_GRADIENTS.length)];

  return (
    <Link
      href={`/shop?category=${encodeURIComponent(category)}`}
      className={`group grid grid-rows-[56px_auto] ${className}`}
    >
      {/* Colored strip slides down on hover, revealing more of the dark
          panel's rounded top corner underneath it — same layered-card
          trick as the reference, recolored to this category's own themed
          gradient instead of a fixed accent color. */}
      <div
        className="relative rounded-t-[10px] transition-transform duration-200 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:translate-y-4"
        style={{ background: gradient }}
      >
        {createElement(Icon, {
          size: 26,
          className: "absolute right-3 top-3 text-white/90",
        })}
      </div>

      {/* Overlaps the strip by 10px (rounded on all corners, unlike the
          strip's top-only rounding) — the same reveal trick, just recolored
          to the site's own dark foreground tone instead of the reference's
          navy. */}
      <div className="relative top-[-10px] grid gap-2 rounded-[10px] bg-foreground p-4 text-background">
        <div className="flex items-center">
          <p className="flex-1 truncate text-sm font-medium">{category}</p>
          <div className="flex shrink-0 gap-1">
            <span className="h-[5px] w-[5px] rounded-full bg-background/30" />
            <span className="h-[5px] w-[5px] rounded-full bg-background/30" />
            <span className="h-[5px] w-[5px] rounded-full bg-background/30" />
          </div>
        </div>
        <p className="text-2xl leading-none font-medium">{count}</p>
        <p className="text-xs text-background/60">product{count === 1 ? "" : "s"} in stock</p>
      </div>
    </Link>
  );
}
