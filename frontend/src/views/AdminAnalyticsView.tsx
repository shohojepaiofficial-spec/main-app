"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import { useAuthController } from "@/controllers/useAuthController";
import { useRequirePermission } from "@/controllers/useRequirePermission";
import { useAdminAnalytics } from "@/controllers/useAdminAnalytics";
import * as analyticsService from "@/services/analyticsService";
import { confirmDialog } from "@/lib/confirm";
import { formatCurrency } from "@/lib/currency";
import { AnalyticsEventType, AnalyticsRangePreset } from "@/models";

type AgeFilter = "all" | "30d" | "7d" | "today";

// The two real underlying fields — every stat on this dashboard (unique
// visitors, visitors by source, most-visited routes, most-clicked products,
// etc.) is derived from one of these two `AnalyticsEvent.type` values, so
// there's nothing more granular to select than this: a "Visitors by source"
// checkbox couldn't be reset independently of "Page views" without leaving
// the underlying events half-deleted and the derived numbers meaningless.
const FIELD_OPTIONS: { value: AnalyticsEventType; label: string; hint: string }[] = [
  { value: "page_view", label: "Page views", hint: "Page views, unique visitors, top routes, visitors by source" },
  { value: "product_click", label: "Product clicks", hint: "Product click totals and most-clicked products" },
];

const AGE_OPTIONS: { value: AgeFilter; label: string }[] = [
  { value: "all", label: "All time (everything matching)" },
  { value: "30d", label: "Older than 30 days" },
  { value: "7d", label: "Older than 7 days" },
  { value: "today", label: "Before today" },
];

