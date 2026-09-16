"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as orderService from "@/services/orderService";
import { Order, OrderStatus } from "@/models";

export function useAdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  const updateStatus = async (id: string, status: OrderStatus) => {
    setUpdatingId(id);
    try {
      const updated = await orderService.updateOrderStatus(id, status);
      setOrders((prev) => prev.map((o) => (o._id === id ? updated : o)));
      toast.success("Order status updated");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  return { orders, isLoading, updatingId, updateStatus, reload };
}
