"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as orderService from "@/services/orderService";
import { Order, OrderStatus } from "@/models";

export function useAdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [noteSavingId, setNoteSavingId] = useState<string | null>(null);
  const [courierSavingId, setCourierSavingId] = useState<string | null>(null);
  const [pathaoBookingId, setPathaoBookingId] = useState<string | null>(null);
  const [pathaoRefreshingId, setPathaoRefreshingId] = useState<string | null>(null);

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

  const applyUpdate = (updated: Order) => {
    setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
  };

  const updateStatus = async (id: string, status: OrderStatus) => {
    setUpdatingId(id);
    try {
      const updated = await orderService.updateOrderStatus(id, status);
      applyUpdate(updated);
      toast.success("Order status updated");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

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

  const saveNote = async (id: string, note: string) => {
    setNoteSavingId(id);
    try {
      const updated = await orderService.updateOrderNote(id, note);
      applyUpdate(updated);
      toast.success("Note saved");
    } catch {
      toast.error("Failed to save note");
    } finally {
      setNoteSavingId(null);
    }
  };

  const saveCourierInfo = async (id: string, input: orderService.CourierInfoInput) => {
    setCourierSavingId(id);
    try {
      const updated = await orderService.updateCourierInfo(id, input);
      applyUpdate(updated);
      toast.success("Courier info saved");
    } catch {
      toast.error("Failed to save courier info");
    } finally {
      setCourierSavingId(null);
    }
  };

  const bookWithPathao = async (id: string, input: orderService.BookPathaoOrderInput) => {
    setPathaoBookingId(id);
    try {
      const updated = await orderService.bookPathaoOrder(id, input);
      applyUpdate(updated);
      toast.success("Booked with Pathao");
      return true;
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to book with Pathao"
      );
      return false;
    } finally {
      setPathaoBookingId(null);
    }
  };

  const refreshPathaoStatus = async (id: string) => {
    setPathaoRefreshingId(id);
    try {
      const updated = await orderService.refreshPathaoStatus(id);
      applyUpdate(updated);
      toast.success("Tracking status refreshed");
    } catch {
      toast.error("Failed to refresh tracking status");
    } finally {
      setPathaoRefreshingId(null);
    }
  };

  return {
    orders,
    isLoading,
    updatingId,
    updateStatus,
    reload,
    selectedIds,
    toggleSelected,
    selectAll,
    clearSelection,
    isBulkUpdating,
    bulkUpdateStatus,
    noteSavingId,
    saveNote,
    courierSavingId,
    saveCourierInfo,
    pathaoBookingId,
    bookWithPathao,
    pathaoRefreshingId,
    refreshPathaoStatus,
  };
}
