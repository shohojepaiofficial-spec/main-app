"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as promoService from "@/services/promoService";
import * as productService from "@/services/productService";
import { PromoCode, Product } from "@/models";

export function useAdminPromoCodes() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    Promise.all([promoService.getPromoCodes(), productService.getProducts({ limit: 48 })])
      .then(([promos, productPage]) => {
        if (ignore) return;
        setPromoCodes(promos);
        setProducts(productPage.items);
      })
      .catch(() => {
        if (!ignore) toast.error("Failed to load promo codes");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const upsert = (promo: PromoCode) => {
    setPromoCodes((prev) => {
      const exists = prev.some((p) => p.id === promo.id);
      return exists ? prev.map((p) => (p.id === promo.id ? promo : p)) : [promo, ...prev];
    });
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    try {
      await promoService.deletePromoCode(id);
      setPromoCodes((prev) => prev.filter((p) => p.id !== id));
      toast.success("Promo code deleted");
    } catch {
      toast.error("Failed to delete promo code");
    } finally {
      setDeletingId(null);
    }
  };

  return { promoCodes, products, isLoading, deletingId, upsert, remove };
}
