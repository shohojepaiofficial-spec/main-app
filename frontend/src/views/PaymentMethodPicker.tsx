import { Banknote, Smartphone, CreditCard, LucideIcon } from "lucide-react";
import { PaymentMethod } from "@/models";

export interface PaymentMethodInfo {
  id: PaymentMethod;
  label: string;
  description: string;
  Icon: LucideIcon;
  available: boolean;
}

// Only "cod" is wired up to anything real. The rest are shown, disabled, so
// customers can see what's coming and the layout doesn't need to change
// again once a gateway is actually integrated — see server's orderController
// (LIVE_PAYMENT_METHODS) for the matching server-side check.
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
    available: false,
  },
  {
    id: "nagad",
    label: "Nagad",
    description: "Pay instantly from your Nagad wallet",
    Icon: Smartphone,
    available: false,
  },
  {
    id: "card",
    label: "Debit / Credit Card",
    description: "Visa, Mastercard and more",
    Icon: CreditCard,
    available: false,
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
