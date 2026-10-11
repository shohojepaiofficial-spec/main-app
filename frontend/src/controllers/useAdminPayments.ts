"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as paymentService from "@/services/paymentService";
import { AnalyticsRangePreset, PaymentResolution, Reconciliation } from "@/models";

function errorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

// The payment reconciliation dashboard (WORK-11).
export function useAdminPayments() {
  const [range, setRangeState] = useState<AnalyticsRangePreset>("30d");
  const [data, setData] = useState<Reconciliation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    paymentService
      .getReconciliation(range)
      .then((result) => {
        if (!ignore) setData(result);
      })
      .catch(() => {
        if (!ignore) toast.error("Failed to load payments");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [range, reloadKey]);

  const setRange = (next: AnalyticsRangePreset) => {
    setIsLoading(true);
    setRangeState(next);
  };
  const reload = () => setReloadKey((k) => k + 1);

  const recheck = async (orderId: string) => {
    setBusyOrderId(orderId);
    try {
      const result = await paymentService.recheckPayment(orderId);
      const status = result.bkash.transactionStatus ?? "no status";
      if (result.outcome === "success") toast.success(`bKash says ${status}: order marked paid`);
      else if (result.outcome === "failed") toast.success(`bKash says ${status}: order cancelled, stock returned`);
      else toast(`bKash says ${status}. Still needs a decision.`, { icon: "ℹ️" });
      reload();
    } catch (err) {
      toast.error(errorMessage(err, "Re-check failed"));
    } finally {
      setBusyOrderId(null);
    }
  };

  // Returns whether it saved, so the view closes its form only then.
  const resolve = async (
    orderId: string,
    input: { outcome: PaymentResolution; note: string; transactionId?: string }
  ): Promise<boolean> => {
    setBusyOrderId(orderId);
    try {
      await paymentService.resolvePaymentReview(orderId, input);
      toast.success("Payment review closed");
      reload();
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "Failed to resolve"));
      return false;
    } finally {
      setBusyOrderId(null);
    }
  };

  return { range, setRange, data, isLoading, busyOrderId, recheck, resolve };
}
