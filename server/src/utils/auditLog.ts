import { ClientSession, Types } from "mongoose";
import { AuditAction, AuditEntityType, AuditLog, IAuditChange } from "../models/AuditLog";
import { User } from "../models/User";

type AuditSnapshot = object;

const TRACKED_FIELDS: Record<AuditEntityType, readonly string[]> = {
  product: [
    "name", "description", "price", "stock", "category", "deliveryFeeInsideCity",
    "deliveryFeeOutsideCity", "isFeatured", "weightKg", "options", "variants", "preorder", "images",
  ],
  banner: ["title", "subtitle", "eyebrow", "accentColor", "primaryCta", "secondaryCta", "promoCode", "isActive", "order", "image"],
  order: [
    "status", "totalAmount", "paymentMethod", "internalNote", "courierConsignmentId",
    "courierTrackingStatus", "courierNote", "courierBookedAt", "paymentReviewRequired", "paymentReviewNote",
  ],
  user: ["role", "permissions"],
  promo: ["code", "discountType", "value", "scope", "product", "isActive", "expiresAt"],
  ad: ["title", "sourceType", "caption", "link", "platforms", "results", "image"],
  campaign: ["title", "sourceType", "channels", "emailSubject", "smsMessage", "stats"],
  message: ["subject", "isRead"],
  review: ["rating", "comment", "reply"],
  translation: ["en", "bn"],
  // Analytics resets and own-account security events carry explicit
  // changes rather than document snapshots (see auditTargets.ts).
  analytics: [],
  account: ["name", "phone", "image"],
  return: ["status", "customerMessage", "staffNote", "restocked", "refund", "replacementOrder"],
  category: ["name", "nameBn", "order", "image"],
  popup: ["isActive", "title", "message", "image", "button", "version"],
};

const SENSITIVE_KEY = /password|secret|token|credential|authorization|backup.?code|private.?key/i;

function comparable(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Types.ObjectId) return value.toString();
  if (Array.isArray(value)) return `[${value.map(comparable).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${key}:${comparable(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

function safeValue(value: unknown, field: string): unknown {
  if (field === "image") return value ? "Image set" : null;
  if (field === "images") return Array.isArray(value) ? `${value.length} image${value.length === 1 ? "" : "s"}` : "0 images";
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Types.ObjectId) return value.toString();
  if (Array.isArray(value)) return value.map((item) => safeValue(item, ""));
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(key)) continue;
      result[key] = safeValue(item, key);
    }
    return result;
  }
  if (typeof value === "string" && value.length > 2000) return `${value.slice(0, 2000)}… [truncated]`;
  return value;
}

export function buildAuditChanges(
  entityType: AuditEntityType,
  action: AuditAction,
  before?: AuditSnapshot | null,
  after?: AuditSnapshot | null
): IAuditChange[] {
  const beforeRecord = before as Record<string, unknown> | null | undefined;
  const afterRecord = after as Record<string, unknown> | null | undefined;
  const fields = TRACKED_FIELDS[entityType];
  const changes: IAuditChange[] = [];

  for (const field of fields) {
    const oldValue = beforeRecord?.[field];
    const newValue = afterRecord?.[field];
    if (action !== "created" && action !== "deleted") {
      if (comparable(oldValue) === comparable(newValue)) continue;
    }

    changes.push({
      field,
      ...(action === "created" ? {} : { before: beforeRecord ? safeValue(oldValue, field) : null }),
      ...(action === "deleted" ? {} : { after: afterRecord ? safeValue(newValue, field) : null }),
    });
  }

  return changes;
}

export async function recordAuditEvent(
  input: {
    actorId: string;
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    entityName: string;
    before?: AuditSnapshot | null;
    after?: AuditSnapshot | null;
    /** Used instead of a snapshot diff for events that have no document. */
    changes?: IAuditChange[];
  },
  session?: ClientSession
) {
  const changes = input.changes ?? buildAuditChanges(input.entityType, input.action, input.before, input.after);
  if (changes.length === 0) return;

  const actor = await User.findById(input.actorId).select("name role").session(session ?? null).lean();
  if (!actor || (actor.role !== "admin" && actor.role !== "coadmin")) {
    throw new Error("Could not identify the administrator for the audit record");
  }

  await AuditLog.create(
    [{
      actorId: actor._id,
      actorName: actor.name,
      actorRole: actor.role,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityName: input.entityName.slice(0, 200) || input.entityType,
      changes,
    }],
    session ? { session } : {}
  );
}
