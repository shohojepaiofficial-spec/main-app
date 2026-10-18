"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as orderService from "@/services/orderService";
import { Order, OrderStatus } from "@/models";

// Manage Orders list: loading, selection and bulk status changes.
// Single-order actions live in useAdminOrderDetail.

export function useAdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const reload = () => {
    setIsLoading(true);
    return orderService
      .getAllOrders()
      .then((data) => setOrders(data))
      .catch(() => toast.error("Failed to load orders"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    let ignore = false;
    orderService
      .getAllOrders()
      .then((data) => {
        if (!ignore) setOrders(data);
      })
      .catch(() => {
        if (!ignore) toast.error("Failed to load orders");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (ids: string[]) => setSelectedIds(new Set(ids));
  const clearSelection = () => setSelectedIds(new Set());

  const bulkUpdateStatus = async (status: OrderStatus) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setIsBulkUpdating(true);
    try {
      const updated = await orderService.bulkUpdateOrderStatus(ids, status);
      const byId = new Map(updated.map((o) => [o._id, o]));
      setOrders((prev) => prev.map((o) => byId.get(o._id) ?? o));
      toast.success(`Updated ${ids.length} order${ids.length === 1 ? "" : "s"}`);
      clearSelection();
    } catch {
      toast.error("Failed to update selected orders");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  return { orders, isLoading, reload, selectedIds, toggleSelected, selectAll, clearSelection, isBulkUpdating, bulkUpdateStatus };
}
