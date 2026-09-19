import { createElement } from "react";
import Link from "next/link";
import { icons, Tag, type LucideIcon } from "lucide-react";
import Fuse from "fuse.js";

// This file has no "use client" — it's a Server Component, so importing
// the full ~1800-icon lucide map and Fuse.js here costs nothing in the
// client bundle; only the handful of resolved SVGs actually rendered ever
// reach the browser.

// A deterministic hash, reused for both the icon and the color below — not
// cryptographic, just needs to spread category names out evenly and repeat
// for the same input.
function hashOf(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

// Procedural instead of a fixed palette — every category name gets its own
// hue (kept inside the site's own green family, ~90-165°) rather than
// repeating one of a handful of hand-picked pairs. Strip = lighter/vivid
// (icon layer), panel = deeper/richer (text layer), same hue so the two
// layers always read as one card instead of two mismatched colors.
function themeFor(category: string) {
  const hue = 90 + (hashOf(category) % 75);
  return {
    strip: `linear-gradient(150deg, hsl(${hue} 72% 54%), hsl(${hue} 70% 40%))`,
    panel: `linear-gradient(160deg, hsl(${hue} 62% 26%), hsl(${hue} 58% 14%))`,
  };
}

// Categories are free-text (no fixed taxonomy — see productController.ts),
// so there's no way to hand-map every possible name to an icon. Two-tier
// lookup instead of one fixed 11-pattern list:
//
// 1. SYNONYM_HINTS — the common storefront words whose natural icon isn't
//    lexically close to the word itself (fuzzy string matching can't
//    bridge "clothing" -> "Shirt" on its own; they share no characters).
// 2. A fuzzy search (Fuse.js) over a curated ~90-icon pool, for anything
//    the hints don't cover. Deliberately NOT the full ~1800-icon set —
//    tested against it directly and it confidently returns nonsense for
//    plausible category names ("Pets" -> a person icon, "Candles" ->
//    "ChartCandlestick", "Furniture" -> "BoneFracture") since fuzzy
//    matching only measures character similarity, not meaning, and a
//    bigger haystack means more coincidental near-misses. A smaller,
//    vetted pool trades a bit of coverage for never returning something
//    actively wrong — falls back to a plain tag instead, which reads as
//    neutral rather than embarrassing.
const SYNONYM_HINTS: [RegExp, string][] = [
  [/cloth|apparel|fashion(?!able)/i, "Shirt"],
  [/shoe|footwear|sneaker/i, "Footprints"],
  [/beauty|cosmetic|skincare|skin\b/i, "Sparkles"],
  [/jewel|accessor/i, "Gem"],
  [/tech\b|gadget|electronic/i, "Smartphone"],
  [/grocer/i, "ShoppingBasket"],
  [/furnitur|sofa|couch/i, "Sofa"],
  [/kitchen|cookware/i, "CookingPot"],
  [/pet\b|pets\b/i, "PawPrint"],
  [/sport|fitness|gym/i, "Dumbbell"],
  [/toy/i, "Gamepad2"],
  [/plant|garden/i, "Sprout"],
  [/stationery|office supp/i, "Pencil"],
  [/home|decor/i, "Home"],
  [/book/i, "BookOpen"],
  [/baby|kid|child/i, "Baby"],
  [/gift/i, "Gift"],
  [/food\b/i, "Utensils"],
  [/car\b|automotive|vehicle/i, "Car"],
  [/watch/i, "Watch"],
];

const ICON_CANDIDATES = [
  "Shirt", "Footprints", "Watch", "Gem", "Home", "Sofa", "Lamp", "UtensilsCrossed",
  "CookingPot", "Sparkles", "Gamepad2", "Dumbbell", "Bike", "Gift", "BookOpen", "Baby",
  "Smartphone", "Laptop", "Headphones", "Camera", "Backpack", "Car", "PawPrint", "Music",
  "Palette", "Wrench", "Hammer", "Scissors", "Glasses", "ShoppingBag", "ShoppingBasket",
  "Coffee", "IceCreamCone", "Cookie", "Apple", "Carrot", "Fish", "Beef", "Wine", "Pill",
  "Stethoscope", "Bandage", "Flower2", "Sprout", "TreePine", "Tent", "Umbrella",
  "Snowflake", "Sun", "Heart", "Crown", "Briefcase", "GraduationCap", "Pencil",
  "Paintbrush", "Printer", "Monitor", "Keyboard", "Speaker", "Tv", "Lightbulb", "Luggage",
  "Plane", "Bus", "Train", "Truck", "Flashlight", "Handbag", "Puzzle", "BedSingle", "TowelRack", "ToolCase",
  "Drill", "Armchair", "Utensils", "Droplet", "Flame", "Dog", "Cat", "Rabbit", "Guitar",
  "Piano", "Trophy", "Medal", "Volleyball", "SprayCan", "Brush", "Syringe", "HeartPulse",
  "Vegan", "Croissant", "CupSoda",
].filter((name, i, arr) => arr.indexOf(name) === i && name in icons);

const iconSearch = new Fuse(ICON_CANDIDATES, { threshold: 0.3 });

function iconFor(category: string): LucideIcon {
  const hint = SYNONYM_HINTS.find(([pattern]) => pattern.test(category))?.[1];
  const name = hint ?? iconSearch.search(category)[0]?.item;
  return (name && icons[name as keyof typeof icons]) || Tag;
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
  const theme = themeFor(category);

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
