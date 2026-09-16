import Link from "next/link";
import { Megaphone } from "lucide-react";
import { AppliedPromo } from "@/models";
import { formatPromoDiscount } from "@/lib/promo";

// Server-renderable (no interactivity needed) — the link's ?promo= query
// param is what actually applies the discount, via the same PromoAutoApply
// mechanism used for shared product links (see views/PromoAutoApply.tsx).
export function PromoAnnouncementBar({ promo }: { promo: AppliedPromo | null }) {
  if (!promo) return null;

  return (
    <div className="bg-primary text-primary-foreground text-sm">
      <Link
        href={`/shop?promo=${encodeURIComponent(promo.code)}`}
        className="flex items-center justify-center gap-2 px-4 py-2 text-center hover:underline"
      >
        <Megaphone size={14} className="shrink-0" />
        <span>
          {formatPromoDiscount(promo)} storewide with code <strong>{promo.code}</strong> — Shop
          now
        </span>
      </Link>
    </div>
  );
}
