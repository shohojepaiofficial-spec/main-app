"use client";

import { Loader2, RefreshCw, X } from "lucide-react";
import { useRequireAdmin } from "@/controllers/useRequireAdmin";
import { AuditFilters, useAdminAuditLog } from "@/controllers/useAdminAuditLog";
import { Pagination } from "@/views/Pagination";
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  AuditAction,
  AuditActor,
  AuditChange,
  AuditEntityType,
  AuditEntry,
} from "@/models";

const ENTITY_LABELS: Record<AuditEntityType, string> = {
  product: "Product",
  banner: "Banner",
  order: "Order",
  user: "User access",
  promo: "Promo code",
  ad: "Social media ad",
  campaign: "Campaign",
  message: "Message",
  review: "Review",
  translation: "Translation",
  analytics: "Analytics",
  account: "Own account",
  return: "Return / exchange",
  category: "Category",
  popup: "Popup",
};

const ACTION_LABELS: Record<AuditAction, string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  reordered: "Reordered",
  published: "Published",
  sent: "Sent",
  booked: "Booked courier",
  reset: "Reset",
};

const ACTION_STYLES: Partial<Record<AuditAction, string>> = {
  created: "bg-green-100 text-green-800",
  deleted: "bg-red-100 text-red-800",
  reset: "bg-red-100 text-red-800",
  published: "bg-blue-100 text-blue-800",
  sent: "bg-blue-100 text-blue-800",
  booked: "bg-purple-100 text-purple-800",
};

const FIELD_LABELS: Record<string, string> = {
  isActive: "Active",
  isRead: "Read",
  isFeatured: "Featured",
  bn: "Bangla text",
  en: "English text",
  weightKg: "Weight (kg)",
  promoCode: "Promo code",
  courierConsignmentId: "Consignment ID",
  courierTrackingStatus: "Tracking status",
  courierBookedAt: "Courier booked at",
  twoStepVerification: "Two-step verification",
  deletedEvents: "Events deleted",
  olderThan: "Older than",
};

function fieldLabel(field: string) {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  const words = field.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "(empty)";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && ISO_DATE.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString();
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "(none)";
    if (value.every((item) => typeof item !== "object" || item === null)) return value.map(formatValue).join(", ");
    return JSON.stringify(value, null, 2);
  }
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

// Short values sit inline; long ones (variant lists, campaign text) collapse
// so a single entry can't push the page sideways on a phone.
function Value({ value, tone }: { value: unknown; tone: "before" | "after" }) {
  const text = formatValue(value);
  const color = tone === "before" ? "text-muted line-through decoration-1" : "text-foreground";
  if (text.length <= 80 && !text.includes("\n")) {
    return <span className={`break-words ${color}`}>{text}</span>;
  }
  return (
    <details className="min-w-0">
      <summary className={`cursor-pointer text-xs ${tone === "before" ? "text-muted" : "text-primary"}`}>
        {tone === "before" ? "Show old value" : "Show new value"}
      </summary>
      <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-background p-2 text-xs">{text}</pre>
    </details>
  );
}

function ChangeLine({ change, action }: { change: AuditChange; action: AuditAction }) {
  const showBefore = action !== "created" && "before" in change;
  const showAfter = action !== "deleted" && "after" in change;
  return (
    <li className="grid gap-1 py-1.5 text-sm sm:grid-cols-[10rem_1fr] sm:gap-3">
      <span className="font-medium text-muted">{fieldLabel(change.field)}</span>
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        {showBefore && <Value value={change.before} tone={showAfter ? "before" : "after"} />}
        {showBefore && showAfter && <span aria-label="changed to" className="text-muted">→</span>}
        {showAfter && <Value value={change.after} tone="after" />}
      </span>
    </li>
  );
}

