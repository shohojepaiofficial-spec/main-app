import { api } from "@/lib/api";
import { AppliedPromo, DiscountType, PromoCode, PromoScope } from "@/models";

export const getPromoCodes = async (): Promise<PromoCode[]> => {
  const { data } = await api.get<PromoCode[]>("/promo-codes");
  return data;
};

// Public — backs on-site promo discovery (the sitewide announcement strip
// and per-product badges). Fails soft (empty array) so a backend hiccup
// doesn't take a page down over something purely decorative.
export const getActivePromoCodes = async (): Promise<AppliedPromo[]> => {
  try {
    const { data } = await api.get<AppliedPromo[]>("/promo-codes/active");
    return data;
  } catch {
    return [];
  }
};

export interface PromoCodeInput {
  code: string;
  discountType: DiscountType;
  value: number;
  scope: PromoScope;
  productId?: string;
  isActive: boolean;
  expiresAt?: string | null;
}

export const createPromoCode = async (input: PromoCodeInput): Promise<PromoCode> => {
  const { data } = await api.post<PromoCode>("/promo-codes", input);
  return data;
};

export const updatePromoCode = async (id: string, input: PromoCodeInput): Promise<PromoCode> => {
  const { data } = await api.put<PromoCode>(`/promo-codes/${id}`, input);
  return data;
};

export const deletePromoCode = async (id: string): Promise<void> => {
  await api.delete(`/promo-codes/${id}`);
};

// Public — no auth required, works for guests. `productId` is only passed
// when validating against one specific product's page; omitted when applying
// from the cart's generic promo box (see server's validatePromoCode).
export const validatePromoCode = async (
  code: string,
  productId?: string
): Promise<AppliedPromo> => {
  const { data } = await api.post<AppliedPromo>("/promo-codes/validate", { code, productId });
  return data;
};
