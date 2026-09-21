import { createElement } from "react";
import Link from "next/link";
import { icons, Tag, type LucideIcon } from "lucide-react";
import Fuse from "fuse.js";
import { T } from "@/components/ui/T";

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
// repeating one of a handful of hand-picked pairs. `glow` is a lighter tint
// of the same hue for the decorative background rings.
function themeFor(category: string) {
  const hue = 90 + (hashOf(category) % 75);
  return {
    background: `linear-gradient(135deg, hsl(${hue} 55% 58%), hsl(${hue} 62% 40%))`,
    glow: `hsl(${hue} 70% 80%)`,
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
      className={`group relative block overflow-hidden rounded-2xl p-5 text-white ${className}`}
      style={{ background: theme.background }}
    >
      {/* Concentric rings behind the icon — subtle depth instead of a flat
          fill, same idea as the reference's rippled background. */}
      <span
        className="pointer-events-none absolute -right-10 -bottom-10 h-36 w-36 rounded-full opacity-[0.14] transition-transform duration-500 ease-out group-hover:scale-110"
        style={{ background: theme.glow }}
      />
      <span
        className="pointer-events-none absolute -right-4 -bottom-4 h-24 w-24 rounded-full opacity-[0.18] transition-transform duration-500 ease-out group-hover:scale-110"
        style={{ background: theme.glow }}
      />

      <div className="relative z-10">
        <p className="truncate text-lg font-bold">{category}</p>
        <p className="text-sm text-white/75">
          <T k={count === 1 ? "category.productCount.one" : "category.productCount.other"} vars={{ count }}>
            {count === 1 ? "{count} product" : "{count} products"}
          </T>
        </p>
      </div>

      <div className="absolute -right-2 -bottom-2 z-10 transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-110">
        {createElement(Icon, {
          size: 72,
          strokeWidth: 1.5,
          className: "text-white drop-shadow-md",
        })}
      </div>
    </Link>
  );
}
