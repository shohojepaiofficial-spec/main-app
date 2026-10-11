"use client";

import { useEffect, useState } from "react";
import * as productService from "@/services/productService";
import { StockMovement } from "@/models";

// Manage Products → stock history for one product (WORK-09). Mounted fresh
// per product (keyed by its id), so there is no state to reset here.
export function useStockHistory(productId: string) {
  const [items, setItems] = useState<StockMovement[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let ignore = false;
    productService
      .getStockHistory(productId, page)
      .then((result) => {
        if (ignore) return;
        setItems(result.items);
        setTotalPages(result.totalPages);
        setLoadFailed(false);
      })
      .catch(() => {
        if (!ignore) setLoadFailed(true);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [productId, page]);

  const goToPage = (next: number) => {
    setIsLoading(true);
    setPage(next);
  };

  return { items, page, totalPages, goToPage, isLoading, loadFailed };
}
