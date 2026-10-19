import { Schema, model } from "mongoose";

const authSessionSchema = new Schema({
  _id: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  version: { type: Number, required: true },
  authenticatedAt: Number,
  refreshTokenHash: { type: String, required: true, select: false },
  // The pass replaced by the last renewal, accepted again for a short grace
  // period in case the browser never received the reply (see rotateSession).
  previousRefreshTokenHash: { type: String, select: false },
  rotatedAt: Date,
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
  // Shown on the "Active sessions" list; never used for authentication.
  userAgent: { type: String, maxlength: 300 },
  ip: { type: String, maxlength: 64 },
  lastUsedAt: Date,
}, { timestamps: true });

// Cleanup only: every authentication query also checks expiresAt explicitly.
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const AuthSession = model("AuthSession", authSessionSchema);
