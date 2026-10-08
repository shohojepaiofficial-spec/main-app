import { Schema, model } from "mongoose";

const authSessionSchema = new Schema({
  _id: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  version: { type: Number, required: true },
  authenticatedAt: Number,
  refreshTokenHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
}, { timestamps: true });

// Cleanup only: every authentication query also checks expiresAt explicitly.
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const AuthSession = model("AuthSession", authSessionSchema);
