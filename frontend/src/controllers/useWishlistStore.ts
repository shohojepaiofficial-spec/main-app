import { create } from "zustand";
import * as wishlistService from "@/services/wishlistService";

interface WishlistState {
  productIds: Set<string>;
  isLoaded: boolean;
  load: () => Promise<void>;
  toggle: (productId: string) => Promise<void>;
  clear: () => void;
}

// Shared store rather than a per-component hook — a shop grid renders many
// ProductCards at once, and each independently fetching the wishlist would
// mean N requests instead of one. See useWishlistSync for when it loads/clears.
export const useWishlistStore = create<WishlistState>((set, get) => ({
  productIds: new Set(),
  isLoaded: false,
  load: async () => {
    try {
      const products = await wishlistService.getWishlist();
      set({ productIds: new Set(products.map((p) => p._id)), isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },
  toggle: async (productId) => {
    const wasSaved = get().productIds.has(productId);

    // Optimistic — flip immediately, revert if the request fails.
    set((state) => {
      const next = new Set(state.productIds);
      if (wasSaved) next.delete(productId);
      else next.add(productId);
      return { productIds: next };
    });

    try {
      if (wasSaved) {
        await wishlistService.removeFromWishlist(productId);
      } else {
        await wishlistService.addToWishlist(productId);
      }
    } catch (err) {
      set((state) => {
        const next = new Set(state.productIds);
        if (wasSaved) next.add(productId);
        else next.delete(productId);
        return { productIds: next };
      });
      throw err;
    }
  },
  clear: () => set({ productIds: new Set(), isLoaded: false }),
}));
