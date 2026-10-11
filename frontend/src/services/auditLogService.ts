import { api } from "@/lib/api";
import { AuditAction, AuditActor, AuditEntityType, AuditEntry, Paginated } from "@/models";

// Full admin only (the backend enforces it), from top to bottom.

export interface AuditLogParams {
  page?: number;
  limit?: number;
  entityType?: AuditEntityType;
  action?: AuditAction;
  actorId?: string;
  /** YYYY-MM-DD, inclusive. */
  from?: string;
  /** YYYY-MM-DD, inclusive. */
  to?: string;
}

export const getAuditLogs = async (params?: AuditLogParams): Promise<Paginated<AuditEntry>> => {
  const { data } = await api.get<Paginated<AuditEntry>>("/audit-logs", { params });
  return data;
};

export const getAuditActors = async (): Promise<AuditActor[]> => {
  const { data } = await api.get<AuditActor[]>("/audit-logs/actors");
  return data;
};
