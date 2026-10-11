import { api } from "@/lib/api";
import { AnalyticsRangePreset, PaymentResolution, Reconciliation, ReconciliationOrder, RecheckResult } from "@/models";

// Payment reconciliation (WORK-11) — server's routes/paymentRoutes.ts,
// "orders:manage".

export const getReconciliation = async (range: AnalyticsRangePreset): Promise<Reconciliation> => {
  const { data } = await api.get<Reconciliation>("/payments/reconciliation", { params: { range } });
  return data;
};

export const recheckPayment = async (orderId: string): Promise<RecheckResult> => {
  const { data } = await api.post<RecheckResult>(`/payments/${orderId}/recheck`, {});
  return data;
};

export const resolvePaymentReview = async (
  orderId: string,
  input: { outcome: PaymentResolution; note: string; transactionId?: string }
): Promise<ReconciliationOrder> => {
  const { data } = await api.post<ReconciliationOrder>(`/payments/${orderId}/resolve`, input);
  return data;
};
