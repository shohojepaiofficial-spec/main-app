"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as orderService from "@/services/orderService";
import { Order } from "@/models";

export function useMyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = () => {
    setIsLoading(true);
    return orderService
      .getMyOrders()
      .then((data) => setOrders(data))
      .catch(() => toast.error("Failed to load your orders"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    let ignore = false;
    orderService
      .getMyOrders()
      .then((data) => {
        if (!ignore) setOrders(data);
      })
      .catch(() => {
        if (!ignore) toast.error("Failed to load your orders");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return { orders, isLoading, reload };
}
