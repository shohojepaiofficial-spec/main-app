"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as productService from "@/services/productService";
import { DeliveryType, StockStatus } from "@/services/productService";
import { Product } from "@/models";

export interface ProductFilters {
  search?: string;
  category?: string;
  stockStatus?: StockStatus;
  deliveryType?: DeliveryType;
  dateFrom?: string;
  dateTo?: string;
}

// Empty-string values are how the filter bar's <select>/<input>s represent
// "no filter" — dropped here rather than sent as `category=`, etc., since
// the backend only ever checks a query param's presence.
function cleanFilters(filters: ProductFilters): ProductFilters {
  const cleaned: ProductFilters = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value) cleaned[key as keyof ProductFilters] = value as never;
  }
  return cleaned;
}

export function useAdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filters, setFiltersState] = useState<ProductFilters>({});
  const [page, setPageState] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback((targetPage: number, targetFilters: ProductFilters) => {
    setIsLoading(true);
    return productService
      .getProducts({ page: targetPage, ...cleanFilters(targetFilters) })
      .then((data) => {
        setProducts(data.items);
        setTotalPages(data.totalPages);
        setPageState(data.page);
      })
      .catch(() => {
        toast.error("Failed to load products");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Re-fetches the live set of in-use categories from the server — called
  // after add/edit/delete so a brand-new category (or the last product in
  // one) shows up in the filter dropdown without needing a page reload.
  const loadCategories = useCallback(() => {
    return productService
      .getProductCategories()
      .then((data) => setCategories(data.map((c) => c.category)))
      .catch(() => {});
  }, []);

  // Mount-only fetch, deliberately not routed through `load` — `isLoading`
  // already starts `true`, and calling `load` (which sets it synchronously)
  // directly in the effect body trips `react-hooks/set-state-in-effect`
  // (see docs/PROGRESS.md's "Manage Products" entry for the same fix
  // applied the first time this rule was hit). `load` itself is only for
  // interactive re-fetches (filters/pagination/upsert/remove) below.
  useEffect(() => {
    let ignore = false;
    productService
      .getProducts({ page: 1 })
      .then((data) => {
        if (ignore) return;
        setProducts(data.items);
        setTotalPages(data.totalPages);
        setPageState(data.page);
      })
      .catch(() => {
        if (!ignore) toast.error("Failed to load products");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    productService
      .getProductCategories()
      .then((data) => {
        if (!ignore) setCategories(data.map((c) => c.category));
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  const setPage = (targetPage: number) => load(targetPage, filters);

  // Any filter change resets to page 1 — the previous page number is
  // meaningless against a differently-sized result set.
  const setFilters = (next: ProductFilters) => {
    setFiltersState(next);
    load(1, next);
  };

  const upsert = () => {
    // Re-fetch the current page rather than patch it in place — a create
    // can push the last item on the page onto a new one, and either way the
    // server's sort/pagination/filters stay the source of truth.
    load(page, filters);
    loadCategories();
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    try {
      await productService.deleteProduct(id);
      toast.success("Product deleted");
      await load(page, filters);
      await loadCategories();
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setDeletingId(null);
    }
  };

  return {
    products,
    categories,
    filters,
    setFilters,
    page,
    totalPages,
    setPage,
    isLoading,
    deletingId,
    remove,
    upsert,
  };
}