// Resolves an age filter into the `before` cutoff the API expects — kept
// separate from the option list so both the count preview and the actual
// delete build the exact same filter from the same selections.
function resolveBefore(age: AgeFilter): string | undefined {
  if (age === "all") return undefined;
  const cutoff = new Date();
  if (age === "today") {
    cutoff.setHours(0, 0, 0, 0);
  } else if (age === "7d") {
    cutoff.setTime(cutoff.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else {
    cutoff.setTime(cutoff.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return cutoff.toISOString();
}

// Full-admin only — deliberately not delegable to a coadmin even one
// holding analytics:manage, since permanently deleting traffic history is a
// different order of consequence than just viewing it (see server's
// analyticsRoutes.ts, gated by adminOnly rather than authorize(...)).
function ResetAnalyticsSection({ onReset }: { onReset: () => void }) {
  // Both selected by default — deleting requires an explicit, visible choice
  // of which fields are included rather than a bundled "all" option hiding
  // what's actually about to go.
  const [selectedFields, setSelectedFields] = useState<Set<AnalyticsEventType>>(
    new Set(FIELD_OPTIONS.map((f) => f.value))
  );
  const [age, setAge] = useState<AgeFilter>("all");
  const [isResetting, setIsResetting] = useState(false);

  const toggleField = (field: AnalyticsEventType) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  const onDelete = async () => {
    if (selectedFields.size === 0) {
      toast.error("Select at least one field to reset");
      return;
    }

    // Omit `type` entirely when every field is selected — functionally the
    // same as sending both, but matches what the count/delete endpoints
    // treat as "no type filter" (see server's buildEventFilter).
    const type = selectedFields.size === FIELD_OPTIONS.length ? undefined : [...selectedFields][0];
    const filter = { type, before: resolveBefore(age) };

    setIsResetting(true);
    try {
      const count = await analyticsService.getAnalyticsEventCount(filter);
      if (count === 0) {
        toast("Nothing matches this filter — nothing to delete.");
        return;
      }

      const confirmed = await confirmDialog(
        `Permanently delete ${count} analytics event${count === 1 ? "" : "s"} matching this filter? This can't be undone.`,
        { title: "Reset analytics data", confirmLabel: "Delete", danger: true }
      );
      if (!confirmed) return;

      const deletedCount = await analyticsService.resetAnalyticsEvents(filter);
      toast.success(`Deleted ${deletedCount} event${deletedCount === 1 ? "" : "s"}`);
      onReset();
    } catch {
      toast.error("Failed to reset analytics data");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="rounded-md border border-dashed border-red-300 bg-red-50/50 p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-red-800">
        <Trash2 size={15} /> Reset analytics data
      </h2>
      <p className="mb-3 text-xs text-muted">
        Permanently deletes page-view/product-click history — useful for clearing out dev/test
        traffic right before a real launch. Doesn&apos;t touch products, orders, or users. This
        can&apos;t be undone.
      </p>
      <div className="mb-3">
        <p className="mb-1.5 text-xs font-medium text-muted">Fields to reset</p>
        <div className="flex flex-col gap-1.5">
          {FIELD_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={selectedFields.has(opt.value)}
                onChange={() => toggleField(opt.value)}
              />
              <span>
                {opt.label}
                <span className="block text-xs text-muted">{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-muted">Age</label>
          <select
            value={age}
            onChange={(e) => setAge(e.target.value as AgeFilter)}
            className="mt-1 block rounded border border-border bg-background px-2 py-1.5 text-sm"
          >
            {AGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onDelete}
          disabled={isResetting}
          className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          <Trash2 size={14} /> {isResetting ? "Working..." : "Delete matching events"}
        </button>
      </div>
    </div>
  );
}

const RANGE_OPTIONS: { value: AnalyticsRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

const ROLE_LABEL: Record<string, string> = {
  user: "User",
  coadmin: "Co-admin",
  admin: "Admin",
};

const PROVIDER_LABEL: Record<string, string> = {
  local: "Email/password",
  google: "Google",
  facebook: "Facebook",
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

// One shared hue for every list here — each row's identity is its label,
// not its color, so a single sequential fill (the app's primary token) is
// the right call rather than a categorical palette. Width is proportional
// to the largest value in the list; count is also shown as a direct label.
function BarList({
  items,
  formatLabel,
  formatValue,
}: {
  items: { label: string; value: number }[];
  formatLabel?: (label: string) => string;
  formatValue?: (value: number) => string;
}) {
  if (items.length === 0) return <p className="text-sm text-muted">No data yet.</p>;
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-xs text-muted" title={item.label}>
            {formatLabel ? formatLabel(item.label) : item.label}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
          <span className="w-12 shrink-0 text-right text-xs font-medium">
            {formatValue ? formatValue(item.value) : item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}

// The two buckets that aren't an actual social platform — excluded when
// rolling "visitors by source" up into a single "social visitors" number.
const NON_SOCIAL_SOURCES = new Set(["Direct / App", "Other websites"]);

export function AdminAnalyticsView() {
  const { isChecking, isAllowed } = useRequirePermission("analytics:manage");
  const { user } = useAuthController();
  const { overview, isLoading, range, setRange, reload } = useAdminAnalytics();

  const socialVisitors =
    overview?.traffic.bySource
      .filter((s) => !NON_SOCIAL_SOURCES.has(s.source))
      .reduce((sum, s) => sum + s.count, 0) ?? 0;

  if (isChecking || !isAllowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Checking your session...
      </div>
    );
  }

  return (
    <main className="p-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Analytics</h1>
        <div className="flex rounded-md border border-border bg-surface p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`rounded px-3 py-1 text-xs font-medium ${
                range === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-1 text-sm text-muted">
        Products, users, orders, and storefront traffic at a glance.
      </p>
      <p className="mb-6 text-xs text-muted">
        Orders, traffic, and product clicks below are limited to{" "}
        {overview?.range.from
          ? `${format(new Date(overview.range.from), "PP")} – ${format(new Date(overview.range.to), "PP")}`
          : "all time"}
        . Product and user totals always reflect right now, regardless of the range picked.
      </p>

      {isLoading || !overview ? (
        <p className="text-sm text-muted">Loading analytics...</p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile label="Products" value={overview.products.total} />
            <StatTile label="Users" value={overview.users.total} />
            <StatTile label="Orders" value={overview.orders.total} />
            <StatTile label="Revenue" value={formatCurrency(overview.orders.revenue)} />
            <StatTile label="Page views" value={overview.traffic.totalPageViews} />
            <StatTile label="Unique visitors" value={overview.traffic.uniqueVisitors} />
            <StatTile label="Social media visitors" value={socialVisitors} />
            <StatTile label="Product clicks" value={overview.productClicks.total} />
            <StatTile label="Low stock" value={overview.products.lowStockCount} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Section title="Products by category">
              <BarList
                items={overview.products.byCategory.map((c) => ({
                  label: c.category,
                  value: c.count,
                }))}
              />
            </Section>

            <Section title="Orders by status">
              <BarList
                items={overview.orders.byStatus.map((s) => ({
                  label: s.status,
                  value: s.count,
                }))}
                formatLabel={(status) => ORDER_STATUS_LABEL[status] ?? status}
              />
            </Section>

            <Section title="Users by role">
              <BarList
                items={overview.users.byRole.map((r) => ({ label: r.role, value: r.count }))}
                formatLabel={(role) => ROLE_LABEL[role] ?? role}
              />
            </Section>

            <Section title="Users by sign-in method">
              <BarList
                items={overview.users.byProvider.map((p) => ({
                  label: p.provider,
                  value: p.count,
                }))}
                formatLabel={(provider) => PROVIDER_LABEL[provider] ?? provider}
              />
            </Section>

            <Section title="Most-visited routes">
              <BarList
                items={overview.traffic.topRoutes.map((r) => ({ label: r.path, value: r.count }))}
              />
            </Section>

            <Section title="Visitors by source">
              <BarList
                items={overview.traffic.bySource.map((s) => ({ label: s.source, value: s.count }))}
              />
              <p className="mt-3 text-xs text-muted">
                Based on each visitor&apos;s referring link — best-effort, since some apps (mobile
                Facebook/Instagram, etc.) hide or strip this.
              </p>
            </Section>

            <Section title="Most-clicked products">
              {overview.productClicks.top.length === 0 ? (
                <p className="text-sm text-muted">No product views yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {overview.productClicks.top.map((p) => (
                    <div key={p.productId} className="flex items-center justify-between gap-3 text-sm">
                      <Link
                        href={`/shop/${p.productId}`}
                        target="_blank"
                        className="truncate hover:text-primary hover:underline"
                      >
                        {p.name}
                      </Link>
                      <span className="shrink-0 text-xs font-medium text-muted">{p.count} views</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>

          {user?.role === "admin" && <ResetAnalyticsSection onReset={reload} />}
        </div>
      )}
    </main>
  );
}
