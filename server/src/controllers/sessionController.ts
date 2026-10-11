import { Response } from "express";
import { validateControllerInput } from "../middleware/controllerInput";
import { AuthRequest } from "../middleware/auth";
import { AuthSession } from "../models/AuthSession";
import { User } from "../models/User";
import { describeDevice } from "../utils/deviceLabel";

const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Same conditions isSessionActive() checks, so the list never shows a
// session that couldn't actually be used (revoked, expired, or cut off by
// "sign out on all devices" / a password or 2FA change).
async function activeFilter(userId: string) {
  const user = await User.findById(userId).select("sessionVersion");
  return { user: userId, version: user?.sessionVersion ?? 0, revokedAt: null, expiresAt: { $gt: new Date() } };
}

export const listSessions = async (req: AuthRequest, res: Response) => {
  validateControllerInput("listSessions", req);
  const sessions = await AuthSession.find(await activeFilter(req.userId!))
    .select("userAgent ip createdAt lastUsedAt").sort({ lastUsedAt: -1, createdAt: -1 }).limit(50).lean();
  res.setHeader("Cache-Control", "no-store");
  res.json(sessions.map((session) => ({
    id: session._id,
    ...describeDevice(session.userAgent),
    ip: session.ip ?? null,
    signedInAt: session.createdAt,
    lastActiveAt: session.lastUsedAt ?? session.createdAt,
    current: session._id === req.sessionId,
  })));
};

export const revokeSessionById = async (req: AuthRequest, res: Response) => {
  validateControllerInput("revokeSessionById", req);
  const sid = String(req.params.sid);
  if (!SESSION_ID.test(sid)) return res.status(400).json({ message: "Invalid session" });
  if (sid === req.sessionId) return res.status(400).json({ message: "Use Sign out to end this session" });
  const result = await AuthSession.updateOne({ _id: sid, ...await activeFilter(req.userId!) }, { $set: { revokedAt: new Date() } });
  if (!result.matchedCount) return res.status(404).json({ message: "Session not found or already signed out" });
  res.json({ message: "Device signed out" });
};
