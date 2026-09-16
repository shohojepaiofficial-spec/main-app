"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as productService from "@/services/productService";
import { Product } from "@/models";

export function useAdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback((targetPage: number) => {
    setIsLoading(true);
    return productService
      .getProducts({ page: targetPage })
      .then((data) => {
        setProducts(data.items);
        setTotalPages(data.totalPages);
        setPage(data.page);
      })
      .catch(() => {
        toast.error("Failed to load products");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    let ignore = false;
    productService
      .getProducts({ page: 1 })
      .then((data) => {
        if (ignore) return;
        setProducts(data.items);
        setTotalPages(data.totalPages);
        setPage(data.page);
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

  const upsert = () => {
    // Re-fetch the current page rather than patch it in place — a create
    // can push the last item on the page onto a new one, and either way the
    // server's sort/pagination stays the source of truth.
    load(page);
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    try {
      await productService.deleteProduct(id);
      toast.success("Product deleted");
      await load(page);
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setDeletingId(null);
    }
  };

  return {
    products,
    categories,
    page,
    totalPages,
    setPage: load,
    isLoading,
    deletingId,
    remove,
    upsert,
  };
}
