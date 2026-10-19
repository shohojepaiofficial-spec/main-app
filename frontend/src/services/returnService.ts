import { api } from "@/lib/api";
import {
  AdminReturnList, AdminReturnRequest, ManualRefundMethod, MyReturns, ReturnRequest,
  ReturnPickupInput, ReturnRequestInput, ReturnStatus, ReturnStatusUpdate, ReturnType,
} from "@/models";

// Returns, exchanges & refunds (WORK-08) — server's routes/returnRoutes.ts.

export const getMyReturns = async (): Promise<MyReturns> => {
  const { data } = await api.get<MyReturns>("/returns/my");
  return data;
};

export const createReturnRequest = async (input: ReturnRequestInput): Promise<ReturnRequest> => {
  const { data } = await api.post<ReturnRequest>("/returns", input);
  return data;
};

// --- Staff ("orders:manage") ----------------------------------------------

export interface GetAllReturnsParams {
  status?: ReturnStatus;
  type?: ReturnType;
  page: number;
}

export const getAllReturns = async (params: GetAllReturnsParams): Promise<AdminReturnList> => {
  const { data } = await api.get<AdminReturnList>("/returns", { params });
  return data;
};

// Logs a request taken over the phone/WhatsApp (no 7-day limit for staff).
export const adminCreateReturnRequest = async (input: ReturnRequestInput): Promise<ReturnRequest> => {
  const { data } = await api.post<ReturnRequest>("/returns/admin", input);
  return data;
};

export const updateReturnStatus = async (
  id: string,
  update: ReturnStatusUpdate
): Promise<AdminReturnRequest & { skippedRestock: number }> => {
  const { data } = await api.patch<AdminReturnRequest & { skippedRestock: number }>(`/returns/${id}/status`, update);
  return data;
};

export const recordRefund = async (
  id: string,
  input: { amount: number; method: ManualRefundMethod; reference?: string; note?: string }
): Promise<AdminReturnRequest> => {
  const { data } = await api.post<AdminReturnRequest>(`/returns/${id}/refund`, input);
  return data;
};

export const refundWithBkash = async (id: string, input: { amount: number; reason?: string }): Promise<AdminReturnRequest> => {
  const { data } = await api.post<AdminReturnRequest>(`/returns/${id}/refund/bkash`, input);
  return data;
};

// The rider pickup staff booked in Pathao's merchant panel.
export const setReturnPickup = async (id: string, input: ReturnPickupInput): Promise<AdminReturnRequest> => {
  const { data } = await api.put<AdminReturnRequest>(`/returns/${id}/pickup`, input);
  return data;
};

export const refreshReturnPickup = async (id: string): Promise<AdminReturnRequest> => {
  const { data } = await api.post<AdminReturnRequest>(`/returns/${id}/pickup/refresh`, {});
  return data;
};
