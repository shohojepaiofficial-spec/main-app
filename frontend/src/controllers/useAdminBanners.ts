"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as bannerService from "@/services/bannerService";
import * as promoService from "@/services/promoService";
import { ManagedBanner, PromoCode } from "@/models";

export function useAdminBanners() {
  const [banners, setBanners] = useState<ManagedBanner[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    bannerService
      .getAllBanners()
      .then((data) => {
        if (!ignore) setBanners(data);
      })
      .catch(() => {
        if (!ignore) toast.error("Failed to load banners");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    // Lets the banner form link a promo code — fails soft (no options in
    // the picker, banner editing still works) for a coadmin who has
    // banners:manage but not promotions:manage.
    promoService
      .getPromoCodes()
      .then((data) => {
        if (!ignore) setPromoCodes(data);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  const upsert = (banner: ManagedBanner) => {
    setBanners((prev) => {
      const exists = prev.some((b) => b.id === banner.id);
      const next = exists ? prev.map((b) => (b.id === banner.id ? banner : b)) : [...prev, banner];
      return next.sort((a, b) => a.order - b.order);
    });
  };

  const remove = async (id: string) => {
    setPendingId(id);
    try {
      await bannerService.deleteBanner(id);
      setBanners((prev) => prev.filter((b) => b.id !== id));
      toast.success("Banner deleted");
    } catch {
      toast.error("Failed to delete banner");
    } finally {
      setPendingId(null);
    }
  };

  const move = async (id: string, direction: "up" | "down") => {
    setPendingId(id);
    try {
      const updated = await bannerService.moveBanner(id, direction);
      setBanners(updated);
    } catch {
      toast.error("Failed to reorder banners");
    } finally {
      setPendingId(null);
    }
  };

  return { banners, promoCodes, isLoading, pendingId, upsert, remove, move };
}
