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

// Saturated two-stop gradients (not pastel tints) — a flat light-tinted box
// read as "dull/generic" the first time around, so these lean into real
// color instead of a subtle background wash. Cycled deterministically by
// category name (not index), so a category keeps the same color as the
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
  className = "h-36",
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
      className={`group relative flex flex-col justify-end overflow-hidden rounded-xl p-4 text-white transition-all duration-500 ease-out hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-xl ${className}`}
      style={{ background: gradient }}
    >
      <div className="absolute inset-0 bg-white/0 transition-colors duration-500 ease-out group-hover:bg-white/10" />
      {/* Icon is resolved dynamically from a fixed, stable set of
          module-level lucide components (never created on the fly), but
          JSX's <Icon /> tag trips the static-components lint heuristic
          regardless — createElement says the same thing without the
          false positive. */}
      {createElement(Icon, {
        size: 80,
        strokeWidth: 1.25,
        className:
          "absolute -right-4 -top-4 text-white/15 transition-transform duration-500 ease-out group-hover:rotate-6 group-hover:scale-125",
      })}
      {createElement(Icon, { size: 20, className: "relative mb-2 text-white/90" })}
      <p className="relative font-medium">{category}</p>
      <p className="relative text-xs text-white/75">
        {count} product{count === 1 ? "" : "s"}
      </p>
    </Link>
  );
}