function EntryCard({ entry }: { entry: AuditEntry }) {
  const when = new Date(entry.createdAt);
  return (
    <li className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-medium">
            <span className="text-muted">{ENTITY_LABELS[entry.entityType] ?? entry.entityType}:</span> {entry.entityName}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {entry.actorName} ({entry.actorRole === "admin" ? "Admin" : "Co-admin"}) ·{" "}
            <time dateTime={entry.createdAt}>{when.toLocaleString()}</time>
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_STYLES[entry.action] ?? "bg-background text-foreground"}`}>
          {ACTION_LABELS[entry.action] ?? entry.action}
        </span>
      </div>
      {entry.changes.length > 0 && (
        <ul className="mt-3 divide-y divide-border border-t border-border">
          {entry.changes.map((change) => <ChangeLine key={change.field} change={change} action={entry.action} />)}
        </ul>
      )}
    </li>
  );
}

const inputClass = "w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground";

function FilterBar({
  filters,
  actors,
  onChange,
}: {
  filters: AuditFilters;
  actors: AuditActor[];
  onChange: (next: AuditFilters) => void;
}) {
  const hasActiveFilters = Object.values(filters).some(Boolean);
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 rounded-md border border-border bg-background p-3 sm:grid-cols-3 lg:grid-cols-6">
      <label className="flex flex-col gap-1 text-xs text-muted">
        Who
        <select
          className={inputClass}
          value={filters.actorId ?? ""}
          onChange={(e) => onChange({ ...filters, actorId: e.target.value || undefined })}
        >
          <option value="">Everyone</option>
          {actors.map((actor) => (
            <option key={actor.id} value={actor.id}>{actor.name}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Area
        <select
          className={inputClass}
          value={filters.entityType ?? ""}
          onChange={(e) => onChange({ ...filters, entityType: (e.target.value || undefined) as AuditEntityType })}
        >
          <option value="">Everything</option>
          {AUDIT_ENTITY_TYPES.map((type) => <option key={type} value={type}>{ENTITY_LABELS[type]}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Action
        <select
          className={inputClass}
          value={filters.action ?? ""}
          onChange={(e) => onChange({ ...filters, action: (e.target.value || undefined) as AuditAction })}
        >
          <option value="">All actions</option>
          {AUDIT_ACTIONS.map((action) => <option key={action} value={action}>{ACTION_LABELS[action]}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        From
        <input
          type="date"
          className={inputClass}
          value={filters.from ?? ""}
          onChange={(e) => onChange({ ...filters, from: e.target.value || undefined })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        To
        <input
          type="date"
          className={inputClass}
          value={filters.to ?? ""}
          onChange={(e) => onChange({ ...filters, to: e.target.value || undefined })}
        />
      </label>
      <div className="flex items-end">
        {hasActiveFilters && (
          <button
            onClick={() => onChange({})}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted hover:text-foreground"
          >
            <X size={14} /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

export function AdminAuditLogView() {
  const { isChecking, isAllowed } = useRequireAdmin();
  const { entries, actors, filters, setFilters, page, setPage, total, totalPages, isLoading, error, refresh } =
    useAdminAuditLog(isAllowed);

  if (isChecking) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (!isAllowed) return null;

  return (
    <main className="min-w-0 p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Change History</h1>
          <p className="mt-1 text-sm text-muted">
            Every change made by admins and co-admins: who, when, and what changed.
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50"
        >
          <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <FilterBar filters={filters} actors={actors} onChange={setFilters} />

      {error && (
        <p role="alert" className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12 text-muted">
          <Loader2 className="animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        !error && (
          <p className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted">
            No changes recorded{Object.values(filters).some(Boolean) ? " for these filters" : " yet"}.
          </p>
        )
      ) : (
        <>
          <p className="mb-2 text-xs text-muted">{total} change{total === 1 ? "" : "s"}</p>
          <ul className="flex flex-col gap-3">
            {entries.map((entry) => <EntryCard key={entry._id} entry={entry} />)}
          </ul>
        </>
      )}

      <div className="mt-4 flex justify-center">
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </main>
  );
}
