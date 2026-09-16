"use client";

import { Heart } from "lucide-react";
import toast from "react-hot-toast";
import { useWishlistStore } from "@/controllers/useWishlistStore";
import { useAuthController } from "@/controllers/useAuthController";
import { useUIStore } from "@/controllers/useUIStore";

export function WishlistButton({ productId, className }: { productId: string; className?: string }) {
  const { isAuthenticated } = useAuthController();
  const openAuthModal = useUIStore((s) => s.openAuthModal);
  const isSaved = useWishlistStore((s) => s.productIds.has(productId));
  const toggle = useWishlistStore((s) => s.toggle);

  const onClick = async (e: React.MouseEvent) => {
    // Products are usually shown inside a card that's itself a link to the
    // product page — this button must not also trigger that navigation.
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }

    try {
      await toggle(productId);
    } catch {
      toast.error("Failed to update wishlist");
    }
  };

  return (
    <button
      onClick={onClick}
      aria-label={isSaved ? "Remove from wishlist" : "Save to wishlist"}
      aria-pressed={isSaved}
      className={
        className ??
        "flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-foreground shadow-sm hover:text-red-600"
      }
    >
      <Heart size={16} className={isSaved ? "fill-red-500 text-red-500" : ""} />
    </button>
  );
}
