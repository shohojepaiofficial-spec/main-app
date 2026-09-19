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

// Each entry pairs a strip color (top layer, icon) with a panel color
// (bottom layer, text) in the same hue — was one fixed dark-green panel
// paired with six differently-hued strips, which read as mismatched.
// Cycled deterministically by category name (not index), so a category
// keeps its pairing as the list re-sorts/filters instead of reshuffling.
const TILE_THEMES = [
  {
    strip: "linear-gradient(150deg, #3fbf7f, #15914f)",
    panel: "linear-gradient(160deg, #1f9c5a, #0d5c30)",
  },
  {
    strip: "linear-gradient(150deg, #5fd39a, #22a366)",
    panel: "linear-gradient(160deg, #2aab72, #135c39)",
  },
  {
    strip: "linear-gradient(150deg, #2fae6a, #0f7a41)",
    panel: "linear-gradient(160deg, #17814a, #084023)",
  },
  {
    strip: "linear-gradient(150deg, #7ee0ab, #3fbf7f)",
    panel: "linear-gradient(160deg, #3fbf7f, #1a6b45)",
  },
  {
    strip: "linear-gradient(150deg, #34c37a, #16824f)",
    panel: "linear-gradient(160deg, #1c8a52, #0a4227)",
  },
  {
    strip: "linear-gradient(150deg, #56cf8f, #1f9c5a)",
    panel: "linear-gradient(160deg, #279b5e, #0f4f2f)",
  },
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
  className = "h-40",
}: {
  category: string;
  count: number;
  className?: string;
}) {
  const Icon = iconFor(category);
  const theme = TILE_THEMES[hashIndex(category, TILE_THEMES.length)];

  return (
    <Link
      href={`/shop?category=${encodeURIComponent(category)}`}
      className={`group relative block overflow-hidden rounded-xl ${className}`}
    >
      {/* Back layer: the full card, always — this is what "the whole
          thing" hovering reveals. Half of it already shows below the strip
          at rest (the strip only covers the top half), rather than the
          previous 10px sliver. */}
      <div
        className="absolute inset-0 flex flex-col justify-end gap-1 p-4 text-white"
        style={{ background: theme.panel }}
      >
        <p className="truncate text-sm font-medium">{category}</p>
        <p className="text-2xl leading-none font-medium">{count}</p>
        <p className="text-xs text-white/70">product{count === 1 ? "" : "s"} in stock</p>
      </div>

      {/* Front layer: covers the top half at rest, and lifts straight off
          the card on hover — a curtain pulling back, not a strip creeping
          further down over the panel's own text (which is what the
          previous translate-y-down version actually did). */}
      <div
        className="absolute inset-x-0 top-0 h-1/2 transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:-translate-y-full"
        style={{ background: theme.strip }}
      >
        {createElement(Icon, {
          size: 24,
          className: "absolute right-3 top-3 text-white/90",
        })}
      </div>
    </Link>
  );
}
