import { Document, model, Schema, Types } from "mongoose";

export const AUDIT_ENTITY_TYPES = [
  "product", "banner", "order", "user", "promo", "ad", "campaign",
  "message", "review", "translation", "analytics", "account", "return", "category", "popup",
] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export const AUDIT_ACTIONS = [
  "created", "updated", "deleted", "reordered", "published", "sent", "booked", "reset",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface IAuditChange {
  field: string;
  before?: unknown;
  after?: unknown;
}

export interface IAuditLog extends Document {
  actorId: Types.ObjectId;
  actorName: string;
  actorRole: "admin" | "coadmin";
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityName: string;
  changes: IAuditChange[];
  createdAt: Date;
}

const changeSchema = new Schema<IAuditChange>(
  {
    field: { type: String, required: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Snapshot the actor label so the history remains readable if the user
    // is later renamed or removed. Email addresses and credentials are not
    // copied into the audit record.
    actorName: { type: String, required: true, maxlength: 120 },
    actorRole: { type: String, enum: ["admin", "coadmin"], required: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    entityType: { type: String, enum: AUDIT_ENTITY_TYPES, required: true },
    entityId: { type: String, required: true, maxlength: 100 },
    entityName: { type: String, required: true, maxlength: 200 },
    changes: { type: [changeSchema], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

auditLogSchema.index({ createdAt: -1, _id: -1 });
auditLogSchema.index({ entityType: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);
