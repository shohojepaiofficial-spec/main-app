import { Request, Response } from "express";
import { isValidObjectId, Types } from "mongoose";
import { AuditLog, AuditAction, AuditEntityType, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../models/AuditLog";
import { validateControllerInput } from "../middleware/controllerInput";

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDay(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const getAuditLogs = async (req: Request, res: Response) => {
  validateControllerInput("getAuditLogs", req);

  const page = Math.max(1, Math.min(100000, Number.parseInt(String(req.query.page ?? "1"), 10) || 1));
  const limit = Math.max(1, Math.min(100, Number.parseInt(String(req.query.limit ?? "25"), 10) || 25));
  const filter: Record<string, unknown> = {};

  if (req.query.entityType !== undefined) {
    if (!AUDIT_ENTITY_TYPES.includes(req.query.entityType as AuditEntityType)) {
      return res.status(400).json({ message: "Invalid audit entity type" });
    }
    filter.entityType = req.query.entityType;
  }
  if (req.query.action !== undefined) {
    if (!AUDIT_ACTIONS.includes(req.query.action as AuditAction)) {
      return res.status(400).json({ message: "Invalid audit action" });
    }
    filter.action = req.query.action;
  }
  if (req.query.actorId !== undefined) {
    if (typeof req.query.actorId !== "string" || !isValidObjectId(req.query.actorId)) {
      return res.status(400).json({ message: "Invalid staff member" });
    }
    filter.actorId = new Types.ObjectId(req.query.actorId);
  }

  // Dates are whole days (YYYY-MM-DD); "to" includes the whole of that day.
  const from = req.query.from === undefined ? undefined : parseDay(req.query.from);
  const to = req.query.to === undefined ? undefined : parseDay(req.query.to);
  if (from === null || to === null) return res.status(400).json({ message: "Invalid date" });
  if (from || to) {
    filter.createdAt = {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lt: new Date(to.getTime() + DAY_MS) } : {}),
    };
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ items, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) });
};

// Staff members who appear in the history, for the "Who" filter. Uses the
// name stored on their most recent entry, so removed accounts still show.
export const getAuditActors = async (req: Request, res: Response) => {
  validateControllerInput("getAuditActors", req);

  const actors = await AuditLog.aggregate<{ _id: Types.ObjectId; name: string; role: string }>([
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$actorId", name: { $first: "$actorName" }, role: { $first: "$actorRole" } } },
    { $sort: { name: 1 } },
    { $limit: 200 },
  ]);

  res.json(actors.map(({ _id, name, role }) => ({ id: _id.toString(), name, role })));
};
