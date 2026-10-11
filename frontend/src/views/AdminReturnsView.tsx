"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useRequirePermission } from "@/controllers/useRequirePermission";
import { useAdminReturns, type ReturnTab } from "@/controllers/useAdminReturns";
import { Pagination } from "@/views/Pagination";
import { formatCurrency } from "@/lib/currency";
import { REFUND_METHOD_LABELS, RETURN_REASON_LABELS, RETURN_STATUS_LABELS, suggestedRefund } from "@/lib/returns";
import { AdminReturnRequest, ManualRefundMethod, RefundMethod, ReturnStatus, ReturnStatusUpdate } from "@/models";

const TABS: { value: ReturnTab; label: string }[] = [
  { value: "requested", label: "New" },
  { value: "approved", label: "Approved" },
  { value: "received", label: "Received" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const REFUND_METHODS: RefundMethod[] = ["bkash", "bkash_personal", "nagad_personal", "cash", "bank", "other"];

type Action = "approved" | "rejected" | "received" | "completed" | "refund";

const inputClass = "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm";
const shortId = (id: string) => id.slice(-6).toUpperCase();

interface CardHandlers {
  bkashRefundsAvailable: boolean;
  onStatus: (update: ReturnStatusUpdate) => Promise<boolean>;
  onRefund: (input: { amount: number; method: ManualRefundMethod; reference?: string; note?: string }) => Promise<boolean>;
  onBkashRefund: (input: { amount: number; reason?: string }) => Promise<boolean>;
}

// Which buttons each status offers.
function actionsFor(request: AdminReturnRequest): { action: Action; label: string; danger?: boolean }[] {
  const canRefund = request.type === "return" && !request.refund;
  switch (request.status) {
    case "requested":
      return [{ action: "approved", label: "Approve" }, { action: "rejected", label: "Reject", danger: true }];
    case "approved":
      return [
        { action: "received", label: "Mark received" },
        ...(canRefund ? [{ action: "refund" as const, label: "Refund now" }] : []),
        { action: "rejected", label: "Reject", danger: true },
      ];
    case "received":
      return request.type === "exchange"
        ? [{ action: "completed", label: "Replacement sent" }]
        : canRefund ? [{ action: "refund", label: "Refund" }] : [];
    default:
      return [];
  }
}

function StatusForm({
  request,
  action,
  onStatus,
  onDone,
}: {
  request: AdminReturnRequest;
  action: Exclude<Action, "refund">;
  onStatus: CardHandlers["onStatus"];
  onDone: () => void;
}) {
  const [customerMessage, setCustomerMessage] = useState("");
  const [staffNote, setStaffNote] = useState(request.staffNote ?? "");
  const [restock, setRestock] = useState(true);
  const [replacementOrderId, setReplacementOrderId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const placeholder: Record<typeof action, string> = {
    approved: "e.g. Our courier will pick it up in the next 2 days.",
    rejected: "Why it can't be accepted (the customer sees this)",
    received: "Optional",
    completed: "e.g. Your size L is on its way.",
  };

  return (
    <form
      className="mt-3 flex flex-col gap-3 rounded-md border border-border bg-background p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const saved = await onStatus({
          status: action,
          customerMessage: customerMessage.trim() || undefined,
          staffNote: staffNote.trim() || undefined,
          ...(action === "received" ? { restock } : {}),
          ...(action === "completed" && replacementOrderId.trim() ? { replacementOrderId: replacementOrderId.trim() } : {}),
        });
        setIsSaving(false);
        if (saved) onDone();
      }}
    >
      <label className="text-sm">
        <span className="mb-1 block font-medium">Message to the customer</span>
        <textarea
          value={customerMessage}
          onChange={(e) => setCustomerMessage(e.target.value)}
          rows={2}
          maxLength={1000}
          required={action === "rejected"}
          placeholder={placeholder[action]}
          className={inputClass}
        />
        <span className="mt-0.5 block text-xs text-muted">Shown in their My Orders and emailed to them.</span>
      </label>
      {action === "received" && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
          Put these items back in stock (untick if damaged)
        </label>
      )}
      {action === "completed" && (
        <label className="text-sm">
          <span className="mb-1 block font-medium">Replacement order ID (optional)</span>
          <input
            value={replacementOrderId}
            onChange={(e) => setReplacementOrderId(e.target.value)}
            pattern="[a-fA-F0-9]{24}"
            title="The full 24-character order ID"
            placeholder="Create it from Manage Orders → New order, then paste its ID"
            className={inputClass}
          />
        </label>
      )}
      <label className="text-sm">
        <span className="mb-1 block font-medium">Internal note</span>
        <input value={staffNote} onChange={(e) => setStaffNote(e.target.value)} maxLength={2000} placeholder="Staff only" className={inputClass} />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSaving}
          className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
            action === "rejected" ? "bg-red-600 text-white" : "bg-primary text-primary-foreground"
          }`}
        >
          {isSaving ? "Saving..." : `Confirm: ${RETURN_STATUS_LABELS[action]}`}
        </button>
        <button type="button" onClick={onDone} className="rounded-md px-3 py-1.5 text-sm text-muted hover:text-foreground">
          Cancel
        </button>
      </div>
    </form>
  );
}

function RefundForm({
  request,
  bkashRefundsAvailable,
  onRefund,
  onBkashRefund,
  onDone,
}: Omit<CardHandlers, "onStatus"> & { request: AdminReturnRequest; onDone: () => void }) {
  const [method, setMethod] = useState<RefundMethod>(request.canRefundWithBkash ? "bkash" : "bkash_personal");
  const [amount, setAmount] = useState(String(suggestedRefund(request.itemsValue, request.refundableRemaining)));
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const bkashBlocked = method === "bkash" && (!bkashRefundsAvailable || !request.canRefundWithBkash);

  return (
    <form
      className="mt-3 flex flex-col gap-3 rounded-md border border-border bg-background p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (bkashBlocked) return;
        setIsSaving(true);
        const value = Number(amount);
        const saved = method === "bkash"
          ? await onBkashRefund({ amount: value, reason: note.trim() || undefined })
          : await onRefund({ amount: value, method, reference: reference.trim() || undefined, note: note.trim() || undefined });
        setIsSaving(false);
        if (saved) onDone();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Amount (৳)</span>
          <input
            type="number"
            min={1}
            max={request.refundableRemaining}
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />
          <span className="mt-0.5 block text-xs text-muted">
            Items {formatCurrency(request.itemsValue)} · up to {formatCurrency(request.refundableRemaining)} left on this order
          </span>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">How</span>
          <select value={method} onChange={(e) => setMethod(e.target.value as RefundMethod)} className={inputClass}>
            {REFUND_METHODS.map((m) => (
              <option key={m} value={m}>
                {REFUND_METHOD_LABELS[m]}{m === "bkash" && !bkashRefundsAvailable ? " (coming soon)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {method === "bkash" ? (
        !bkashRefundsAvailable ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase text-primary">Coming soon</span>
            Automatic bKash refunds turn on once the bKash merchant account is live. Until then, send it by hand and pick
            &ldquo;bKash (sent by hand)&rdquo;.
          </p>
        ) : !request.canRefundWithBkash ? (
          <p className="text-sm text-muted">This order wasn&apos;t paid through bKash checkout, so it can&apos;t be refunded automatically.</p>
        ) : (
          <p className="text-sm text-muted">The money goes straight back to the customer&apos;s bKash wallet. This can&apos;t be undone.</p>
        )
      ) : (
        <label className="text-sm">
          <span className="mb-1 block font-medium">Reference</span>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            maxLength={200}
            placeholder="Transaction ID, bank reference, receipt number..."
            className={inputClass}
          />
        </label>
      )}
      <label className="text-sm">
        <span className="mb-1 block font-medium">{method === "bkash" ? "Reason (sent to bKash)" : "Note"}</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={method === "bkash" ? 255 : 1000} className={inputClass} />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSaving || bkashBlocked}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {isSaving ? "Saving..." : method === "bkash" ? "Refund with bKash" : "Record refund"}
        </button>
        <button type="button" onClick={onDone} className="rounded-md px-3 py-1.5 text-sm text-muted hover:text-foreground">
          Cancel
        </button>
      </div>
    </form>
  );
}

function ReturnCard({ request, ...handlers }: CardHandlers & { request: AdminReturnRequest }) {
  const [action, setAction] = useState<Action | null>(null);
  const customer = request.order?.shippingAddress?.fullName ?? request.user?.name ?? "Customer";
  const phone = request.order?.shippingAddress?.phone;

  return (
    <article className="rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <RotateCcw size={14} className="text-primary" />
            {request.type === "exchange" ? "Exchange" : "Return"} #{shortId(request._id)}
            {request.createdBy === "staff" && <span className="text-xs font-normal text-muted">· logged by staff</span>}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {customer}
            {phone && <> · <a href={`tel:${phone}`} className="hover:underline">{phone}</a></>}
            {" · "}{format(new Date(request.createdAt), "PPP")}
            {request.order && (
              <> · <Link href={`/admin/orders/${request.order._id}/print`} className="text-primary hover:underline">
                Order #{shortId(request.order._id)}
              </Link> ({formatCurrency(request.order.totalAmount)}, {request.order.paymentMethod === "cod" ? "COD" : "bKash"})</>
            )}
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase text-primary">
          {RETURN_STATUS_LABELS[request.status]}
        </span>
      </div>

      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {request.items.map((item) => (
          <li key={item.orderItemIndex} className="flex justify-between gap-3">
            <span>
              {item.quantity} × {item.name}
              {item.variantLabel && <span className="text-muted"> ({item.variantLabel})</span>}
            </span>
            <span className="text-muted">{formatCurrency(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-col gap-1 text-sm">
        <p><span className="text-muted">Reason:</span> {RETURN_REASON_LABELS[request.reason]}</p>
        {request.exchangeFor && <p><span className="text-muted">Wants instead:</span> {request.exchangeFor}</p>}
        {request.details && <p className="whitespace-pre-line"><span className="text-muted">Customer says:</span> {request.details}</p>}
        {request.customerMessage && <p className="whitespace-pre-line"><span className="text-muted">Told the customer:</span> {request.customerMessage}</p>}
        {request.staffNote && <p className="whitespace-pre-line"><span className="text-muted">Internal note:</span> {request.staffNote}</p>}
        {request.status !== "requested" && request.status !== "approved" && request.status !== "rejected" && (
          <p className="text-xs text-muted">{request.restocked ? "Items were put back in stock." : "Items were not restocked."}</p>
        )}
        {request.refund && (
          <p className="font-medium">
            Refunded {formatCurrency(request.refund.amount)} via {REFUND_METHOD_LABELS[request.refund.method]}
            {request.refund.reference && ` (${request.refund.reference})`}
            <span className="font-normal text-muted">
              {" "}· {format(new Date(request.refund.refundedAt), "PPP")}{request.refund.refundedBy?.name && ` by ${request.refund.refundedBy.name}`}
            </span>
          </p>
        )}
        {request.replacementOrder && (
          <p>
            <span className="text-muted">Replacement:</span>{" "}
            <Link href={`/admin/orders/${request.replacementOrder}/print`} className="text-primary hover:underline">
              Order #{shortId(request.replacementOrder)}
            </Link>
          </p>
        )}
        {request.bkashRefundStartedAt && !request.refund && (
          <p className="flex items-start gap-1.5 text-sm text-red-600">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            A bKash refund was started {format(new Date(request.bkashRefundStartedAt), "PPP p")} but no answer came back. Check the bKash
            merchant portal before doing anything else.
          </p>
        )}
      </div>

      {action === null ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {actionsFor(request).map(({ action: next, label, danger }) => (
            <button
              key={next}
              type="button"
              onClick={() => setAction(next)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                danger ? "border-border text-red-600 hover:bg-red-50" : "border-primary text-primary hover:bg-primary/5"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : action === "refund" ? (
        <RefundForm
          request={request}
          bkashRefundsAvailable={handlers.bkashRefundsAvailable}
          onRefund={handlers.onRefund}
          onBkashRefund={handlers.onBkashRefund}
          onDone={() => setAction(null)}
        />
      ) : (
        <StatusForm request={request} action={action} onStatus={handlers.onStatus} onDone={() => setAction(null)} />
      )}
    </article>
  );
}

export function AdminReturnsView() {
  const { isChecking, isAllowed } = useRequirePermission("orders:manage");
  const {
    items, total, page, totalPages, counts, bkashRefundsAvailable, isLoading, tab,
    setTab, goToPage, updateStatus, recordRefund, refundWithBkash,
  } = useAdminReturns();

  if (isChecking || !isAllowed) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">Checking your session...</div>;
  }

  return (
    <main className="max-w-3xl p-6">
      <div className="mb-6">
        <h1 className="mb-1 text-xl font-semibold">Returns &amp; exchanges</h1>
        <p className="text-sm text-muted">
          Customers request these from My Orders within 7 days of delivery. To log one taken by phone, open the order in Manage
          Orders and use &ldquo;Log return / exchange&rdquo;.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap rounded-md border border-border p-0.5" role="tablist" aria-label="Filter by status">
          {TABS.map(({ value, label }) => {
            const count = value === "all" ? null : counts[value as ReturnStatus];
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={`rounded px-3 py-1 text-sm ${tab === value ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground"}`}
              >
                {label}
                {count ? ` (${count})` : ""}
              </button>
            );
          })}
        </div>
        {!isLoading && <span className="ml-auto text-xs text-muted">{total} request{total === 1 ? "" : "s"}</span>}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading returns...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">{tab === "requested" ? "No new requests." : "Nothing here."}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((request) => (
            <ReturnCard
              key={`${request._id}:${request.status}:${request.updatedAt}`}
              request={request}
              bkashRefundsAvailable={bkashRefundsAvailable}
              onStatus={(update) => updateStatus(request._id, update)}
              onRefund={(input) => recordRefund(request._id, input)}
              onBkashRefund={(input) => refundWithBkash(request._id, input)}
            />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
    </main>
  );
}
