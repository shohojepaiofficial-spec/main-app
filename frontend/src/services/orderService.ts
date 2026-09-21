import { api } from "@/lib/api";
import {
  Order,
  OrderStats,
  OrderStatus,
  PathaoLocation,
  PaymentMethod,
  ProductSummary,
  ShippingDetails,
} from "@/models";

export const getMyOrders = async (): Promise<Order[]> => {
  const { data } = await api.get<Order[]>("/orders/my");
  return data;
};

export interface CreateOrderInput {
  items: { productId: string; quantity: number }[];
  shippingAddress: ShippingDetails;
  promoCode?: string;
  sharedCartId?: string;
  paymentMethod?: PaymentMethod;
}

// The server is the only source of truth for prices/delivery fees/discount —
// this just sends productId + quantity + where to ship it.
export const createOrder = async (input: CreateOrderInput): Promise<Order> => {
  const { data } = await api.post<Order>("/orders", input);
  return data;
};

// Delivered orders' products the current user hasn't reviewed yet.
export const getReviewableProducts = async (): Promise<ProductSummary[]> => {
  const { data } = await api.get<ProductSummary[]>("/orders/reviewable");
  return data;
};

// Self-service cancellation — only works while the order is still "pending".
export const cancelOrder = async (id: string): Promise<Order> => {
  const { data } = await api.patch<Order>(`/orders/${id}/cancel`);
  return data;
};

// Admin ("orders:manage") only, from here down.

export const getOrderStats = async (): Promise<OrderStats> => {
  const { data } = await api.get<OrderStats>("/orders/stats");
  return data;
};

export const getAllOrders = async (): Promise<Order[]> => {
  const { data } = await api.get<Order[]>("/orders");
  return data;
};

export const getOrderById = async (id: string): Promise<Order | null> => {
  try {
    const { data } = await api.get<Order>(`/orders/${id}`);
    return data;
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
    throw err;
  }
};

export const updateOrderStatus = async (id: string, status: OrderStatus): Promise<Order> => {
  const { data } = await api.patch<Order>(`/orders/${id}/status`, { status });
  return data;
};

// A phone/walk-in order the admin enters on the customer's behalf — not
// restricted to Cash on Delivery, since the admin may be recording a
// payment that already happened outside the site.
export interface AdminCreateOrderInput {
  items: { productId: string; quantity: number }[];
  shippingAddress: ShippingDetails;
  promoCode?: string;
  paymentMethod: PaymentMethod;
}

export const adminCreateOrder = async (input: AdminCreateOrderInput): Promise<Order> => {
  const { data } = await api.post<Order>("/orders/admin", input);
  return data;
};

export const bulkUpdateOrderStatus = async (ids: string[], status: OrderStatus): Promise<Order[]> => {
  const { data } = await api.patch<Order[]>("/orders/bulk/status", { ids, status });
  return data;
};

export const updateOrderNote = async (id: string, note: string): Promise<Order> => {
  const { data } = await api.patch<Order>(`/orders/${id}/note`, { note });
  return data;
};

export interface CourierInfoInput {
  consignmentId?: string;
  trackingStatus?: string;
  note?: string;
}

// Manual courier entry — works with or without Pathao actually connected.
export const updateCourierInfo = async (id: string, input: CourierInfoInput): Promise<Order> => {
  const { data } = await api.patch<Order>(`/orders/${id}/courier`, input);
  return data;
};

export const getPathaoCities = async (): Promise<PathaoLocation[]> => {
  const { data } = await api.get<PathaoLocation[]>("/orders/pathao/cities");
  return data;
};

export const getPathaoZones = async (cityId: number): Promise<PathaoLocation[]> => {
  const { data } = await api.get<PathaoLocation[]>(`/orders/pathao/cities/${cityId}/zones`);
  return data;
};

export const getPathaoAreas = async (zoneId: number): Promise<PathaoLocation[]> => {
  const { data } = await api.get<PathaoLocation[]>(`/orders/pathao/zones/${zoneId}/areas`);
  return data;
};

export interface BookPathaoOrderInput {
  cityId: number;
  zoneId: number;
  areaId?: number;
  weightKg: number;
  description?: string;
  specialInstruction?: string;
}

export const bookPathaoOrder = async (id: string, input: BookPathaoOrderInput): Promise<Order> => {
  const { data } = await api.post<Order>(`/orders/${id}/pathao`, input);
  return data;
};

export const refreshPathaoStatus = async (id: string): Promise<Order> => {
  const { data } = await api.post<Order>(`/orders/${id}/pathao/refresh`);
  return data;
};
