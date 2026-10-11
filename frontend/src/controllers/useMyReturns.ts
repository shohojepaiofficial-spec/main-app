"use client";

import { useEffect, useMemo, useState } from "react";
import * as returnService from "@/services/returnService";
import { MyReturns, ReturnEligibility, ReturnRequest } from "@/models";

// The signed-in customer's return/exchange requests, plus which delivered
// orders can still start one — used by My Orders.
export function useMyReturns() {
  const [data, setData] = useState<MyReturns | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    returnService
      .getMyReturns()
      .then((result) => {
        if (!ignore) setData(result);
      })
      .catch(() => {
        // My Orders still works without this; the button just doesn't show.
        if (!ignore) setData({ requests: [], eligibility: [], windowDays: 7 });
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const requestsByOrder = useMemo(() => {
    const map = new Map<string, ReturnRequest[]>();
    for (const request of data?.requests ?? []) {
      map.set(request.order, [...(map.get(request.order) ?? []), request]);
    }
    return map;
  }, [data]);

  const eligibilityByOrder = useMemo(
    () => new Map<string, ReturnEligibility>((data?.eligibility ?? []).map((e) => [e.orderId, e])),
    [data]
  );

  return {
    requestsByOrder,
    eligibilityByOrder,
    windowDays: data?.windowDays ?? 7,
    reload: () => setReloadKey((k) => k + 1),
  };
}
