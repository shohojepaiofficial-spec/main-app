import { Banknote, Smartphone, LucideIcon } from "lucide-react";
import { PaymentMethod } from "@/models";

export interface PaymentMethodInfo {
  id: PaymentMethod;
  label: string;
  description: string;
  Icon: LucideIcon;
  available: boolean;
}

// Both are wired up to something real — see server's orderController
// (liveOnlinePaymentMethods) and integrations/bkash.ts. This list doesn't
// know whether the server's BKASH_* env vars are actually set, though — if
// they're not, createOrder 400s on a "bkash" selection and CheckoutView
// surfaces that as a toast, same as any other checkout error.
export const PAYMENT_METHODS: PaymentMethodInfo[] = [
  {
    id: "cod",
    label: "Cash on Delivery",
    description: "Pay in cash when your order arrives",
    Icon: Banknote,
    available: true,
  },
  {
    id: "bkash",
    label: "bKash",
    description: "Pay instantly from your bKash wallet",
    Icon: Smartphone,
    available: true,
  },
];

interface PaymentMethodPickerProps {
  // Omit both for a purely informational, non-selectable listing (e.g. "here's
  // what's coming" on the Orders page) — every entry renders disabled with
  // nothing highlighted as selected.
  value?: PaymentMethod | null;
  onChange?: (method: PaymentMethod) => void;
  methods?: PaymentMethodInfo[];
}

export function PaymentMethodPicker({
  value = null,
  onChange,
  methods = PAYMENT_METHODS,
}: PaymentMethodPickerProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {methods.map(({ id, label, description, Icon, available }) => {
        const isSelected = value === id;
        const isDisabled = !available || !onChange;
        return (
          <button
            key={id}
            type="button"
            disabled={isDisabled}
            onClick={() => onChange?.(id)}
            aria-pressed={isSelected}
            className={`flex items-start gap-3 rounded-md border p-3 text-left transition-colors ${
              isSelected
                ? "border-primary bg-primary/5"
                : "border-border bg-background hover:border-primary/50"
            } ${isDisabled ? "cursor-not-allowed opacity-60 hover:border-border" : ""}`}
          >
            <Icon size={18} className={`mt-0.5 shrink-0 ${isSelected ? "text-primary" : "text-muted"}`} />
            <div>
              <p className="flex items-center gap-2 text-sm font-medium">
                {label}
                {!available && (
                  <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium uppercase text-muted ring-1 ring-border">
                    Coming soon
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted">{description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
