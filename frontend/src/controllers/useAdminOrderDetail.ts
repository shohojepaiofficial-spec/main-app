"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as orderService from "@/services/orderService";
import { CustomerHistory, Order, OrderStatus } from "@/models";

const errorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

// One order for the staff detail page (/admin/orders/[id]): the order, the
// customer's history with us, and every action staff take on it. Waits for
// `enabled` (the permission check) before fetching.
export function useAdminOrderDetail(orderId: string, enabled: boolean) {
  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<CustomerHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isSavingCourier, setIsSavingCourier] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let ignore = false;
    Promise.all([orderService.getOrderById(orderId), orderService.getCustomerHistory(orderId).catch(() => null)])
      .then(([data, customerHistory]) => {
        if (ignore) return;
        if (!data) setNotFound(true);
        setOrder(data);
        setHistory(customerHistory);
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
  }, [orderId, enabled]);

  // Status changes move the customer's counts too, so reload the history.
  const refreshHistory = () => orderService.getCustomerHistory(orderId).then(setHistory).catch(() => {});

  const updateStatus = async (status: OrderStatus) => {
    setIsUpdatingStatus(true);
    try {
      setOrder(await orderService.updateOrderStatus(orderId, status));
      refreshHistory();
      toast.success("Order status updated");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to update status"));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const saveNote = async (note: string) => {
    setIsSavingNote(true);
    try {
      setOrder(await orderService.updateOrderNote(orderId, note));
      toast.success("Note saved");
    } catch {
      toast.error("Failed to save note");
    } finally {
      setIsSavingNote(false);
    }
  };

  // "saved", "failed" (message already shown), or a phone mismatch the
  // form asks about before saving anyway with confirmMismatch.
  const saveCourierInfo = async (
    input: orderService.CourierInfoInput
  ): Promise<{ result: "saved" | "failed" } | { result: "mismatch"; message: string }> => {
    setIsSavingCourier(true);
    try {
      const updated = await orderService.updateCourierInfo(orderId, input);
      setOrder(updated);
      toast.success(
        updated.courierProvider === "pathao" && updated.courierConsignmentId && !updated.courierVerifiedAt
          ? "Saved — Pathao couldn't be reached to check the number, check it later"
          : "Courier info saved"
      );
      return { result: "saved" };
    } catch (err) {
      const data = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data;
      if (data?.code === "COURIER_PHONE_MISMATCH") return { result: "mismatch", message: data.message ?? "" };
      toast.error(errorMessage(err, "Failed to save courier info"));
      return { result: "failed" };
    } finally {
      setIsSavingCourier(false);
    }
  };

  const markBookedOnPathaoSite = async () => {
    setIsSavingCourier(true);
    try {
      setOrder(await orderService.markBookedOnPathaoSite(orderId));
      toast.success("Marked as booked — the number fills in when Pathao confirms");
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't save that"));
      return false;
    } finally {
      setIsSavingCourier(false);
    }
  };

  const verifyConsignment = async () => {
    setIsRefreshing(true);
    try {
      setOrder(await orderService.verifyCourierConsignment(orderId));
      toast.success("Checked with Pathao — the number is right");
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't check the number"));
    } finally {
      setIsRefreshing(false);
    }
  };

  const bookWithPathao = async (input: orderService.BookPathaoOrderInput) => {
    setIsBooking(true);
    try {
      setOrder(await orderService.bookPathaoOrder(orderId, input));
      toast.success("Booked with Pathao");
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "Failed to book with Pathao"));
      return false;
    } finally {
      setIsBooking(false);
    }
  };

  const refreshPathaoStatus = async () => {
    setIsRefreshing(true);
    try {
      setOrder(await orderService.refreshPathaoStatus(orderId));
      toast.success("Tracking status refreshed");
    } catch {
      toast.error("Failed to refresh tracking status");
    } finally {
      setIsRefreshing(false);
    }
  };

  const removeCourierBooking = async () => {
    setIsSavingCourier(true);
    try {
      setOrder(await orderService.removeCourierBooking(orderId));
      toast.success("Booking removed — you can book again");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to remove the booking"));
    } finally {
      setIsSavingCourier(false);
    }
  };

  return {
    removeCourierBooking,
    order, history, isLoading, notFound,
    isUpdatingStatus, updateStatus,
    isSavingNote, saveNote,
    isSavingCourier, saveCourierInfo, markBookedOnPathaoSite, verifyConsignment,
    isBooking, bookWithPathao,
    isRefreshing, refreshPathaoStatus,
  };
}
