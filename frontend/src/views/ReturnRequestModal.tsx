"use client";

import { Modal } from "@/components/ui/Modal";
import { useReturnRequestForm } from "@/controllers/useReturnRequestForm";
import { useTranslations } from "@/controllers/useTranslations";
import { formatCurrency } from "@/lib/currency";
import { RETURN_REASON_LABELS } from "@/lib/returns";
import { Order, RETURN_REASONS, ReturnType } from "@/models";

interface ReturnRequestModalProps {
  order: Order | null;
  // Units still returnable per order line (same index as order.items).
  remaining: number[];
  // Staff logging a phone/WhatsApp request from Manage Orders.
  asStaff?: boolean;
  windowDays?: number;
  onClose: () => void;
  onSubmitted: () => void;
}

export function ReturnRequestModal({ order, remaining, asStaff, windowDays, onClose, onSubmitted }: ReturnRequestModalProps) {
  const { t } = useTranslations();
  return (
    <Modal
      isOpen={order !== null}
      onClose={onClose}
      title={asStaff ? "Log a return or exchange" : t("returns.requestTitle", "Return or exchange")}
      widthClassName="max-w-md"
    >
      {order && (
        // Fresh form state per order (see ARCHITECTURE.md: prefer key= over reset effects).
        <ReturnRequestForm
          key={order._id}
          order={order}
          remaining={remaining}
          asStaff={asStaff}
          windowDays={windowDays}
          onSubmitted={onSubmitted}
        />
      )}
    </Modal>
  );
}

function ReturnRequestForm({
  order,
  remaining,
  asStaff,
  windowDays,
  onSubmitted,
}: Omit<ReturnRequestModalProps, "order" | "onClose"> & { order: Order }) {
  const { t } = useTranslations();
  const { form, error, isSubmitting, update, setType, setQuantity, submit } = useReturnRequestForm({
    orderId: order._id,
    remaining,
    asStaff,
    onSubmitted,
  });

  const TYPES: { value: ReturnType; label: string; hint: string }[] = [
    { value: "return", label: t("returns.typeReturn", "Return for a refund"), hint: t("returns.typeReturnHint", "Send it back and get your money back.") },
    { value: "exchange", label: t("returns.typeExchange", "Exchange"), hint: t("returns.typeExchangeHint", "Swap it for another size, colour or item.") },
  ];

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit(asStaff ? "Request logged" : t("returns.sent", "Request sent. We'll get back to you soon."));
      }}
    >
      {!asStaff && windowDays && (
        <p className="text-sm text-muted">
          {t("returns.intro", "Unused items in their original packaging can be returned or exchanged within {days} days of delivery.", { days: windowDays })}
        </p>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("returns.whatToDo", "What would you like to do?")}</legend>
        <div className="flex flex-col gap-2">
          {TYPES.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer gap-3 rounded-md border p-3 text-sm ${
                form.type === option.value ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <input
                type="radio"
                name="type"
                value={option.value}
                checked={form.type === option.value}
                onChange={() => setType(option.value)}
                className="mt-0.5"
              />
              <span>
                <span className="block font-medium">{option.label}</span>
                <span className="block text-xs text-muted">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("returns.whichItems", "Which items?")}</legend>
        <div className="flex flex-col gap-2">
          {order.items.map((item, index) => {
            const max = remaining[index] ?? 0;
            const name = item.product?.name ?? t("orders.productNoLongerAvailable", "Product no longer available");
            return (
              <div key={index} className={`flex items-center gap-3 text-sm ${max === 0 ? "opacity-50" : ""}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{name}</p>
                  <p className="text-xs text-muted">
                    {[item.variantLabel, formatCurrency(item.price)].filter(Boolean).join(" · ")}
                    {max === 0 && ` · ${t("returns.alreadyRequested", "already requested")}`}
                  </p>
                </div>
                <label className="sr-only" htmlFor={`return-qty-${index}`}>
                  {t("returns.quantityFor", "How many {name}", { name })}
                </label>
                <select
                  id={`return-qty-${index}`}
                  value={form.quantities[index] ?? 0}
                  onChange={(e) => setQuantity(index, Number(e.target.value))}
                  disabled={max === 0}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
                >
                  {Array.from({ length: max + 1 }, (_, n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="return-reason" className="mb-1 block text-sm font-medium">{t("returns.reason", "Reason")}</label>
        <select
          id="return-reason"
          value={form.reason}
          onChange={(e) => update({ reason: e.target.value as typeof form.reason })}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">{t("returns.chooseReason", "Choose a reason")}</option>
          {RETURN_REASONS.map((reason) => (
            <option key={reason} value={reason}>{t(`returns.reason.${reason}`, RETURN_REASON_LABELS[reason])}</option>
          ))}
        </select>
      </div>

      {form.type === "exchange" && (
        <div>
          <label htmlFor="return-exchange-for" className="mb-1 block text-sm font-medium">
            {t("returns.exchangeFor", "What would you like instead?")}
          </label>
          <input
            id="return-exchange-for"
            value={form.exchangeFor}
            onChange={(e) => update({ exchangeFor: e.target.value })}
            maxLength={200}
            placeholder={t("returns.exchangeForPlaceholder", "e.g. Size L, or the blue one")}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
          />
        </div>
      )}

      <div>
        <label htmlFor="return-details" className="mb-1 block text-sm font-medium">
          {t("returns.details", "Anything else we should know? (optional)")}
        </label>
        <textarea
          id="return-details"
          value={form.details}
          onChange={(e) => update({ details: e.target.value })}
          maxLength={2000}
          rows={3}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {isSubmitting ? t("returns.sending", "Sending...") : asStaff ? "Log request" : t("returns.send", "Send request")}
      </button>
    </form>
  );
}
