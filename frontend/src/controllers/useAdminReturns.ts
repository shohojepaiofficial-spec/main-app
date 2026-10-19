"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as returnService from "@/services/returnService";
import { AdminReturnRequest, ManualRefundMethod, ReturnPickupInput, ReturnStatus, ReturnStatusUpdate } from "@/models";

function errorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

export type ReturnTab = ReturnStatus | "all";

const EMPTY_COUNTS: Record<ReturnStatus, number> = { requested: 0, approved: 0, rejected: 0, received: 0, completed: 0 };

// The admin Returns page: every return/exchange request, defaulting to the
// new ones waiting for a decision.
export function useAdminReturns() {
  const [tab, setTabState] = useState<ReturnTab>("requested");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminReturnRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [bkashRefundsAvailable, setBkashRefundsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    returnService
      .getAllReturns({ status: tab === "all" ? undefined : tab, page })
      .then((data) => {
        if (ignore) return;
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setCounts(data.counts);
        setBkashRefundsAvailable(data.bkashRefundsAvailable);
      })
      .catch(() => {
        if (!ignore) toast.error("Failed to load returns");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [tab, page, reloadKey]);

  const setTab = (next: ReturnTab) => {
    setIsLoading(true);
    setTabState(next);
    setPage(1);
  };
  const goToPage = (next: number) => {
    setIsLoading(true);
    setPage(next);
  };
  // A change moves the request to another tab, so the list and the counts
  // both need a fresh read.
  const reload = () => setReloadKey((k) => k + 1);

  // Each returns whether it saved, so the view closes its form only then.
  const updateStatus = async (id: string, update: ReturnStatusUpdate): Promise<boolean> => {
    try {
      const result = await returnService.updateReturnStatus(id, update);
      if (result.skippedRestock > 0) {
        toast(`${result.skippedRestock} line(s) weren't restocked: that variant no longer exists.`, { icon: "⚠️" });
      }
      toast.success("Return updated");
      reload();
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "Failed to update the return"));
      return false;
    }
  };

  const recordRefund = async (
    id: string,
    input: { amount: number; method: ManualRefundMethod; reference?: string; note?: string }
  ): Promise<boolean> => {
    try {
      await returnService.recordRefund(id, input);
      toast.success("Refund recorded");
      reload();
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "Failed to record the refund"));
      return false;
    }
  };

  const refundWithBkash = async (id: string, input: { amount: number; reason?: string }): Promise<boolean> => {
    try {
      await returnService.refundWithBkash(id, input);
      toast.success("Refunded through bKash");
      reload();
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "bKash refund failed"));
      // An unanswered call leaves the request marked "in progress".
      reload();
      return false;
    }
  };

  const setPickup = async (id: string, input: ReturnPickupInput): Promise<boolean> => {
    try {
      await returnService.setReturnPickup(id, input);
      toast.success("Pickup saved");
      reload();
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "Failed to save the pickup"));
      return false;
    }
  };

  const refreshPickup = async (id: string): Promise<void> => {
    try {
      await returnService.refreshReturnPickup(id);
      toast.success("Pickup status updated");
      reload();
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't reach Pathao"));
    }
  };

  return {
    items, total, page, totalPages, counts, bkashRefundsAvailable, isLoading, tab,
    setTab, goToPage, updateStatus, recordRefund, refundWithBkash, setPickup, refreshPickup,
  };
}
