"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { useRequirePermission } from "@/controllers/useRequirePermission";
import { useAdminPayments } from "@/controllers/useAdminPayments";
import { formatCurrency } from "@/lib/currency";
import { REFUND_METHOD_LABELS } from "@/lib/returns";
import { AnalyticsRangePreset, PaymentResolution, ReconciliationOrder } from "@/models";

const RANGE_OPTIONS: { value: AnalyticsRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

const RESOLUTION_LABELS: Record<PaymentResolution, { label: string; hint: string }> = {
  paid: { label: "Payment arrived: mark paid", hint: "You found the payment in the bKash merchant portal." },
  cancelled: { label: "No payment: cancel order", hint: "Cancels the order and puts its stock back." },
  dismiss: { label: "Close the review", hint: "Nothing changes on the order. Say what you did (e.g. refunded by hand)." },
};

const inputClass = "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm";
const shortId = (id: string) => id.slice(-6).toUpperCase();

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function ResolveForm({
  order,
  isBusy,
  onResolve,
  onCancel,
}: {
  order: ReconciliationOrder;
  isBusy: boolean;
  onResolve: (input: { outcome: PaymentResolution; note: string; transactionId?: string }) => Promise<boolean>;
  onCancel: () => void;
}) {
  const allowed = order.issue?.allowed ?? ["dismiss"];
  const [outcome, setOutcome] = useState<PaymentResolution>(allowed[0]);
  const [note, setNote] = useState("");
  const [transactionId, setTransactionId] = useState("");

  return (
    <form
      className="mt-3 flex flex-col gap-3 rounded-md border border-border bg-background p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const saved = await onResolve({
          outcome,
          note: note.trim(),
          transactionId: outcome === "paid" ? transactionId.trim() : undefined,
        });
        if (saved) onCancel();
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Decision</legend>
        {allowed.map((value) => (
          <label key={value} className="flex gap-2 text-sm">
            <input type="radio" name={`outcome-${order._id}`} checked={outcome === value} onChange={() => setOutcome(value)} className="mt-0.5" />
            <span>
              <span className="block font-medium">{RESOLUTION_LABELS[value].label}</span>
              <span className="block text-xs text-muted">{RESOLUTION_LABELS[value].hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {outcome === "paid" && (
        <label className="text-sm">
          <span className="mb-1 block font-medium">bKash transaction ID</span>
          <input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} required minLength={4} maxLength={100} className={inputClass} />
        </label>
      )}
      <label className="text-sm">
        <span className="mb-1 block font-medium">Note (required)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          required
          minLength={3}
          maxLength={1000}
          placeholder="What you checked and what you did"
          className={inputClass}
        />
        <span className="mt-0.5 block text-xs text-muted">Saved on the order and in Change History.</span>
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={isBusy} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {isBusy ? "Saving..." : "Confirm"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 text-sm text-muted hover:text-foreground">
          Cancel
        </button>
      </div>
    </form>
  );
}

function IssueCard({
  order,
  bkashConnected,
  isBusy,
  onRecheck,
  onResolve,
}: {
  order: ReconciliationOrder;
  bkashConnected: boolean;
  isBusy: boolean;
  onRecheck: () => void;
  onResolve: (input: { outcome: PaymentResolution; note: string; transactionId?: string }) => Promise<boolean>;
}) {
  const [isResolving, setIsResolving] = useState(false);
  const customer = order.shippingAddress?.fullName ?? order.user?.name ?? "Customer";

  return (
    <article className="rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            Order #{shortId(order._id)} · {formatCurrency(order.totalAmount)}
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase text-primary">{order.status}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {customer}
            {order.shippingAddress?.phone && <> · <a href={`tel:${order.shippingAddress.phone}`} className="hover:underline">{order.shippingAddress.phone}</a></>}
            {" · "}placed {format(new Date(order.createdAt), "PPP p")}
          </p>
        </div>
        <Link href={`/admin/orders/${order._id}/print`} target="_blank" className="text-xs text-primary hover:underline">
          Open order
        </Link>
      </div>

      {order.issue && (
        <p className="mt-3 flex items-start gap-1.5 text-sm">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-700" />
          {order.issue.message}
        </p>
      )}
      <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-0.5 text-xs text-muted sm:grid-cols-2">
        {order.bkashPaymentID && <div><dt className="inline">bKash payment ID: </dt><dd className="inline break-all text-foreground">{order.bkashPaymentID}</dd></div>}
        {order.bkashTrxID && <div><dt className="inline">Transaction ID: </dt><dd className="inline text-foreground">{order.bkashTrxID}</dd></div>}
        {order.reservationExpiresAt && <div><dt className="inline">Payment window ended: </dt><dd className="inline">{format(new Date(order.reservationExpiresAt), "PPP p")}</dd></div>}
        {order.lastPaymentCheckAt && <div><dt className="inline">Last checked: </dt><dd className="inline">{format(new Date(order.lastPaymentCheckAt), "PPP p")}</dd></div>}
      </dl>

      {isResolving ? (
        <ResolveForm order={order} isBusy={isBusy} onResolve={onResolve} onCancel={() => setIsResolving(false)} />
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {order.bkashPaymentID && (
            <button
              type="button"
              onClick={onRecheck}
              disabled={isBusy || !bkashConnected}
              title={bkashConnected ? undefined : "bKash isn't connected yet"}
              className="flex items-center gap-1.5 rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 disabled:opacity-50"
            >
              <RefreshCw size={13} className={isBusy ? "animate-spin" : ""} /> Re-check with bKash
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsResolving(true)}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-background"
          >
            Resolve…
          </button>
        </div>
      )}
    </article>
  );
}

export function AdminPaymentsView() {
  const { isChecking, isAllowed } = useRequirePermission("orders:manage");
  const { range, setRange, data, isLoading, busyOrderId, recheck, resolve } = useAdminPayments();

  if (isChecking || !isAllowed) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">Checking your session...</div>;
  }

  const open = data ? [...data.needsReview, ...data.stale] : [];

  return (
    <main className="max-w-4xl p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Payments</h1>
          <p className="text-sm text-muted">
            Money in, refunds out, and the online payments the automatic checks couldn&apos;t settle.
          </p>
        </div>
        <div className="flex rounded-md border border-border p-0.5" role="group" aria-label="Date range">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={range === opt.value}
              onClick={() => setRange(opt.value)}
              className={`rounded px-3 py-1 text-xs font-medium ${range === opt.value ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <p className="text-sm text-muted">Loading payments...</p>
      ) : (
        <>
          <section aria-labelledby="payments-summary" className="mb-8">
            <h2 id="payments-summary" className="sr-only">Summary</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="bKash collected" value={formatCurrency(data.summary.onlineCollected.total)} hint={`${data.summary.onlineCollected.count} orders`} />
              <StatTile label="Cash on Delivery collected" value={formatCurrency(data.summary.codCollected.total)} hint={`${data.summary.codCollected.count} delivered orders`} />
              <StatTile label="Refunded" value={formatCurrency(data.summary.refunded.total)} hint={`${data.summary.refunded.count} refunds`} />
              <StatTile label="Net" value={formatCurrency(data.summary.net)} hint="Collected minus refunds" />
            </div>
            {data.summary.refunded.byMethod.length > 0 && (
              <p className="mt-2 text-xs text-muted">
                Refunds by method:{" "}
                {data.summary.refunded.byMethod.map((row) => `${REFUND_METHOD_LABELS[row.method] ?? row.method} ${formatCurrency(row.total)}`).join(" · ")}
              </p>
            )}
            <p className="mt-1 text-xs text-muted">
              Cash on Delivery counts once an order is delivered. bKash counts once the payment is confirmed. Refunds count by the date they were sent.
            </p>
          </section>

          <section aria-labelledby="payments-open" className="mb-8">
            <h2 id="payments-open" className="mb-1 text-base font-semibold">
              Needs a decision {open.length > 0 && <span className="text-muted">({open.length})</span>}
            </h2>
            <p className="mb-3 text-sm text-muted">
              Every open item, whatever the date range.
              {!data.bkashConnected && " bKash isn't connected yet, so re-checks are switched off."}
            </p>
            {open.length === 0 ? (
              <p className="flex items-center gap-2 rounded-md border border-dashed border-border p-6 text-sm text-muted">
                <CheckCircle2 size={16} className="text-primary" /> Nothing to review. Every online payment is settled.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {open.map((order) => (
                  <IssueCard
                    key={`${order._id}:${order.status}`}
                    order={order}
                    bkashConnected={data.bkashConnected}
                    isBusy={busyOrderId === order._id}
                    onRecheck={() => recheck(order._id)}
                    onResolve={(input) => resolve(order._id, input)}
                  />
                ))}
              </div>
            )}
          </section>

          {data.resolved.length > 0 && (
            <section aria-labelledby="payments-resolved">
              <h2 id="payments-resolved" className="mb-3 text-base font-semibold">Recently resolved</h2>
              <ul className="divide-y divide-border rounded-md border border-border bg-surface text-sm">
                {data.resolved.map((order) => (
                  <li key={order._id} className="flex flex-col gap-0.5 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Order #{shortId(order._id)} · {formatCurrency(order.totalAmount)} · <span className="text-muted">{order.status}</span>
                      {order.paymentReviewNote && <span className="block text-xs text-muted">{order.paymentReviewNote}</span>}
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {order.paymentReviewResolvedAt && format(new Date(order.paymentReviewResolvedAt), "PPP p")}
                      {order.paymentReviewResolvedBy?.name && ` · ${order.paymentReviewResolvedBy.name}`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
