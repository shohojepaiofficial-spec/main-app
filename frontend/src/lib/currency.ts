// Bangladeshi Taka — this store operates in Bangladesh (see docs/PROGRESS.md).
export const CURRENCY_SYMBOL = "৳";
export const CURRENCY_CODE = "BDT";

export const formatCurrency = (amount: number) => `${CURRENCY_SYMBOL}${amount.toFixed(2)}`;
