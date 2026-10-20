"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as orderService from "@/services/orderService";
import { confirmDialog } from "@/lib/confirm";
import { useTranslations } from "@/controllers/useTranslations";
import { Order } from "@/models";

const errorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

// One of the signed-in customer's own orders, for /orders/[id]. The API
// returns 404 for anyone else's order, same as a missing one.
export function useMyOrder(orderId: string) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const { t } = useTranslations();

  useEffect(() => {
    let ignore = false;
    orderService
      .getOrderById(orderId)
      .then((data) => {
        if (ignore) return;
        if (!data) setNotFound(true);
        setOrder(data);
      })
      .catch(() => {
        if (!ignore) setNotFound(true);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [orderId]);

  const cancel = async () => {
    const confirmed = await confirmDialog(t("orders.confirmCancel", "Cancel this order? This can't be undone."), {
      title: t("orders.cancelOrder", "Cancel order"),
      confirmLabel: t("orders.cancelOrder", "Cancel order"),
      danger: true,
    });
    if (!confirmed) return;
    setIsCancelling(true);
    try {
      setOrder(await orderService.cancelOrder(orderId));
      toast.success(t("orders.orderCancelled", "Order cancelled"));
    } catch (err) {
      toast.error(errorMessage(err, t("orders.failedToCancel", "Failed to cancel order")));
    } finally {
      setIsCancelling(false);
    }
  };

  return { order, isLoading, notFound, isCancelling, cancel };
}
