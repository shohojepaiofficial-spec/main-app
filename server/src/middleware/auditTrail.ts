import { NextFunction, Response } from "express";
import type { AuthRequest } from "./auth";
import type { AuditAction, AuditEntityType, IAuditChange } from "../models/AuditLog";
import { buildAuditChanges, recordAuditEvent } from "../utils/auditLog";
import { AuditSnapshot, loadAuditSnapshot } from "../utils/auditTargets";
import { reportError } from "../utils/errorMonitoring";

type Target =
  | { from: "param"; param?: string } // req.params[param ?? "id"]
  | { from: "self" } // the signed-in staff member's own account
  | { from: "bulk" } // req.body.ids
  | { from: "created" } // _id/id of the JSON response
  | { from: "none"; id: string; name: string }; // events without a document

interface AuditTrailOptions {
  entityType: AuditEntityType;
  action: AuditAction;
  target: Target;
  /** Explicit changes for events that a snapshot diff can't describe. */
  changes?: (req: AuthRequest, responseBody: unknown) => IAuditChange[];
}

const MAX_BULK_TARGETS = 100;

function targetIds(target: Target, req: AuthRequest): string[] {
  switch (target.from) {
    case "param": {
      const value = req.params[target.param ?? "id"];
      return typeof value === "string" ? [value] : [];
    }
    case "self":
      return req.userId ? [req.userId] : [];
    case "bulk": {
      const ids = (req.body as { ids?: unknown } | undefined)?.ids;
      return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string").slice(0, MAX_BULK_TARGETS) : [];
    }
    case "none":
      return [target.id];
    case "created":
      return [];
  }
}

function createdId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as { _id?: unknown; id?: unknown };
  const id = record._id ?? record.id;
  return id === undefined || id === null ? null : String(id);
}

/**
 * Records a staff member's successful change in the admin change history.
 * Mount after protect/authorize on any route an admin or co-admin can use to
 * change store data. Customers pass straight through. It snapshots the target
 * before the handler runs and again after a 2xx response, then stores only
 * the tracked fields that changed.
 *
 * Recording happens after the response, so a failure to write the history
 * never blocks or rolls back the action itself; it is reported to error
 * monitoring instead. Product and banner controllers record inside their own
 * transactions and don't use this middleware.
 */
export const auditTrail = (options: AuditTrailOptions) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    if ((req.userRole !== "admin" && req.userRole !== "coadmin") || !req.userId) return next();

    const actorId = req.userId;
    const ids = targetIds(options.target, req);
    const before = new Map<string, AuditSnapshot | null>();
    if (options.action !== "created") {
      try {
        const snapshots = await Promise.all(ids.map((id) => loadAuditSnapshot(options.entityType, id)));
        ids.forEach((id, index) => before.set(id, snapshots[index]));
      } catch (err) {
        reportError(err, { context: "audit snapshot", entityType: options.entityType });
      }
    }

    let responseBody: unknown;
    const sendJson = res.json.bind(res);
    res.json = (body: unknown) => {
      responseBody = body;
      return sendJson(body);
    };

    res.once("finish", () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      void record(options, req, actorId, ids, before, responseBody).catch((err) =>
        reportError(err, { context: "audit record", entityType: options.entityType, action: options.action })
      );
    });

    next();
  };

async function record(
  options: AuditTrailOptions,
  req: AuthRequest,
  actorId: string,
  ids: string[],
  before: Map<string, AuditSnapshot | null>,
  responseBody: unknown
) {
  const { entityType, action, target } = options;
  if (target.from === "created") {
    const id = createdId(responseBody);
    if (id) ids = [id];
  }

  const explicit = options.changes?.(req, responseBody);
  for (const id of ids) {
    const previous = before.get(id) ?? null;
    const current = action === "deleted" || target.from === "none" ? null : await loadAuditSnapshot(entityType, id);
    const name = target.from === "none" ? target.name : previous?.name ?? current?.name;
    if (!name) continue; // Unknown target: nothing meaningful to show.

    await recordAuditEvent({
      actorId,
      action,
      entityType,
      entityId: id,
      entityName: name,
      ...(explicit
        ? { changes: explicit }
        : { changes: buildAuditChanges(entityType, action, previous?.data, current?.data) }),
    });
  }
}
